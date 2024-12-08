import { App, Notice, FuzzySuggestModal } from "obsidian";
import GeniiAssistantPlugin from "src/main";
import debug from "debug";
const logger = debug("genii:setModel");

interface LLM {
  id: string;
  name: string;
}

export class SetLLMProvider extends FuzzySuggestModal<LLM> {
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
    this.setPlaceholder("Select a LLM Provider");
  }

  getItems() {
    const llmList = this.plugin.geniiAssistant?.LLMRegistry?.getList().map(
      (l) => ({
        id: l,
        name:
          this.plugin.geniiAssistant?.LLMRegistry?.UnProviderNames[
            l as keyof typeof this.plugin.geniiAssistant.LLMRegistry.ProviderSlugs
          ] || "",
      })
    );
    return llmList ?? [];
  }

  getItemText(llm: LLM) {
    return llm.name || llm.id;
  }

  onChooseItem(llm: LLM) {
    logger("onChooseItem", llm);
    new Notice(`Selected ${llm.name}`);
    this.onChoose(llm.id);
  }
}
