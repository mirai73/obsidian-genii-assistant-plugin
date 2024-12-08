import { App, Notice, FuzzySuggestModal } from "obsidian";
import GeniiAssistantPlugin from "src/main";
import { Model } from "src/types";
import debug from "debug";
const logger = debug("genii:setModel");

export class SetModel extends FuzzySuggestModal<Model> {
  plugin: GeniiAssistantPlugin;
  onChoose: (result: string) => void;

  constructor(
    app: App,
    plugin: GeniiAssistantPlugin,
    onChoose: (result: string) => void
  ) {
    super(app);
    this.onChoose = onChoose;
    this.plugin = plugin;
    logger("constructor", this.plugin.geniiAssistant?.LLMProvider);
    this.setPlaceholder(
      `Select a model for ${this.plugin.geniiAssistant?.LLMProvider?.id}`
    );
    if (!this.plugin.geniiAssistant?.LLMProvider) {
      new Notice("Please select a LLM Provider first");
      this.close();
    }
  }

  getItems() {
    logger("getItems");
    return this.plugin.geniiAssistant?.LLMProvider?.getModels() ?? [];
  }

  getItemText(model: Model): string {
    return model.id;
  }

  onChooseItem(model: Model) {
    logger("onChooseItem", model);
    new Notice(`Selected ${model.id}`);
    this.onChoose(model.id);
    this.close();
  }
}
