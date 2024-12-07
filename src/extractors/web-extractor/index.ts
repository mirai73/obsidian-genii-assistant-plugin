import { App, request, Platform } from "obsidian";
import { Extractor } from "../extractor";
import TextGeneratorPlugin from "src/main";
import debug from "debug";
import JSON5 from "json5";

let remote: typeof import("electron");

if (!Platform.isMobile) {
  // eslint-disable-next-line
  remote = (require("electron") as any)?.remote;
}

const logger = debug("genii:Extractor:WebPageExtractor");

export default class WebPageExtractor extends Extractor {
  constructor(app: App, plugin: TextGeneratorPlugin) {
    super(app, plugin);
  }

  async getContent(url: string, selector?: string | string[]) {
    logger("convert", { url });
    let response: string;

    if (Platform.isMobile) {
      response = await request({ url });
    } else {
      const win = new remote.BrowserWindow({
        show: false,
        height: 500,
        width: 400,
      });

      const cookie = {
        url: new URL(url).origin,
        name: "dummy_name",
        value: "dummy",
      };
      await win.webContents.session.cookies.set(cookie);

      response = await new Promise((s) => {
        win.webContents.on("dom-ready", async () => {
          // in seconds
          const maxTotal = 10;
          const fac = 1;

          let tries = maxTotal / fac;
          const timer = setInterval(async () => {
            const innerT = await win.webContents.executeJavaScript(
              `document.documentElement.innerText`
            );
            const content = await win.webContents.executeJavaScript(`
            document.body.innerHTML`);
            if (innerT.length || tries <= 0) {
              clearInterval(timer);
              s(content);
              tries--;
            }
          }, fac * 1000);
        });

        win
          .loadURL(url, {
            userAgent:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) obsidian/1.4.16 Chrome/114.0.5735.289 Electron/25.8.1 Safari/537.36",
          })
          .then(() => win.destroy());
      });
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(response, "text/html");
    logger("extractor", doc);
    // try to parse it
    try {
      selector = JSON5.parse(selector as any);
    } catch {
      // empty
    }

    if (selector) {
      const selectors = Array.isArray(selector) ? selector : [selector];

      const total: any[] = [];

      selectors.forEach((s) => {
        doc.body.querySelectorAll(s).forEach((q) => {
          total.push(q);
        });
      });

      doc.body.innerHTML = "";

      const list = doc.body.createEl(total.length > 1 ? "ol" : "div");

      total.forEach((t) =>
        (total.length > 1 ? list.createEl("li") : list).appendChild(t)
      );
    }

    // change all links if they're relative to obsidian
    // Get the div element

    // Get all the anchor elements inside the div
    const elements = doc.getElementsByTagName("a");

    // Loop through each element and change the origin
    for (let i = 0; i < elements.length; i++) {
      const currentHref = elements[i].getAttribute("href");
      if (currentHref?.startsWith("app://obsidian.md")) {
        elements[i].setAttribute(
          "href",
          new URL(new URL(currentHref).pathname, new URL(url).origin).href
        );
      }
      if (currentHref?.startsWith("/")) {
        elements[i].setAttribute(
          "href",
          new URL(currentHref, new URL(url).origin).href
        );
      }
    }

    return doc;
  }

  async convert(url: string, selector?: string | string[]) {
    const doc = await this.getContent(url, selector);
    return doc.body.innerHTML;
  }

  async extract(filePath: string, fileContent: string) {
    logger("extract", { filePath, fileContent });
    const urls = this.extractUrls(fileContent);
    logger("extract end", { urls });
    return urls;
  }

  protected extractUrls(text: string): string[] {
    const urlRegex =
      /(https?:\/\/(?!.*\.(?:mp3|mp4|mov|avi|pdf|png|jpe?g|gif)|.*(?:feed|rss|feeds))[^\s)\]]+)/g;
    const youtubeRegex =
      /https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/[^\s)\]]+/g;
    const matches = text.match(urlRegex);
    if (!matches) {
      return [];
    }
    const uniqueUrls = new Set(
      matches.filter((url) => !youtubeRegex.test(url))
    );
    return [...uniqueUrls];
  }
}
