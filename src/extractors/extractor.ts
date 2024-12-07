import { App } from "obsidian";
import TextGeneratorPlugin from "../main";

export abstract class Extractor {
  protected app: App;
  protected plugin: TextGeneratorPlugin;
  constructor(app: App, plugin: TextGeneratorPlugin) {
    this.app = app;
    this.plugin = plugin;
  }
  abstract convert(
    docPath: string,
    otherOptions?: Record<string, unknown> | string[] | string
  ): Promise<string>;
  abstract extract(filePath: string, fileContent: string): Promise<string[]>;
}
