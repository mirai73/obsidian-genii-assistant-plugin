import { App, PluginSettingTab, Setting } from "obsidian";
import GeniiAssistantPlugin from "#/main";

import { createRoot } from "react-dom/client";
import React from "react";
import { GlobalProvider } from "../context/global";

import SectionsMain from "./sections";
import ReloadPluginPopup from "./components/reloadPlugin";
import * as manifest from "../../../manifest.json";

export default class GeniiAssistantSettingTab extends PluginSettingTab {
  plugin: GeniiAssistantPlugin;
  app: App;
  constructor(app: App, plugin: GeniiAssistantPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.app = app;
  }

  async reloadPlugin() {
    // @ts-expect-error ts2339
    await this.app.plugins.disablePlugin(manifest.id);
    // @ts-expect-error ts2339
    await this.app.plugins.enablePlugin(manifest.id);
    // @ts-expect-error ts2339
    this.app.setting.openTabById(manifest.id).display();
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName("Reload Plugin")
      .addButton((b) =>
        b.setButtonText("Reload").onClick(() => this.reloadPlugin())
      );

    const div = containerEl.createDiv("div");
    const sections = createRoot(div);

    sections.render(
      <GlobalProvider plugin={this.plugin}>
        <ReloadPluginPopup />
        <SectionsMain />
      </GlobalProvider>
    );
  }
}
