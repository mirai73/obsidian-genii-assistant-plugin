import { App } from "obsidian";
import PDFExtractor from "./pdf-extractor";
import WebPageExtractorHTML from "./web-extractor";
import WebPageExtractor from "./web-extractor/markdown";
import YoutubeExtractor from "./youtube-extractor";
import AudioExtractor from "./audio-extractor";
import { Extractor } from "./extractor";
import GeniiAssistantPlugin from "../main";
import debug from "debug";
import ImageExtractor from "./image-extractor";
import ImageExtractorEmbded from "./image-extractor-embded";
import RssExtractor from "./rss-extractor";
const logger = debug("genii:Extractor");

export const listOfUsableExtractors = [
  "PDFExtractor",
  "WebPageExtractor",
  "YoutubeExtractor",
  "AudioExtractor",
  "ImageExtractor",
  "ImageExtractorEmbded",
  "RssExtractor",
];

// Add the new Extractor here
export const Extractors = {
  PDFExtractor,
  WebPageExtractor,
  WebPageExtractorHTML,
  YoutubeExtractor,
  AudioExtractor,
  ImageExtractor,
  ImageExtractorEmbded,
  RssExtractor,
};

export const ExtractorSlug = {
  pdf: "PDFExtractor",

  web: "WebPageExtractor",
  web_md: "WebPageExtractor",
  web_html: "WebPageExtractorHTML",

  yt: "YoutubeExtractor",
  youtube: "YoutubeExtractor",
  audio: "AudioExtractor",
  img: "ImageExtractor",
  ImgEmbd: "ImageExtractorEmbded",
  rss: "RssExtractor",
};

export const UnExtractorSlug: Record<string, string> = {};

for (const key in ExtractorSlug) {
  if (Object.prototype.hasOwnProperty.call(ExtractorSlug, key)) {
    UnExtractorSlug[ExtractorSlug[key as keyof typeof ExtractorSlug]] = key;
  }
}

export type ExtractorMethod = keyof typeof Extractors;

export class ContentExtractor {
  private extractor?: Extractor;
  private app: App;
  private plugin: GeniiAssistantPlugin;
  constructor(app: App, plugin: GeniiAssistantPlugin) {
    this.app = app;
    this.plugin = plugin;
  }

  setExtractor(extractorName: ExtractorMethod) {
    logger("set Extractor", { extractorName });
    this.extractor = this.createExtractor(extractorName);
  }

  async convert(
    docPath: string,
    otherOptions?: any
  ): Promise<string | undefined> {
    // Use the selected splitter to split the text
    this.plugin.startProcessing(false);
    const text = await this.extractor?.convert(
      docPath.trimStart().trimEnd(),
      otherOptions
    );
    this.plugin.endProcessing(false);
    return text;
  }

  async extract(filePath: string, fileContent?: string): Promise<string[]> {
    if (!fileContent) {
      const file = this.app.vault.getFileByPath(filePath);

      if (file) {
        fileContent = await this.app.vault.cachedRead(file);
      } else {
        return [];
      }
    }
    return this.extractor?.extract(filePath, fileContent) ?? [];
  }

  private createExtractor(extractorName: ExtractorMethod) {
    if (!Extractors[extractorName])
      throw new Error(`Unknown Extractor: ${extractorName}`);
    return new Extractors[extractorName](this.app, this.plugin) as Extractor;
  }
}

export const getExtractorMethods = () => {
  return listOfUsableExtractors as unknown as ExtractorMethod[];
};

export { Extractor };
