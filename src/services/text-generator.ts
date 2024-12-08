import TemplateInputModalUI from "../ui/template-input-modal";
import { App, Notice, TFile, Vault, stringifyYaml } from "obsidian";
import { GeniiAssistantSettings } from "../types";
import GeniiAssistantPlugin from "../main";
import ReqFormatter from "../utils/api-request-formatter";
import { SetPath } from "../ui/settings/components/set-path";
import ContextManager, {
  ContextVariables,
  type InputContext,
} from "../scope/context-manager";
import {
  makeId,
  createFileWithInput,
  openFile,
  removeYAML,
  removeExtensionFromName,
} from "../utils";
import safeAwait from "safe-await";
import debug from "debug";
import RequestHandler from "./api-service";
import EmbeddingScope from "../scope/embeddings";
import { IGNORE_IN_YAML } from "../constants";
import merge from "lodash.merge";
import {
  ContentManager,
  Template,
  TemplateMetadata,
} from "../scope/content-manager/types";

const logger = debug("genii:GeniiAssistant");

export default class GeniiAssistant extends RequestHandler {
  plugin: GeniiAssistantPlugin;
  reqFormatter: ReqFormatter;
  signal?: AbortSignal;
  contextManager: ContextManager;
  embeddingsScope: EmbeddingScope;

  constructor(app: App, plugin: GeniiAssistantPlugin) {
    super(plugin);
    if (!plugin.contextManager) {
      throw new Error("Genii: ContextManager was not initialized");
    }
    this.plugin = plugin;
    this.contextManager = plugin.contextManager;
    this.embeddingsScope = new EmbeddingScope(this.plugin.app);
    this.reqFormatter = new ReqFormatter(app, plugin, this.contextManager);
  }

  async getCursor(
    editor: ContentManager,
    mode: "insert" | "replace" | string = "insert"
  ) {
    logger("getCursor");
    const cursor = await editor.getCursor(mode === "replace" ? "from" : "to");
    logger("getCursor end");
    return cursor;
  }

  async generateFromTemplate(props: {
    params: Partial<GeniiAssistantSettings>;
    templatePath: string;
    /** defaults to true */
    insertMetadata?: boolean;
    editor?: ContentManager;
    filePath?: string;
    /** defaults to true */
    activeFile?: boolean;
    additionalProps?: any;
    insertMode?: any;
  }) {
    const insertMetadata = props.insertMetadata ?? true;
    const activeFile = props.activeFile ?? true;
    try {
      const context = await this.contextManager.getContext({
        filePath: props.filePath,
        editor: props.editor,
        insertMetadata,
        templatePath: props.templatePath,
        additionalOpts: props.additionalProps,
      });

      switch (true) {
        case activeFile === false:
          await this.createToFile(
            props.params,
            props.templatePath,
            context,
            props.insertMode
          );
          break;

        default:
          if (!props.editor) throw new Error("TG: Editor was not selected");
          await this.generateInEditor({}, false, props.editor, context, {
            showSpinner: true,
            insertMode: props.insertMode,
          });
          break;
      }

      logger("generateFromTemplate end");
    } catch (error) {
      logger("generateFromTemplate error", error);
      throw error;
    }
  }

  async generateBatchFromTemplate(
    files: TFile[],
    params: Partial<GeniiAssistantSettings>,
    templatePath: string,
    additionalProps: any = {},
    insertMode = false
  ) {
    // get files context
    const contexts = (await this.contextManager.getContextFromFiles(
      files,
      templatePath,
      additionalProps
    )) as InputContext[];

    // make sure that failed context extractions are not included
    contexts.forEach((c, i) => {
      if (!c) {
        files.splice(i, 1);
        contexts.splice(i, 1);
      }
    });

    if (!files.length) throw new Error("You need to select files");

    // start generation
    await this.createToFiles(
      {
        ...params,
        ...contexts[0]?.options,
      },
      contexts,
      files,
      templatePath,
      insertMode
    );

    logger("generateFromTemplate end");
  }

  getMode(context: any) {
    return (
      context?.options?.frontmatter?.mode ||
      context?.options?.frontmatter?.config?.mode ||
      context?.options?.config?.mode ||
      "insert"
    );
  }

  async generateStreamInEditor(
    params: Partial<GeniiAssistantSettings>,
    insertMetadata = false,
    editor: ContentManager,
    customContext?: InputContext
  ) {
    logger("generateStreamInEditor");

    const context =
      customContext ||
      (await this.contextManager.getContext({
        editor,
        insertMetadata,
      }));

    if (!context) return;
    console.log({
      customContext,
      context,
    });

    // if its a template don't bother with adding prefix
    const prefix = context.template?.outputTemplate
      ? ""
      : this.plugin.settings.prefix;
    const mode = this.getMode(context);

    const startingCursor = await this.getCursor(editor, mode);

    try {
      const streamHandler = await editor.insertStream(startingCursor, mode);
      const stream = await this.streamGenerate(
        context,
        insertMetadata,
        params,
        context.templatePath
      );

      // last letter before starting, (used to determine if we should add space at the beginning)
      const txt = editor.getLastLetterBeforeCursor();

      let addedPrefix = false;

      const allText =
        (await stream?.(
          async (contentChunk, first) => {
            if (mode !== "insert") return;

            let content = contentChunk;

            if (first) {
              const alreadyDidNewLine = prefix?.contains(`
			`);

              // here you can do some additional magic
              // check if its starting by space, and space doesn't exist in note (used to determine if we should add space at the begining).
              if (txt.length && txt !== " " && content !== " ") {
                content = " " + content;
              }

              if (!alreadyDidNewLine && txt === ":" && contentChunk !== "\n") {
                content = "\n" + content;
              }

              // adding prefix here
              if (prefix?.length) {
                addedPrefix = true;
                content = prefix + content;
              }
            }
            streamHandler.insert(content);
            return content;
          },
          (err) => {
            this.endLoading(false);
            throw err;
          }
        )) || "";

      this.endLoading(true);

      streamHandler.end();

      await streamHandler.replaceAllWith(
        !addedPrefix && prefix.length ? prefix + allText : allText
      );
    } catch (err: any) {
      this.plugin.handelError(err);
      // if catched error during or before streaming, it should return to its previews location
      editor.setCursor(startingCursor);
      this.endLoading(true);
      throw err;
    }
  }

  async generateInEditor(
    params: Partial<GeniiAssistantSettings>,
    insertMetadata = false,
    editor: ContentManager,
    customContext?: InputContext,
    additionalParams = {
      showSpinner: true,
      insertMode: false,
    }
  ) {
    const frontmatter = this.reqFormatter.getFrontmatter("", insertMetadata);
    if (
      this.plugin.settings.stream &&
      this.plugin.geniiAssistant?.LLMProvider?.canStream &&
      frontmatter.stream !== false
    ) {
      return this.generateStreamInEditor(
        params,
        insertMetadata,
        editor,
        customContext
      );
    }

    logger("generateInEditor");
    const cursor = await this.getCursor(editor);

    const context =
      customContext ||
      (await this.contextManager.getContext({
        editor,
        insertMetadata,
      }));

    if (!context) return;
    const [errorGeneration, text] = await safeAwait(
      this.generate(
        context,
        insertMetadata,
        params,
        context.templatePath,
        additionalParams
      )
    );

    if (errorGeneration) {
      throw errorGeneration;
    }

    const mode = this.getMode(context);

    // if its a template don't bother with adding prefix
    const prefix = context.template?.outputTemplate
      ? ""
      : this.plugin.settings.prefix;

    await editor.insertText(prefix.length ? prefix + text : text, cursor, mode);

    logger("generateInEditor end");
  }

  async generateToClipboard(
    params: Partial<GeniiAssistantSettings>,
    templatePath: string,
    insertMetadata = false,
    editor: ContentManager
  ) {
    logger("generateToClipboard");
    if (!this.contextManager) {
      return;
    }
    const [errorContext, context] = await safeAwait(
      this.contextManager.getContext({
        editor,
        insertMetadata,
        templatePath,
      })
    );

    if (!context) {
      throw "context doesn't exist";
    }

    const [errorGeneration, text] = await safeAwait(
      this.generate(context, insertMetadata, params, templatePath)
    );

    if (errorContext) {
      throw errorContext;
    }

    if (errorGeneration) {
      throw errorGeneration;
    }

    const data = new ClipboardItem({
      "text/plain": new Blob([text], {
        type: "text/plain",
      }),
    });

    await navigator.clipboard.write([data]);
    new Notice("Generated Text copied to clipboard");
    editor.setCursor(editor.getCursor());
    logger("generateToClipboard end");
  }

  async generatePrompt(
    promptText: string,
    editor: ContentManager,
    outputTemplate: HandlebarsTemplateDelegate<any>
  ) {
    logger("generatePrompt");
    try {
      this.plugin.startProcessing(true);
      const cursor = this.getCursor(editor);

      let text = await this.LLMProvider?.generate(
        [
          {
            role: "user",
            content: promptText,
          },
        ],
        { ...this.LLMProvider.getSettings(), stream: false }
      );

      if (outputTemplate) {
        text = outputTemplate({ output: text });
      }

      // @TODO: hotfix, improve code later.
      // @ts-ignore
      if (text) editor?.editor?.insertText(text, cursor);

      logger("generatePrompt end");
    } finally {
      this.plugin.endProcessing(true);
    }
  }

  async createToFile(
    params: Partial<GeniiAssistantSettings>,
    templatePath: string,
    context: InputContext,
    insertMode = false
  ) {
    logger("createToFile");
    const [errortext, text] = await safeAwait(
      this.generate(context, true, params, templatePath, {
        showSpinner: false,
        insertMode,
      })
    );

    if (errortext) {
      logger("templateToModal error", errortext);
      throw errortext;
    }

    const title = this.plugin.app.workspace.activeLeaf?.getDisplayText();
    const suggestedPath = this.plugin.getTextGenPath(
      "/generations/" + title + "-" + makeId(3) + ".md"
    );
    new SetPath(
      this.plugin.app,
      suggestedPath,
      async (path: string) => {
        const [errorFile, file] = await safeAwait(
          createFileWithInput(path, context.context + text, this.plugin.app)
        );
        if (errorFile) {
          logger("templateToModal error", errorFile);
          throw errorFile;
        }

        openFile(this.plugin.app, file);
      },
      {
        content: context.context + text,
        title,
      }
    ).open();
    logger("createToFile end");
  }

  async createToFiles(
    params: Partial<GeniiAssistantSettings>,
    contexts: InputContext[],
    files: TFile[],
    templatePath: string,
    insertMode = false
  ) {
    logger("createToFile");
    const suggestedPath = this.plugin.getTextGenPath(
      `/generations/${makeId(4)}`
    );

    new SetPath(
      this.plugin.app,
      suggestedPath,
      async (path: string) => {
        const [error, results] = await safeAwait(
          this.batchGenerate(
            contexts,
            true,
            params,
            templatePath,
            {
              showSpinner: false,
              insertMode,
            },
            async (text, i) => {
              const msg = text?.startsWith("FAILED:")
                ? `FAILED with File ${files[i]?.path}: ${text}`
                : `Finished file ${files[i]?.path}`;

              this.plugin.updateStatusBar(msg, true);

              const context = contexts[i];

              if (!context)
                return console.error("generation failed on", { i, text });

              const [errorFile] = await safeAwait(
                createFileWithInput(
                  path +
                    `/${text?.startsWith("FAILED:") ? "FAILED-" : ""}` +
                    files[i].path,
                  text,
                  this.plugin.app
                )
              );

              if (errorFile) {
                logger("templateToModal error", errorFile);
                throw errorFile;
              }
            }
          )
        );

        const failed = results?.filter((r) => {
          if (typeof r === "string") return r?.startsWith("FAILED:");
          else return false;
        });

        if (failed?.length) {
          logger(`${failed.length} generations failed`, failed);
          console.warn(`${failed.length} generations failed`, failed);
          this.plugin.handelError(
            `${failed.length} generations failed, check console(CTRL+SHIFT+i) for more info`
          );
        }

        if (error || results === undefined) {
          throw error;
        }

        await new Promise((s) => setTimeout(s, 500));
        this.plugin.app.workspace.openLinkText(
          "",
          `${path}/${contexts[0].options?.templatePath}`,
          true
        );
      },
      {
        title: `${files.length} files`,
      }
    ).open();
    logger("createToFile end");
  }

  async createTemplateFromEditor(editor: ContentManager) {
    logger("createTemplateFromEditor");
    const title = this.plugin.app.workspace.activeLeaf?.getDisplayText();
    const content = await editor.getValue();
    await this.createTemplate(content, title);
    logger("createTemplateFromEditor end");
  }

  async createTemplate(
    content: string,
    title = "",
    options?: { disableProvider?: boolean }
  ) {
    logger("createTemplate");

    const suggestedPath = `${this.plugin.settings.promptsPath}/local/${title}.md`;
    new SetPath(this.plugin.app, suggestedPath, async (path: string) => {
      const newTitle = removeExtensionFromName(path.split("/").reverse()[0]);
      const defaultMatter = {
        promptId: `${newTitle}`,
        name: `🗞️${newTitle} `,
        description: `${newTitle}`,
        author: "",
        tags: "",
        version: "0.0.1",
        disableProvider: !!options?.disableProvider,
      };

      const metadata = this.contextManager.getMetaData(undefined, true);

      const matter: Record<string, any> = {};
      Object.entries(metadata?.frontmatter || {}).forEach(([key, _content]) => {
        if (IGNORE_IN_YAML[key]) {
          matter[key] = _content;
        }
      });

      const templateContent = options?.disableProvider
        ? `---
${stringifyYaml(merge({}, defaultMatter, matter))}
---
\`\`\`handlebars
You can structure your code here and then use the input or output template to retrieve("get" helper) the processed data, enhancing readability.
\`\`\`
***
This input template is currently disabled due to the 'disabledProvider' setting being set to true.

If you wish to utilize this template with a provider, such as Chatbot or another service, please follow these steps:
- Enable the provider by setting 'disabledProvider' to false.
- Cut and paste everything from the output template into this section.
- Replace the content in the output template with '{{output}}'.
- Remember to delete this instruction text.
***
${removeYAML(content)}
`
        : `---
${stringifyYaml(merge({}, defaultMatter, matter))}
---
\`\`\`handlebars

\`\`\`
***
${removeYAML(content)}
***
{{output}}`;

      const [errorFile, file] = await safeAwait(
        createFileWithInput(path, templateContent, this.plugin.app)
      );
      if (errorFile) {
        logger("createTemplate error", errorFile);
        throw errorFile;
      }
      openFile(this.plugin.app, file);
    }).open();

    await this.updateTemplatesCache();

    logger("createTemplate end");
  }

  outputToBlockQuote(text: string) {
    let lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && line !== ">");
    lines = lines
      .map((line) => {
        if (line.includes("[!ai]+ AI")) {
          return ">";
        }

        return line.startsWith(">") ? line : "> " + line;
      })
      .filter((line) => line !== "");

    return "\n> [!ai]+ AI\n>\n" + lines.join("\n").trim() + "\n\n";
  }

  async templateToModal(props: {
    params: Partial<GeniiAssistantSettings>;
    templatePath?: string;
    editor: ContentManager;
    filePath?: string;
    activeFile?: boolean;
  }) {
    logger("templateToModal");
    if (!this.contextManager) return;
    const templateFile = this.plugin.app.vault.getAbstractFileByPath(
      props.templatePath || ""
    );
    if (!templateFile) {
      logger("templateToModal", "templateFile not found");
      return;
    }
    const templateContent = await this.plugin.app.vault.adapter.read(
      templateFile?.path
    );

    if (!templateContent) {
      throw "templateContent is undefined";
    }

    const { inputContent, outputContent, preRunnerContent } =
      this.contextManager.splitTemplate(templateContent as any);

    const variables = this.contextManager.getHBVariablesOfTemplate(
      preRunnerContent,
      inputContent,
      outputContent
    );

    const metadata = this.getMetadata(props.templatePath || "");
    const templateContext = await this.contextManager.getTemplateContext(props);

    const onSubmit = async (results: any) => {
      try {
        await this.generateFromTemplate({
          params: props.params,
          templatePath: props.templatePath || "",
          insertMetadata: true,
          filePath: props.filePath,
          editor: props.editor,
          activeFile: props.activeFile,
          additionalProps: results,
        });
      } catch (err: any) {
        this.plugin.handelError(err);
        this.endLoading(true);
      }
    };
    logger("variables", variables);
    const filteredVariables = variables.filter(
      (v) => ContextVariables[v] === undefined
    );
    if (filteredVariables.length > 0)
      new TemplateInputModalUI(
        this.plugin.app,
        this.plugin,
        filteredVariables,
        metadata,
        templateContext,
        onSubmit
      ).open();
    else await onSubmit({});
    logger("templateToModal end");
  }

  getTemplates(promptsPath: string = this.plugin.settings.promptsPath) {
    const templateFolder = this.plugin.app.vault.getFolderByPath(promptsPath);

    const templates: Template[] = [];

    if (templateFolder) {
      Vault.recurseChildren(templateFolder, (file) => {
        if (file instanceof TFile && !file.path.includes("/trash/")) {
          templates.push({
            ...this.getMetadata(file.path),
            title: file.path.substring(promptsPath.length + 1),
            ctime: file.stat.ctime,
            path: file.path,
          });
        }
      });
    }
    return templates;
  }

  getMetadata(path: string) {
    logger("getMetadata");
    const metadata = this.getFrontmatter(path);

    const validatedMetadata: TemplateMetadata = {};

    if (metadata?.PromptInfo?.promptId) {
      validatedMetadata.id = metadata.PromptInfo.promptId;
    }

    if (metadata?.PromptInfo?.name) {
      validatedMetadata.name = metadata.PromptInfo.name;
    }

    if (metadata?.PromptInfo?.description) {
      validatedMetadata.description = metadata.PromptInfo.description;
    }

    if (metadata?.PromptInfo?.required_values) {
      validatedMetadata.required_values =
        typeof metadata.PromptInfo.required_values === "string"
          ? metadata.PromptInfo.required_values.split(",")
          : metadata.PromptInfo.required_values;
    }

    if (metadata?.PromptInfo?.author) {
      validatedMetadata.author = metadata.PromptInfo.author;
    }

    if (metadata?.PromptInfo?.tags) {
      validatedMetadata.tags =
        typeof metadata.PromptInfo.tags === "string"
          ? metadata.PromptInfo.tags.split(",")
          : metadata.PromptInfo.tags;
    }

    if (metadata?.PromptInfo?.version) {
      validatedMetadata.version = metadata.PromptInfo.version;
    }

    if (metadata?.PromptInfo?.commands) {
      validatedMetadata.commands =
        typeof metadata.PromptInfo.commands === "string"
          ? metadata.PromptInfo.commands.split(",")
          : metadata.PromptInfo.commands;
    }

    if (metadata?.PromptInfo?.viewTypes) {
      validatedMetadata.viewTypes =
        typeof metadata.PromptInfo.viewTypes === "string"
          ? metadata.PromptInfo.viewTypes.split(",")
          : metadata.PromptInfo.viewTypes;
    }

    logger("getMetadata end");
    return validatedMetadata;
  }

  getFrontmatter(path = "") {
    logger("getFrontmatter");

    const frontMatter =
      this.contextManager.getFrontmatter(
        this.contextManager.getMetaData(path)
      ) || null;

    logger("getFrontmatter end", frontMatter);
    return frontMatter;
  }

  async templateGen(
    id: string,
    options: {
      editor?: ContentManager;
      filePath?: string;
      insertMetadata?: boolean;
      additionalProps?: any;
    }
  ): Promise<string> {
    const templatePath = await this.getTemplatePath(id);
    // this.plugin.endProcessing(true);
    this.plugin.startProcessing();
    const [errorContext, context] = await safeAwait(
      this.contextManager.getContext({
        editor: options.editor,
        filePath: options.filePath,
        insertMetadata: options.insertMetadata,
        templatePath,
        additionalOpts: options.additionalProps,
      })
    );

    if (errorContext || !context) {
      throw errorContext;
    }

    const [errorGeneration, text] = await safeAwait(
      this.generate(
        context,
        options.insertMetadata,
        options.additionalProps,
        templatePath,
        {
          insertMode: false,
          showSpinner: true,
          dontCheckProcess: true,
        }
      )
    );

    if (errorGeneration) {
      throw errorGeneration;
    }

    return text || "";
  }

  /** record of template paths, from packageId, templateId */
  templatePaths: Record<string, Record<string, string>> = {};
  lastTemplatePathStats: Record<string, number | undefined> = {};

  async checkTemplatePathsHasChanged() {
    const files = this.plugin.app.vault.getFiles();
    for (const path in files) {
      if (
        !path.startsWith(this.plugin.settings.promptsPath) ||
        path.includes("/trash/")
      )
        continue;

      const ctime = (await this.plugin.app.vault.adapter.stat(path))?.ctime;
      if (ctime !== this.lastTemplatePathStats[path]) {
        return true;
      }
    }

    return false;
  }

  async packageExists(packageId: string) {
    if (await this.checkTemplatePathsHasChanged()) {
      await this.updateTemplatesCache();
    }

    return !!Object.keys(this.templatePaths[packageId] || {}).length;
  }

  async getTemplatePath(id: string) {
    if (await this.checkTemplatePathsHasChanged()) {
      await this.updateTemplatesCache();
    }

    const [packageId, templateId] = id.split("/");

    if (this.templatePaths[packageId]?.[templateId])
      return this.templatePaths[packageId][templateId];

    const promptsPath = this.plugin.settings.promptsPath;

    const guessPath = `${promptsPath}${
      promptsPath.endsWith("/") ? "" : "/"
    }${id}.md`;

    // test if the guess is actually a file
    if (await this.plugin.app.vault.adapter.exists(guessPath)) return guessPath;

    return undefined;
  }

  async getTemplate(id: string) {
    const templatePath = await this.getTemplatePath(id);
    if (!templatePath) throw new Error(`template with id:${id} wasn't found.`);

    return this.contextManager.templateFromPath(templatePath, {
      ...this.contextManager.getFrontmatter(
        this.contextManager.getMetaData(templatePath)
      ),
    });
  }

  async updateTemplatesCache() {
    // get files, it will be empty onLoad, that's why we are using the getFilesOnLoad function
    // nice update : stay this await hack here for moment,
    //before find a better solution, but kept only one implementation to load templates
    // list, in getTemplates()
    await this.plugin.getFilesOnLoad();

    const templates = this.plugin.geniiAssistant?.getTemplates();

    this.templatePaths = {};
    templates?.forEach((template: Template) => {
      if (template.id) {
        const ss = template.path.split("/");
        this.templatePaths[ss[ss.length - 2]] ??= {};
        this.templatePaths[ss[ss.length - 2]][template.id] = template.path;
      }
      this.lastTemplatePathStats[template.path] = template.ctime;
    });

    return templates;
  }
}
