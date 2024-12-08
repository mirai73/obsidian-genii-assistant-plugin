import { App, SuggestModal } from "obsidian";
import GeniiAssistantPlugin from "src/main";

export class InlineChat extends SuggestModal<string> {
  plugin: GeniiAssistantPlugin;
  onEnter: (v: string) => void;

  constructor(
    app: App,
    plugin: GeniiAssistantPlugin,
    onEnter: (v: string) => void
  ) {
    super(app);
    this.plugin = plugin;
    this.onEnter = onEnter;
    this.setPlaceholder("Hi, I am your Genii Assistant. How can I help you?");
  }

  getSuggestions(query: string): string[] {
    return [
      query,
      ...this.plugin.settings.questionsLRU.filter((x) => x.startsWith(query)),
    ];
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.createEl("div", { text: value });
  }
  onChooseSuggestion(value: string) {
    this.onEnter(value);
  }
}
