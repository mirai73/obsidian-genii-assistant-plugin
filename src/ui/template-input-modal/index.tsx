import { App, Modal } from "obsidian";
import TextGeneratorPlugin from "../../main";
import * as React from "react";
import TemplateInputModalView from "./view";
import { createRoot } from "react-dom/client";

export default class TemplateInputModalUI extends Modal {
  plugin: TextGeneratorPlugin;
  onSubmit: (result: string) => void;
  root: any;
  variables: string[];
  metadata: any;
  templateContext: any;
  constructor(
    app: App,
    plugin: TextGeneratorPlugin,
    variables: string[],
    metadata: any,
    templateContext: any,
    onSubmit: (result: string) => void
  ) {
    super(app);
    this.plugin = plugin;
    this.onSubmit = onSubmit;
    this.variables = variables;
    this.metadata = metadata;
    this.templateContext = templateContext;
  }

  async onOpen() {
    this.containerEl.createEl("div");
    this.root = createRoot(this.containerEl.children[1]);

    this.root.render(
      <React.StrictMode>
        <TemplateInputModalView
          p={this}
          labels={this.variables}
          templateContext={this.templateContext}
          onSubmit={this.onSubmit}
          metadata={this.metadata}
        />
      </React.StrictMode>
    );
  }

  onClose() {
    this.root.unmount();
  }
}
