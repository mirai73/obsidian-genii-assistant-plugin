import { App, Notice, FuzzySuggestModal } from "obsidian";
import TextGeneratorPlugin from "src/main";
import { Model } from "src/types";
import debug from "debug";
import { log } from "console";
const logger = debug("genii:setModel");

export class SetModel extends FuzzySuggestModal<Model> {
  plugin: TextGeneratorPlugin;
  onChoose: (result: string) => void;

  constructor(
    app: App,
    plugin: TextGeneratorPlugin,
    onChoose: (result: string) => void
  ) {
    super(app);
    this.onChoose = onChoose;
    this.plugin = plugin;
    logger("constructor", this.plugin.textGenerator?.LLMProvider);
    this.setPlaceholder(
      `Select a model for ${this.plugin.textGenerator?.LLMProvider?.id}`
    );
    if (!this.plugin.textGenerator?.LLMProvider) {
      new Notice("Please select a LLM Provider first");
      this.close();
    }
  }

  getItems() {
    logger("getItems");
    return this.plugin.textGenerator?.LLMProvider?.getModels() ?? [];
  }

  getItemText(model: Model): string {
    return model.id;
  }

  onChooseItem(model: Model, evt: MouseEvent | KeyboardEvent) {
    logger("onChooseItem", model);
    new Notice(`Selected ${model.id}`);
    this.onChoose(model.id);
    this.close();
  }
}
