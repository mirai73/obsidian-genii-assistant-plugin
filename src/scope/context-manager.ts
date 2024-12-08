import { App, Notice, Component, TFile, HeadingCache } from "obsidian";
import { AsyncReturnType, Context } from "../types";
import GeniiAssistantPlugin from "../main";

import {
  escapeRegExp,
  getContextAsString,
  getFilePathByName,
  removeYAML,
} from "../utils";
import debug from "debug";
import HelpersFn, { Handlebars } from "../helpers/handlebars-helpers";
import {
  ContentExtractor,
  UnExtractorSlug,
  getExtractorMethods,
} from "../extractors/content-extractor";
import { getAPI as getDataviewApi } from "obsidian-dataview";

import merge from "lodash.merge";
import * as fspath from "path";
import type { ContentManager } from "./content-manager/types";
import { convertArrayBufferToBase64Link } from "#/LLMProviders/utils";

import mime from "mime-types";
import { ContentOptions } from "#/LLMProviders/models";
import {
  MessageContent,
  MessageContentComplex,
} from "@langchain/core/messages";
import {
  clearFrontMatterFromIgnored,
  getFrontmatter,
  getHBVariablesObjectOfTemplate,
  getHighlights,
  getMetaDataAsStr,
  getOptionsUnder,
  processCodeBlocks,
} from "./context-manager-helpers";

const logger = debug("genii:ContextManager");

export interface ContextTemplate {
  inputTemplate: HandlebarsTemplateDelegate<any>;
  outputTemplate?: HandlebarsTemplateDelegate<any>;
}

export interface InputContext {
  template?: ContextTemplate;
  templatePath?: string;
  options?: AvailableContext;
  context?: string;
}

export interface AvailableContext {
  title?: string;
  starredBlocks?: any;
  tg_selection?: string;
  selections?: string[];
  selection?: string;
  previousWord?: string;
  nextWord?: string;
  afterCursor?: string;
  beforeCursor?: string;
  inverseSelection?: string;
  cursorParagraph?: string;
  cursorSentence?: string;
  frontmatter?: Record<string, any>;
  yaml?: Record<string, any>;
  metadata?: string;
  content?: string;
  headings?: AsyncReturnType<
    InstanceType<typeof ContextManager>["getHeadingContent"]
  >;
  children?: AsyncReturnType<
    InstanceType<typeof ContextManager>["getChildrenContent"]
  >;
  highlights?: string[];
  mentions?: AsyncReturnType<
    InstanceType<typeof ContextManager>["getMentions"]
  >;
  extractions?: AsyncReturnType<
    InstanceType<typeof ContextManager>["getExtractions"]
  >;

  keys: ReturnType<InstanceType<typeof GeniiAssistantPlugin>["getApiKeys"]>;
  _variables: Record<string, true>;

  noteFile?: TFile;
  templatePath?: string;
}

export default class ContextManager {
  plugin: GeniiAssistantPlugin;
  app: App;

  constructor(app: App, plugin: GeniiAssistantPlugin) {
    logger("ContextManager constructor");
    this.app = app;
    this.plugin = plugin;

    const Helpers = HelpersFn(this);

    Object.keys(Helpers).forEach((key) => {
      Handlebars.registerHelper(key, Helpers[key as keyof typeof Helpers]);
    });
  }

  async getContext({
    editor,
    insertMetadata,
    templateContent,
    templatePath,
    additionalOpts,
  }: {
    editor?: ContentManager;
    insertMetadata?: boolean;
    templatePath?: string;
    templateContent?: string;
    additionalOpts?: any;
  }): Promise<InputContext> {
    logger("getContext", {
      insertMetadata,
      templatePath,
      additionalOpts,
    });

    /* Template */
    if (templatePath?.length || templateContent?.length) {
      const options = merge(
        {},
        await this.getTemplateContext({
          editor: editor,
          templatePath,
          templateContent,
        }),
        additionalOpts
      );

      if (!templatePath)
        return {
          options,
        };

      const { context, template } = await this.templateFromPath(
        templatePath,
        options,
        templateContent
      );

      logger("Context Template", { context, options });

      return {
        context,
        options,
        template,
        templatePath: templatePath,
      };
    } else {
      /* Without template */

      const contextTemplate = this.plugin.settings.context.customInstructEnabled
        ? this.plugin.settings.context.customInstruct ||
          this.plugin.defaultSettings.context.customInstruct
        : "{{tg_selection}}";

      const options = await this.getDefaultContext(
        editor,
        undefined,
        contextTemplate
      );

      // take context
      let context = await getContextAsString(options as any, contextTemplate);

      if (insertMetadata) {
        const frontmatter = this.getMetaData()?.frontmatter; // frontmatter of the active document

        if (
          typeof frontmatter !== "undefined" &&
          Object.keys(frontmatter).length !== 0
        ) {
          /* Text Generate with metadata */
          options.frontmatter = frontmatter;
          context = getMetaDataAsStr(frontmatter) + context;
        } else {
          new Notice("No valid Metadata (YAML front matter) found!");
        }
      }

      logger("Context without template", { context, options });
      return { context, options };
    }
  }

  async getContextFromFiles(
    files: TFile[],
    templatePath = "",
    additionalOptions: any = {}
  ) {
    const contexts: (InputContext | undefined)[] = [];

    for (const file of files) {
      const fileMeta = this.getMetaData(file.path); // active document

      const options = merge(
        {},
        getFrontmatter(this.getMetaData(templatePath)),
        getFrontmatter(fileMeta),
        additionalOptions,
        {
          tg_selection: removeYAML(
            await this.plugin.app.vault.cachedRead(file)
          ),
        }
      );

      const { context, template } = await this.templateFromPath(
        templatePath,
        options
      );

      logger("Context Template", {
        context,
        options,
      });

      contexts.push({
        context,
        options,
        template,
        templatePath,
      } as InputContext);
    }

    return contexts;
  }

  async getTemplateContext({
    editor,
    templateContent,
    templatePath,
  }: {
    editor?: ContentManager;
    templatePath?: string;
    templateContent?: string;
  }) {
    logger("getTemplateContext", { editor, templatePath });

    const contextOptions: Context = this.plugin.settings.context;

    if (templatePath) {
      const templateFile =
        await this.app.vault.getAbstractFileByPath(templatePath);
      if (templateFile) {
        templateContent = await this.app.vault.read(templateFile as TFile);
      }
    }

    const contextTemplate =
      this.plugin.settings.context.contextTemplate ||
      this.plugin.defaultSettings.context.contextTemplate;

    const contextObj = await this.getDefaultContext(
      editor,
      undefined,
      templateContent
    );

    const context = contextObj._variables.context
      ? await getContextAsString(contextObj as any, contextTemplate)
      : "";

    const selection = contextObj.selection;
    const selections = contextObj.selections;
    const ctnt = contextObj?.content;

    const blocks: any = contextObj;

    blocks.frontmatter = {};
    blocks.headings = contextObj.headings;

    blocks.frontmatter = merge(
      {},
      getFrontmatter(this.getMetaData(templatePath)),
      contextObj.frontmatter
    );

    if (contextOptions.includeClipboard)
      try {
        blocks.clipboard = await this.getClipboard();
      } catch {
        // empty
      }

    const options = {
      selection,
      selections,
      ...blocks.frontmatter,
      ...blocks.headings,
      content: ctnt,
      context,
      ...blocks,
    };

    logger("getTemplateContext Context Variables ", options);
    return options;
  }

  async getDefaultContext(
    editor?: ContentManager,
    filePath?: string,
    contextTemplate?: string
  ) {
    logger("getDefaultContext", { contextTemplate });

    const context: AvailableContext = {
      keys: {},
      _variables: {},
    };

    const vars = getHBVariablesObjectOfTemplate(contextTemplate || "") || {};
    context._variables = vars;

    const activeFile = this.getActiveFile();
    context.noteFile = activeFile || undefined;

    const title =
      vars.title || vars.mentions
        ? (filePath
            ? this.app.vault.getAbstractFileByPath(filePath)?.name ||
              activeFile?.basename
            : activeFile?.basename) || ""
        : "";

    const activeDocCache = this.getMetaData(filePath || "");

    if (editor) {
      //   context["line"] = this.getConsideredContext(editor);
      context.tg_selection = await this.getTGSelection(editor);

      const selections = await this.getSelections(editor);
      const selection = await this.getSelection(editor);

      context.selections =
        selection && selections.length === 0 ? [selection] : selections || [];

      context.selection = selection || "";

      context.title = title;

      context.frontmatter = getFrontmatter(activeDocCache) || "";

      if (vars.previousWord)
        context.previousWord = await editor.getPreviousWord();

      if (vars.nextWord) context.nextWord = await editor.getNextWord();

      if (vars.beforeCursor)
        context.beforeCursor = await editor.getBeforeCursor();

      if (vars.afterCursor) context.afterCursor = await editor.getAfterCursor();

      if (vars.inverseSelection)
        context.inverseSelection = await editor.getInverseSelection();

      if (vars.cursorParagraph)
        context.cursorParagraph = await editor.getCursorParagraph();

      if (vars.cursorSentence)
        context.cursorSentence = await editor.getCursorSentence();

      if (vars.content) context.content = await editor.getValue();

      if (vars.highlights)
        context.highlights = await getHighlights(await editor.getValue());
    }

    if (vars.starredBlocks)
      context.starredBlocks =
        (await this.getStarredBlocks(this.getMetaData(filePath))) ?? "";

    if (vars.yaml)
      context.yaml = clearFrontMatterFromIgnored(
        getFrontmatter(activeDocCache) ?? ""
      );

    if (vars.metadata)
      context.metadata = getMetaDataAsStr(context.frontmatter || {}) ?? "";

    if (activeDocCache)
      context.headings = await this.getHeadingContent(activeDocCache);

    if (vars.children && activeDocCache)
      context.children = await this.getChildrenContent(activeDocCache);

    if (vars.mentions && title)
      context.mentions = await this.getMentions(title);

    if (vars.extractions)
      context.extractions = await this.getExtractions(filePath, editor);

    // // execute dataview
    const _dVCache: any = {};
    for (const key in context)
      if (!["frontmatter", "title", "yaml"].includes(key))
        context[key as keyof typeof context] = await this.execDataview(
          context[key as keyof typeof context],
          _dVCache
        );

    logger("getDefaultContext_end", { context });
    return context;
  }

  /**
   * Add the embedded content from the current context
   * Embedded content in Obsidian is added via `![[]]` in the note
   */
  async getEmbeddedContent(
    markdownText: string,
    source?: TFile,
    options?: ContentOptions
  ): Promise<MessageContent> {
    logger("getEmbeddedContent", { markdownText, source, options });
    if (!source) return markdownText;
    const metadata = this.app.metadataCache.getFileCache(source);

    if (!metadata?.embeds) return markdownText;

    const elements: MessageContentComplex[] = [];

    // splitting
    let lastIndex = 0;
    logger("getEmbeddedContent", metadata.embeds);

    // Replace each embed in the markdown text
    metadata.embeds
      .sort((a, b) => a.link.length - b.link.length)
      .forEach((embed) => {
        markdownText.replace(embed.original, (match, index) => {
          // Add text segment before the embed if there is any
          const content = markdownText.substring(lastIndex, index);
          logger("getEmbeddedContent", { content, match, index, lastIndex });
          if (index > lastIndex) {
            elements.push({
              type: "text",
              text: content.trim() ? content : "_",
            });
          }

          // Add embed segment
          elements.push({
            type: "image_url",
            image_url: {
              url: embed.link,
            },
          });

          lastIndex = index + match.length;

          return match;
        });
      });

    // Add remaining text after the last embed
    if (lastIndex < markdownText.length) {
      elements.push({ type: "text", text: markdownText.substring(lastIndex) });
    }
    logger("getEmbeddedContent", { elements });
    const processedElements: MessageContent = [];
    // making base64 for
    for (const element of elements) {
      if (element.type === "text" && element.text !== "_") {
        processedElements.push(element);
        continue;
      }
      if (element.type === "image_url") {
        if (!element.image_url?.url?.startsWith("http")) {
          const path = element.image_url?.url;
          // https://forum.obsidian.md/t/getresourcepath-does-not-return-the-correct-path-for-user-defined-attachment-folder/13012
          // @ts-ignore
          const attachmentFolderPath: string = this.app.vault.getConfig?.(
            "attachmentFolderPath"
          );
          const filePath = this.app.metadataCache.getFirstLinkpathDest(
            path,
            path
          );
          if (!filePath?.path) {
            // We do not add the title of the embedding link to the messages
            continue;
          } else {
            let file = await this.app.vault.getFileByPath(filePath?.path);
            if (!file) {
              // try to find in attachment folder, base user's preferences
              file = await this.app.vault.getFileByPath(
                fspath.join(attachmentFolderPath, path)
              );
              if (!file) continue;
            }

            const mimeType = mime.lookup(file.extension) || "";

            const buff = convertArrayBufferToBase64Link(
              await this.app.vault.readBinary(file),
              mimeType
            );
            if (
              options?.images &&
              mimeType.startsWith("image/")
              // Support for audio and video depends on the model
              // audio might need transcription
              // || (options?.audio && mimeType.startsWith("audio/"))
              // || (options?.videos && mimeType.startsWith("video/"))
            ) {
              element.image_url.url = buff;
              processedElements.push(element);
            }
            if (options?.text && mimeType.startsWith("text/")) {
              processedElements.push({
                type: "text",
                text: Buffer.from(
                  await this.app.vault.readBinary(file)
                ).toString("utf-8"),
              });
            } else {
              // TODO: add support for additional content, like PDF, audio transcription, etc,
              logger("getEmbeddedContent", `${mimeType} not supported`);
            }
          }
        } else {
          // TODO: add an option to read external embedded content
          processedElements.push({
            type: "text",
            text: element.image_url.url,
          });
        }
      }
    }
    return processedElements;
  }

  splitTemplate(templateContent: string) {
    const hbMiddleware = this.handlebarsMiddleware;
    logger("splitTemplate", templateContent);
    templateContent = removeYAML(templateContent);

    let outputContent;

    const inputTemplate = hbMiddleware(
      Handlebars.compile(templateContent, {
        noEscape: true,
      })
    );

    const outputTemplate = outputContent
      ? hbMiddleware(
          Handlebars.compile(outputContent, {
            noEscape: true,
          })
        )
      : undefined;

    return {
      inputContent: templateContent,
      outputContent,
      inputTemplate,
      outputTemplate,
    };
  }

  async templateFromPath(
    templatePath: string,
    options: any,
    _templateContent?: string
  ): Promise<{ context: string; template: ContextTemplate }> {
    logger("templateFromPath", { templatePath, options });
    const templateFile =
      await this.app.vault.getAbstractFileByPath(templatePath);

    if (!templateFile)
      throw new Error(`Template ${templatePath} couldn't be found`);

    const templateContent =
      _templateContent || (await this.app.vault.read(templateFile as TFile));

    if (!this.plugin.contextManager)
      throw new Error("Context manager not found");
    const templates = this.plugin.contextManager.splitTemplate(templateContent);

    // Apply the Mustache template
    const input = await templates.inputTemplate(options);

    logger("templateFromPath_end", input);
    return { context: input, template: templates };
  }

  async getSelections(editor: ContentManager) {
    logger("getSelections", editor);
    const selections = await editor.getSelections();
    logger("getSelections", selections);
    return selections;
  }

  getTGSelection(editor: ContentManager) {
    logger("getTGSelection", editor);
    return editor.getTgSelection(this.plugin.settings.tgSelectionLimiter);
  }

  async getSelection(editor: ContentManager) {
    logger("getSelection", editor);
    let selectedText = await editor.getSelection();

    const frontmatter = this.getMetaData()?.frontmatter; // frontmatter of the active document
    if (
      typeof frontmatter !== "undefined" &&
      Object.keys(frontmatter).length !== 0
    ) {
      /* Text Generate with metadata */
      selectedText = removeYAML(selectedText).trim();
    }
    logger("getSelection", { selectedText });
    return selectedText;
  }

  async getHeadingContent(fileCache: ReturnType<typeof this.getMetaData>) {
    const headings = fileCache?.headings;
    const headingsContent: Record<string, string | undefined> = {};
    if (headings) {
      for (const heading of headings) {
        let textBlock = await this.getTextBloc(fileCache, heading.heading);
        textBlock = textBlock?.substring(
          textBlock.indexOf(heading.heading),
          textBlock.length
        );
        const reSafeHeading = escapeRegExp(heading.heading);
        const headingRegex = new RegExp(`${reSafeHeading}\\s*?\n`, "ig");
        textBlock = textBlock?.replace(headingRegex, "");
        headingsContent[heading.heading] = textBlock;
      }
    }
    return headingsContent;
  }

  async getChildrenContent(fileCache: {
    links?: {
      original: string;
      link: string;
    }[];
  }) {
    const children: (TFile & {
      content: string;
      frontmatter: any;
      headings: HeadingCache[] | undefined;
    })[] = [];

    const links = fileCache?.links?.filter(
      (e) => e.original.substring(0, 2) === "[["
    );

    // remove duplicate links
    const uniqueLinks =
      links?.filter(
        (v, i, a) => a.findIndex((t) => t.original === v.original) === i
      ) || [];

    if (!uniqueLinks) return children;

    for (const link of uniqueLinks) {
      if (!link.link) continue;

      const path = getFilePathByName(link.link, this.app);

      if (!path) continue;

      const file = this.app.vault.getAbstractFileByPath(path);

      if (!file) continue;

      // load the file
      const content = await this.app.vault.read(file as any);

      const metadata = this.getMetaData(file.path);

      // TODO: only include frontmatter and headings if the option is set
      const blocks: any = {};

      blocks.frontmatter = metadata?.frontmatter;

      blocks.headings = metadata?.headings;

      const childInfo: any = {
        ...file,
        content,
        title: file.name.substring(0, file.name.length - 2),
        ...blocks,
      };

      children.push(childInfo);
    }
    return children;
  }

  async getClipboard() {
    return await navigator.clipboard.readText();
  }

  async getMentions(title: string) {
    const linked: any = [];
    const unlinked: any = [];
    const files = this.app.vault.getMarkdownFiles();

    await Promise.all(
      files.map(async (file) => {
        const content = await this.app.vault.cachedRead(file);

        const regLinked = new RegExp(`.*\\[\\[${title}\\]\\].*`, "ig");
        const resultsLinked = content.match(regLinked);
        if (resultsLinked) {
          linked.push({
            ...file,
            title: file.basename,
            results: resultsLinked,
          });
        }

        const regUnlinked = new RegExp(`.*${title}.*`, "ig");
        const resultsUnlinked = content.match(regUnlinked);
        if (resultsUnlinked) {
          unlinked.push({
            ...file,
            title: file.basename,
            results: resultsUnlinked,
          });
        }
      })
    );

    console.log({ linked, unlinked });

    return { linked, unlinked };
  }

  async getStarredBlocks(fileCache: ReturnType<typeof this.getMetaData>) {
    let content = "";
    const staredHeadings = fileCache?.headings?.filter(
      (e: { heading: string }) =>
        e.heading.substring(e.heading.length - 1) === "*"
    );
    if (staredHeadings) {
      for (const heading of staredHeadings) {
        content += await this.getTextBloc(fileCache, heading.heading);
      }
    }
    return content;
  }

  async getTextBloc(
    fileCache: ReturnType<typeof this.getMetaData>,
    heading: string
  ) {
    let level = -1;
    let start = -1;
    let end = -1;
    if (!fileCache?.headings?.length) {
      console.error("Headings not found");
      return;
    }

    for (let i = 0; i < (fileCache?.headings?.length || 0); i++) {
      const ele = fileCache.headings[i];
      if (start === -1 && ele?.heading === heading) {
        level = ele.level;
        start = ele.position.start.offset;
      } else if (start >= 0 && ele.level <= level && end === -1) {
        end = ele.position.start.offset;
        break;
      }
    }

    if (start >= 0 && fileCache.path) {
      const doc = await this.app.vault.getAbstractFileByPath(fileCache.path);
      const docContent = await this.app.vault.read(doc as TFile);
      if (end === -1) end = docContent.length;
      return docContent.substring(start, end);
    } else {
      console.error("Heading not found ");
    }
  }

  async getExtractions(filePath?: string, editor?: ContentManager) {
    const extractedContent: Record<string, string[]> = {};

    const contentExtractor = new ContentExtractor(this.app, this.plugin);
    const extractorMethods = getExtractorMethods().filter(
      (e) =>
        this.plugin.settings.extractorsOptions[
          e as keyof typeof this.plugin.settings.extractorsOptions
        ]
    );

    const targetFile = filePath
      ? this.app.vault.getAbstractFileByPath(filePath)
      : this.app.workspace.getActiveFile();

    const targetFileContent = editor
      ? await editor.getValue()
      : await this.app.vault.cachedRead(targetFile as any);

    if (!targetFile) throw new Error("ActiveFile was undefined");

    for (const key of extractorMethods) {
      contentExtractor.setExtractor(key);

      const links =
        (await contentExtractor.extract(targetFile.path, targetFileContent)) ??
        [];

      if (links?.length > 0) {
        const parts = await Promise.all(
          links.map((link) => contentExtractor.convert(link))
        );
        extractedContent[UnExtractorSlug[key]] = parts.filter(
          (p) => p !== undefined
        );
      }
    }

    return extractedContent;
  }

  getActiveFile() {
    return this.app.workspace.getActiveFile();
  }

  getMetaData(path?: string, withoutCompatibility?: boolean) {
    const activeFile = path
      ? this.plugin.geniiAssistant?.embeddingsScope.getActiveNote()
      : { path };

    if (!activeFile?.path || !activeFile.path.endsWith(".md")) return null;

    const cache = this.plugin.app.metadataCache.getCache(activeFile.path);

    return {
      ...cache,

      frontmatter: {
        ...cache?.frontmatter,
        outputToBlockQuote: cache?.frontmatter?.outputToBlockQuote,

        ...(!withoutCompatibility && {
          PromptInfo: {
            ...cache?.frontmatter,
            ...cache?.frontmatter?.PromptInfo,
          },

          config: {
            ...cache?.frontmatter,
            ...cache?.frontmatter?.config,
            path_to_choices:
              cache?.frontmatter?.choices ||
              cache?.frontmatter?.path_to_choices,
            path_to_message_content:
              cache?.frontmatter?.pathToContent ||
              cache?.frontmatter?.path_to_message_content,
          },

          custom_body:
            cache?.frontmatter?.body || cache?.frontmatter?.custom_body,
          custom_header:
            cache?.frontmatter?.headers || cache?.frontmatter?.custom_header,

          bodyParams: {
            ...cache?.frontmatter?.bodyParams,
            ...(cache?.frontmatter?.max_tokens
              ? { max_tokens: cache?.frontmatter?.max_tokens }
              : {}),
            ...getOptionsUnder("body.", cache?.frontmatter),
          },

          reqParams: {
            ...cache?.frontmatter?.reqParams,
            ...getOptionsUnder("reqParams.", cache?.frontmatter),
            ...(cache?.frontmatter?.body
              ? { body: cache?.frontmatter?.body }
              : {}),
          },

          splitter: {
            ...cache?.frontmatter?.chain,
            ...getOptionsUnder("splitter.", cache?.frontmatter),
          },
          chain: {
            ...cache?.frontmatter?.chain,
            ...getOptionsUnder("chain.", cache?.frontmatter),
          },
        }),
        ...(path ? { templatePath: path } : {}),
      },

      path: activeFile.path,
    };
  }

  private _dataviewApi: any;
  async execDataview(
    md: string,
    _cache: Record<string, string | undefined> = {}
  ): Promise<string> {
    if (!md || typeof md !== "string") return md;

    const parsedTemplateMD: string = await processCodeBlocks(
      md,
      async ({ type, content, full }) => {
        try {
          switch (type.trim()) {
            case "dataview": {
              const api = (this._dataviewApi =
                this._dataviewApi || (await getDataviewApi(this.app)));
              const res = await api?.queryMarkdown(content);

              if (!res) throw new Error("Couldn't find DataViewApi");

              if (res?.successful) {
                return (_cache[content] = _cache[content] || res.value);
              }

              throw new Error(((res || []) as unknown as string[])?.join(", "));
            }
            case "dataviewjs": {
              const api = (this._dataviewApi =
                this._dataviewApi || (await getDataviewApi(this.app)));
              const container = document.createElement("div");
              const component = new Component();

              api?.executeJs(content, container, component, "");

              return (_cache[content] = _cache[content] || container.innerHTML);
            }
            default:
              return full;
          }
        } catch (err: any) {
          this.plugin.handelError(err);
          return "";
        }
      }
    );
    return parsedTemplateMD;
  }

  handlebarsMiddleware(
    hb: HandlebarsTemplateDelegate<any>
  ): HandlebarsTemplateDelegate<any> {
    return (async (
      context: any,
      options?: Handlebars.RuntimeOptions | undefined
    ) => {
      let hbd = await hb(context, options);
      hbd = await this.execDataview(hbd);
      return hbd;
    }) as any;
  }
}
