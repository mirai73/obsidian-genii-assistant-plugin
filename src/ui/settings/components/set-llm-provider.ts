import { App, Notice, FuzzySuggestModal } from "obsidian";
import TextGeneratorPlugin from "src/main";
import debug from "debug";
const logger = debug("genii:setModel");

interface LLM {
  id: string;
  name: string;
}

export class SetLLMProvider extends FuzzySuggestModal<LLM> {
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
    this.setPlaceholder("Select a LLM Provider");
  }

  getItems() {
    const llmList = this.plugin.textGenerator?.LLMRegistry?.getList().map(
      (l) => ({
        id: l,
        name:
          this.plugin.textGenerator?.LLMRegistry?.UnProviderNames[
            l as keyof typeof this.plugin.textGenerator.LLMRegistry.ProviderSlugs
          ] || "",
      })
    );
    return llmList ?? [];
  }

  getItemText(llm: LLM) {
    return llm.name || llm.id;
  }

  onChooseItem(llm: LLM, evt: MouseEvent | KeyboardEvent) {
    logger("onChooseItem", llm);
    new Notice(`Selected ${llm.name}`);
    this.onChoose(llm.id);
  }
}
