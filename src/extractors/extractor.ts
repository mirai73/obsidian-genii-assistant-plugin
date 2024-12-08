import { App } from "obsidian";
import GeniiAssistantPlugin from "../main";

export abstract class Extractor {
  protected app: App;
  protected plugin: GeniiAssistantPlugin;
  constructor(app: App, plugin: GeniiAssistantPlugin) {
    this.app = app;
    this.plugin = plugin;
  }
  abstract convert(
    docPath: string,
    otherOptions?: Record<string, unknown> | string[] | string
  ): Promise<string>;
  abstract extract(filePath: string, fileContent: string): Promise<string[]>;
}
