import { PromptTemplate } from "../types";
import {
  App,
  Editor,
  EditorPosition,
  EditorSuggest,
  MarkdownView,
} from "obsidian";
import TextGeneratorPlugin from "../main";
import { TemplatesModal } from "../models/model";
import ContentManagerFactory from "../scope/content-manager";
import { debug } from "debug";

const logger = debug("genii:slash-suggest");

export class SlashSuggest extends EditorSuggest<PromptTemplate> {
  app: App;
  private plugin: TextGeneratorPlugin;
  constructor(app: App, plugin: TextGeneratorPlugin) {
    super(app);
    this.app = app;
    this.plugin = plugin;

    this.scope.register([], "Tab", () => {
      this.close();
    });
  }

  public onTrigger(cursor: EditorPosition, editor: Editor) {
    const _line: string = editor.getLine(cursor.line);
    const trigger =
      this.plugin.settings.slashSuggestOptions?.triggerPhrase ||
      this.plugin.defaultSettings.slashSuggestOptions.triggerPhrase;
    const start = _line.trimStart();

    const startAfterTriggerPhrase = start.substring(trigger.length, cursor.ch);

    if (!start.startsWith(trigger)) return null;
    const currentPart = startAfterTriggerPhrase;
    return {
      start: { ch: 0, line: cursor.line },
      end: cursor,
      query: currentPart,
    };
  }

  public async getSuggestions(context: PromptTemplate["context"]) {
    const { query } = context;

    const modal = new TemplatesModal(this.app, this.plugin, async (result) => {
      logger("getSuggestions", result);
    });

    const suggestions = modal.getSuggestions(query);
    return suggestions.map((s) => ({
      ...s.item,
      context,
    })) as PromptTemplate[];
  }

  renderSuggestion(template: PromptTemplate, el: HTMLElement) {
    el.createEl("div", {
      cls: "plug-tg-text-md plug-tg-font-bold plug-tg-ml-2 plug-tg-mb-2",
      text: template.name,
    });
    el.createEl("div", {
      text: template.description?.substring(0, 150),
      cls: "plug-tg-text-sm plug-tg-ml-2",
    });
    el.createEl("div", {});
    el.createEl("div", {
      text: template.path,
      cls: "plug-tg-text-xs plug-tg-ml-2 plug-tg-italic",
    });
  }

  async selectSuggestion(
    value: PromptTemplate,
    evt: MouseEvent | KeyboardEvent
  ) {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

    if (!activeView) return console.warn("couldn't find activeView");

    const CM = ContentManagerFactory.createContentManager(
      activeView,
      this.plugin,
      {
        templatePath: value.path,
      }
    );

    activeView.editor.replaceRange("", value.context.start, value.context.end);

    await this.plugin.textGenerator?.templateToModal({
      params: {},
      templatePath: value.path,
      editor: CM,
      filePath: activeView.file?.path,
    });

    this.close();
  }
}
