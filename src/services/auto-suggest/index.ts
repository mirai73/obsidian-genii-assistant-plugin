import GeniiAssistantPlugin from "src/main";
import {
  App,
  Editor,
  EditorPosition,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  Notice,
  Scope,
  TFile,
  getIcon,
} from "obsidian";

import debug from "debug";
import ContentManagerFactory from "../../scope/content-manager";
import { InlineSuggest } from "./inlineSuggest";
import { ListSuggest } from "./listSuggest";
const logger = debug("genii:AutoSuggest");

export interface Completion {
  label: string;
  value: string;
}

export class AutoSuggest {
  plugin: GeniiAssistantPlugin;
  process = true;
  delay = 0;
  currentSuggestions: string[] = [];
  getSuggestionsDebounced:
    | ((context: EditorSuggestContext) => Promise<Completion[]>)
    | undefined;
  scope:
    | (Scope & {
        keys: {
          key: string;
          func: any;
        }[];
      })
    | undefined;
  isOpen = false;
  app: App;
  constructor(app: App, plugin: GeniiAssistantPlugin) {
    logger("AutoSuggest", app, plugin);
    this.plugin = plugin;
    this.app = app;

    this.setup();
  }

  public checkLastSubstring(str: string, substring: string): boolean {
    const size = substring.length;
    const lastSubstring = str.slice(-size);
    return lastSubstring === substring;
  }

  async getSuggestions(
    context: EditorSuggestContext
  ): Promise<Completion[] | []> {
    logger("getSuggestions", context);
    try {
      let prompt =
        this.plugin.defaultSettings.autoSuggestOptions.customInstruct;
      let system = this.plugin.defaultSettings.autoSuggestOptions.systemPrompt;

      if (this.plugin.settings.autoSuggestOptions.customInstructEnabled) {
        try {
          const templateContent =
            this.plugin.settings.autoSuggestOptions.customInstruct ??
            this.plugin.defaultSettings.autoSuggestOptions.customInstruct;

          if (this.plugin.settings.autoSuggestOptions.systemPrompt)
            system = this.plugin.settings.autoSuggestOptions.systemPrompt;

          const editor = ContentManagerFactory.createContentManager(
            await this.plugin.getActiveView(),
            this.plugin
          );

          const templateContext =
            await this.plugin.contextManager?.getTemplateContext({
              editor,
              templateContent,
              filePath: context.file?.path,
            });

          templateContext.query = context.query;

          const splittedTemplate =
            this.plugin.contextManager?.splitTemplate(templateContent);

          const promptFromTemplate =
            await splittedTemplate?.inputTemplate?.(templateContext);
          if (promptFromTemplate) prompt = promptFromTemplate;
        } catch (err: any) {
          logger(err);
          console.error("error in custom instruct", err);
        }
      }

      this.plugin.startProcessing(false);

      const autoSuggestOptions = this.plugin.settings.autoSuggestOptions;

      if (
        autoSuggestOptions.customProvider &&
        autoSuggestOptions.selectedProvider
      )
        await this.plugin.geniiAssistant?.loadLLM(
          autoSuggestOptions.selectedProvider
        );
      const re =
        await this.plugin.geniiAssistant?.LLMProvider?.generateMultiple(
          [
            this.plugin.geniiAssistant.LLMProvider?.makeMessage(
              system,
              "system"
            ),
            this.plugin.geniiAssistant.LLMProvider?.makeMessage(prompt, "user"),
          ],
          {
            stream: false,
            n: parseInt(
              "" + this.plugin.settings.autoSuggestOptions.numberOfSuggestions,
              10
            ),
            stop: [this.plugin.settings.autoSuggestOptions.stop],
          }
        );

      this.plugin.endProcessing(false);
      const suggestions = [...new Set(re)];
      return suggestions.map((r) => {
        console.log({ r });
        let label = (r || "").trim();
        if (
          !this.checkLastSubstring(
            label,
            this.plugin.settings.autoSuggestOptions.stop
          )
        ) {
          label += this.plugin.settings.autoSuggestOptions.stop;
        }

        const suggestionsObj = {
          label,
          value: label.toLowerCase().startsWith(context.query.toLowerCase())
            ? label.substring(context.query.length).trim()
            : label.trim(),
        };
        logger("getSuggestions", suggestionsObj);
        return suggestionsObj;
      });
    } catch (error) {
      logger("getSuggestions error", error);
      this.plugin.handelError(error);
    }
    return [];
  }

  autoSuggestItem: HTMLElement | undefined;
  renderStatusBar() {
    if (!this.autoSuggestItem) return;
    this.autoSuggestItem.innerHTML = "";
    if (!this.plugin.settings.autoSuggestOptions.showStatus) return;

    const languageIcon = this.plugin.settings.autoSuggestOptions.isEnabled
      ? getIcon("zap")
      : getIcon("zap-off");

    if (languageIcon) this.autoSuggestItem.append(languageIcon);

    this.autoSuggestItem.title = "Enable or disable Auto-suggest";

    this.autoSuggestItem.addClass("mod-clickable");
  }

  AddStatusBar() {
    this.autoSuggestItem = this.plugin.addStatusBarItem();

    this.renderStatusBar();

    this.autoSuggestItem.addEventListener("click", () => {
      this.plugin.settings.autoSuggestOptions.isEnabled =
        !this.plugin.settings.autoSuggestOptions.isEnabled;
      this.plugin.saveSettings();
      this.renderStatusBar();
      if (this.plugin.settings.autoSuggestOptions.isEnabled) {
        new Notice(`Auto Suggestion is on!`);
      } else {
        new Notice(`Auto Suggestion is off!`);
      }
    });
  }

  public onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    file: TFile
  ): EditorSuggestTriggerInfo | null {
    logger("onTrigger", cursor, editor, file);
    if (
      this.isOpen ||
      !this.plugin.settings.autoSuggestOptions?.isEnabled ||
      !this.plugin.settings.autoSuggestOptions.triggerPhrase ||
      // @ts-ignore
      (this.app.workspace.activeEditor?.editor?.cm?.state?.vim?.mode &&
        // @ts-ignore
        this.app.workspace.activeEditor.editor.cm.state.vim.mode !== "insert")
    ) {
      this.process = false;
      return null;
    }

    const triggerPhrase = this.plugin.settings.autoSuggestOptions.triggerPhrase;

    const line = editor.getLine(cursor.line).substring(0, cursor.ch);

    if (
      (!this.plugin.settings.autoSuggestOptions.allowInNewLine &&
        line === triggerPhrase) ||
      !line.endsWith(triggerPhrase)
    ) {
      this.process = false;
      return null;
    }

    this.process = true;

    // @ts-ignore
    const CM = ContentManagerFactory.createContentManager(
      this.plugin.app.workspace.activeLeaf?.view as any,
      this.plugin
    );

    const selection = this.plugin.contextManager.getTGSelection(
      CM
    ) as unknown as string;
    const lastOccurrenceIndex = selection.lastIndexOf(triggerPhrase);
    const currentPart =
      selection.substring(0, lastOccurrenceIndex) +
      selection.substring(lastOccurrenceIndex).replace(triggerPhrase, "");

    const currentStart = line.lastIndexOf(triggerPhrase);

    if (
      !this.plugin.settings.autoSuggestOptions.customInstructEnabled &&
      !selection.trim().length
    ) {
      this.process = false;
      return null;
    }

    const result = {
      start: {
        ch: currentStart,
        line: cursor.line,
      },
      end: cursor,
      query: currentPart,
    };

    logger("onTrigger", result);
    return result;
  }

  dealer?: InlineSuggest | ListSuggest;

  public setup() {
    if (this.plugin.settings.autoSuggestOptions.inlineSuggestions)
      return (this.dealer = InlineSuggest.setup(this.app, this.plugin, this));

    this.dealer = ListSuggest.setup(this.app, this.plugin, this);
  }

  public destroy() {
    // this.dealer?.destroy()
  }
}
