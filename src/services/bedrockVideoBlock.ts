import ContentManagerFactory from "#/scope/content-manager";
import TextGeneratorPlugin from "#/main";
import { MarkdownPostProcessorContext, MarkdownRenderer } from "obsidian";
import debug from "debug";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NovaReel, VideoModels } from "@mirai73/bedrock-fm";
import { AwsCredentialsWrapper } from "#/LLMProviders/custom/awsCredentialsWrapper";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { ContentInsertMode } from "#/scope/content-manager/types";
const logger = debug("genii:bedrockVideoBlock");

export default class BedrockVideoBlock {
  plugin: TextGeneratorPlugin;
  constructor(plugin: TextGeneratorPlugin) {
    this.plugin = plugin;

    this.plugin.registerMarkdownCodeBlockProcessor(
      "bedrock-video",
      async (source, el, ctx) => {
        this.blockHandler(source, el, ctx);
      }
    );
  }

  async blockHandler(
    source: string,
    container: HTMLElement,
    { sourcePath: path }: MarkdownPostProcessorContext
  ) {
    try {
      if (!this.plugin.contextManager) {
        throw new Error("Context manager wasn't initialized");
      }
      logger("blockHandler", { source, container });

      const activeView = this.plugin.getActiveViewMD();

      if (!activeView) throw new Error("Active View wasn't detected");
      const div = document.createElement("div");
      div.classList.add(
        "plug-tg-p-1",
        "plug-video-bedrock",
        "plug-tg-text-xs",
        "plug-tg-cursor-pointer",
        "plug-tg-border-2"
      );
      div.innerText = source;
      container.appendChild(div);
      this.addMenu(container, source, div);
    } catch (e) {
      console.warn(e);
    }
  }

  private async getVideo(invocationArn: string) {
    const config = (this.plugin.settings.LLMProviderOptions[
      "Bedrock (Custom)"
    ] ??= {});
    logger("generate", { config });

    const credentials =
      await new AwsCredentialsWrapper().getAWSCredentialIdentity(
        "obsidian-bedrock"
      );
    const client = new BedrockRuntimeClient({
      region: config.region,
      credentials,
    });

    // @ts-ignore
    const fm = new NovaReel(VideoModels.AMAZON_NOVA_REEL_V1_0, { client });
    logger("getVideo", { invocationArn });
    let { uri } = await fm.getResults(invocationArn);
    logger("getVideo", { uri });
    if (!uri) throw new Error("No video found");
    const s3client = new S3Client({ region: config.region, credentials });
    uri = uri.replace("s3://", "");
    const resp = await s3client.send(
      new GetObjectCommand({
        Bucket: uri?.split("/")[0],
        Key: uri?.split("/")[1] + "/output.mp4",
      })
    );

    const videoBytes = await resp.Body?.transformToByteArray();
    if (!videoBytes) throw new Error("No video bytes");
    // @ts-ignore
    const attachmentFolderPath: string = this.plugin.app.vault.getConfig?.(
      "attachmentFolderPath"
    );
    const fileName = `Video created by Nova Reel ${new Date().toISOString().split(".")[0].replaceAll(":", "").replace("T", "").replaceAll("-", "")}.mp4`;
    this.plugin.app.vault.createBinary(
      attachmentFolderPath + `/` + fileName,
      videoBytes
    );
    return `![[${fileName}]]`;
  }

  private addMenu(el: HTMLElement, source: string, blockEl: HTMLElement) {
    const div = document.createElement("div");
    div.classList.add("plug-tg-tgmenu", "plug-tg-flex", "plug-tg-justify-end");
    const generateSVG = `<svg viewBox="0 0 100 100" class="svg-icon GENERATE_ICON"><defs><style>.cls-1{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:4px;}</style></defs><g id="Layer_2" data-name="Layer 2"><g id="VECTOR"><rect class="cls-1" x="74.98" y="21.55" width="18.9" height="37.59"></rect><path class="cls-1" d="M38.44,27.66a8,8,0,0,0-8.26,1.89L24.8,34.86a25.44,25.44,0,0,0-6,9.3L14.14,56.83C11.33,64.7,18.53,67.3,21,60.9" transform="translate(-1.93 -15.75)"></path><polyline class="cls-1" points="74.98 25.58 56.61 18.72 46.72 15.45"></polyline><path class="cls-1" d="M55.45,46.06,42.11,49.43,22.76,50.61c-8.27,1.3-5.51,11.67,4.88,12.8L46.5,65.78,53,68.4a23.65,23.65,0,0,0,17.9,0l6-2.46" transform="translate(-1.93 -15.75)"></path><path class="cls-1" d="M37.07,64.58v5.91A3.49,3.49,0,0,1,33.65,74h0a3.49,3.49,0,0,1-3.45-3.52V64.58" transform="translate(-1.93 -15.75)"></path><path class="cls-1" d="M48,66.58v5.68a3.4,3.4,0,0,1-3.34,3.46h0a3.4,3.4,0,0,1-3.34-3.45h0V65.58" transform="translate(-1.93 -15.75)"></path><polyline class="cls-1" points="28.75 48.05 22.66 59.3 13.83 65.61 14.41 54.5 19.11 45.17"></polyline><polyline class="cls-1" points="25.17 34.59 43.75 0.25 52.01 5.04 36.39 33.91"></polyline><line class="cls-1" x1="0.25" y1="66.92" x2="13.83" y2="66.92"></line></g></g></svg>`;

    const button = this.plugin.createRunButton("Fetch video", generateSVG);
    button.addEventListener("click", async () => {
      const activeView = this.plugin.getActiveViewMD();
      if (!activeView) throw new Error("Active View wasn't detected");
      const CM = ContentManagerFactory.createContentManager(
        activeView,
        this.plugin
      );

      blockEl.addClass("plug-tg-loading");
      const videoLink = await this.getVideo(source);
      CM.insertText(videoLink, CM.getCursor(), "insert");
      blockEl.innerHTML = "";
      blockEl.removeClass("plug-tg-loading");
      blockEl.addClass("plug-tg-border-2");
      logger("eventListener", { videoLink });
    });
    div.appendChild(button);
    el.parentElement?.appendChild(div);
  }
}
