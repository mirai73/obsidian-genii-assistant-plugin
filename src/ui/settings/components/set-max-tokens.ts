import { App, Modal, Setting } from "obsidian";
import GeniiAssistantPlugin from "src/main";

export class SetMaxTokens extends Modal {
  result: string;
  plugin: GeniiAssistantPlugin;
  onSubmit: (result: string) => void;

  constructor(
    app: App,
    plugin: GeniiAssistantPlugin,
    result: string,
    onSubmit: (result: string) => void
  ) {
    super(app);
    this.plugin = plugin;
    this.result = result;
    this.onSubmit = onSubmit;
    this.setTitle("Max number of tokens");
  }

  onOpen() {
    const { contentEl } = this;

    setTimeout(() => {
      contentEl.addEventListener("keyup", (event) => {
        event.preventDefault();
        if (event.key === "Enter") {
          this.close();
          this.onSubmit(this.result);
        }
      });
    }, 500);

    new Setting(contentEl)
      .setName("Max number of tokens")
      .setDesc(
        "The max number of the tokens that will be generated (1000 tokens ~ 750 words)"
      )
      .addText((text) =>
        text
          .setPlaceholder("max_tokens")
          .setValue(this.result.toString())
          .onChange(async (value) => {
            this.result = value;
            await this.plugin.saveSettings();
          })
          .inputEl.select()
      );

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText("Submit")
        .setCta()
        .onClick(() => {
          this.close();
          this.onSubmit(this.result);
        })
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
