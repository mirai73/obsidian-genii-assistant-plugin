import { App } from "obsidian";
import { YoutubeTranscript } from "./youtube-extractor/youtube-transcript";
import { Extractor } from "./extractor";
import debug from "debug";
import GeniiAssistantPlugin from "src/main";

const logger = debug("genii:Extractor:YoutubeTranscriptionExtractor");

export default class YoutubeExtractor extends Extractor {
  constructor(app: App, plugin: GeniiAssistantPlugin) {
    super(app, plugin);
  }

  decodeHtmlEntities(str?: string): string {
    if (!str) return "";
    return str.replace(/&amp;(#\d+);/g, function (_, dec) {
      return String.fromCharCode(parseInt(dec.replace(/^#/, ""), 10));
    });
  }

  async convert(url: string, options?: Record<string, unknown>) {
    logger("convert", { url });
    let fromOffset = 0;
    let toOffset = Number.MAX_VALUE;
    if (options?.from) {
      fromOffset = options?.from as number;
    }
    if (options?.to) {
      toOffset = options?.to as number;
    }

    const transcription = await YoutubeTranscript.fetchTranscript(url);
    logger("convert", transcription);
    const text = this.decodeHtmlEntities(
      transcription?.reduce((acc, val) => {
        if (val.offset > fromOffset && val.offset < toOffset) {
          return acc + " " + val.text;
        } else return "";
      }, "")
    );
    logger("convert end", { text });
    return text;
  }

  async extract(filePath: string, fileContent: string) {
    logger("extract", { filePath });
    const urls = this.extractUrls(fileContent);
    logger("extract end", { urls });
    return urls;
  }

  private extractUrls(text: string): string[] {
    const urlRegex =
      /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[^\s)\]]+)/g;
    const matches = text.match(urlRegex);
    if (!matches) {
      return [];
    }

    const uniqueUrls = new Set(matches);
    return [...uniqueUrls];
  }
}
