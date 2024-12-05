import React, { useEffect } from "react";
import debug from "debug";
import LLMProviderInterface, { LLMConfig } from "../interface";
import useGlobal from "#/ui/context/global";
import SettingItem from "#/ui/settings/components/item";
import Input from "#/ui/settings/components/input";
import CustomProvider, { default_values as baseDefaultValues } from "./base";
import { IconExternalLink } from "@tabler/icons-react";
import { Platform } from "obsidian";
import { Message, Model, Role } from "#/types";
import {
  fromModelId,
  ChatMessage,
  fromImageModelId,
  ImageModels,
  fromVideoModelId,
} from "@mirai73/bedrock-fm";
import { AwsCredentialsWrapper } from "./awsCredentialsWrapper";
import { ModelsHandler } from "../utils";
import { MessageContentComplex } from "@langchain/core/messages";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { AI_MODELS } from "../refs";
import { rawListeners } from "process";

const logger = debug("genii:BedrockProvider");

const untangableVars = [
  "custom_header",
  "custom_body",
  "sanitization_response",
  "streamable",
  "CORSBypass",
];

export const default_values = {
  ...baseDefaultValues,
  endpoint: "https://undefined",
  region: "us-west-2",
  model: "anthropic.claude-3-sonnet-20240229-v1:0",
  custom_header: "",
  custom_body: "",
  sanitization_response: "",
  sanitization_streaming: "",
  streamable: true,
  useConverseApi: false,
  waitForVideo: true,
};

export type CustomConfig = Record<keyof typeof default_values, string>;

const roleMap = function (role: Role): "human" | "ai" | "system" {
  if (role === "user" || role === "human") return "human";
  if (role === "assistant" || role === "admin") return "ai";
  if (role === "system") return "system";
  throw new Error(`Unsupported role: ${role}`);
};

export default class BedrockProvider
  extends CustomProvider
  implements LLMProviderInterface
{
  static provider = "Custom";
  static id = "Bedrock (Custom)" as const;
  static slug = "bedrock" as const;
  static displayName = "Bedrock";
  models: Model[] = [];

  streamable = true;

  provider = BedrockProvider.provider;
  id = BedrockProvider.id;
  originalId = BedrockProvider.id;
  default_values = default_values;

  convertMessage(m: Message): ChatMessage {
    if (typeof m.content === "string") {
      return { role: roleMap(m.role), message: m.content };
    }
    const text: string[] = [];
    const images: string[] = [];
    m.content.forEach((c) => {
      if (c.type === "text") {
        text.push(c.text);
      } else if (c.type === "image_url") {
        if (!c.image_url?.url || !(c.image_url.url.indexOf("base64") >= 0))
          return;
        images.push(c.image_url.url);
      }
    });
    return {
      role: roleMap(m.role),
      message: text.join("\n"),
      images,
    };
  }

  async generate(
    messages: Message[],
    reqParams: Partial<Omit<LLMConfig, "n"> & { prompt: string }>,
    onToken?: (token: string, first: boolean) => void,
    customConfig?: CustomConfig
  ): Promise<string> {
    try {
      logger("generate", { reqParams, messages, customConfig });

      let first = true;
      let allText = "";

      const config = (this.plugin.settings.LLMProviderOptions[this.id] ??= {});
      logger("generate", { config });
      if (!Platform.isDesktop) {
        return "";
      }

      const credentials =
        await new AwsCredentialsWrapper().getAWSCredentialIdentity(
          "obsidian-bedrock"
        );
      const client = new BedrockRuntimeClient({
        region: config.region,
        credentials,
      });

      const model = reqParams?.model ?? config.model;
      logger("generate", { model });
      if (AI_MODELS[model]?.outputOptions?.images) {
        return await this.generateImage(model, client, messages, reqParams);
      }

      if (AI_MODELS[model]?.outputOptions?.videos) {
        return await this.generateVideo(model, client, messages, reqParams);
      }

      const fm = fromModelId(model, {
        // @ts-ignore
        client,
        maxTokenCount: reqParams.max_tokens,
        stopSequences: reqParams.stop ?? [],
        temperature: reqParams.temperature,
      });

      const stream = reqParams.stream && this.streamable && config.streamable;
      let converse_messages: ChatMessage[] = [
        { role: "human", message: reqParams.prompt ?? "" },
      ];
      if (messages?.length > 0) {
        converse_messages = messages.map((m) => this.convertMessage(m));
      }
      logger("generate", { converse_messages });
      if (!stream) {
        const resp = await fm.chat(converse_messages);
        logger(resp);
        return resp.message;
      } else {
        const resp = await fm.chatStream(converse_messages);
        if (resp) {
          for await (const token of resp) {
            await onToken?.(token, first);
            allText += token;
            first = false;
          }
          logger(allText);
          return allText;
        } else {
          throw new Error("Stream not supported");
        }
      }
    } catch (errorRequest: any) {
      logger("generate error", errorRequest);
      throw new Error(errorRequest);
    }
  }

  async generateImage(
    model: string,
    client: BedrockRuntimeClient,
    messages: Message[],
    reqParams: Partial<
      Omit<LLMConfig, "n"> & { prompt: string | MessageContentComplex[] }
    >
  ): Promise<string> {
    logger("generateImage", { model, reqParams, messages });
    let prompt: string | undefined;
    let image: string | undefined;

    if (typeof reqParams.prompt !== "string") {
      prompt = reqParams.prompt
        ?.filter((x) => x.type === "text")
        ?.at(0)
        // @ts-ignore
        ?.text.replace("\n", " ")
        .trim();
      image = reqParams.prompt?.filter((x) => x.type === "image_url")?.at(0) // @ts-ignore
        ?.image_url.url;
    } else {
      prompt = reqParams.prompt;
    }
    logger("generateImage", { prompt, image });
    if (!prompt) throw new Error("No prompt provided");
    const imageModel = fromImageModelId(model, { client });
    const images = await imageModel.generateImage(prompt, {
      size: { width: 1024, height: 1024 },
      // @ts-ignore need to fix the input type
      image: image,
    });
    logger("generateImage", { images });
    const imageBytes = Buffer.from(images[0].split("base64,")[1], "base64");
    // @ts-ignore
    const attachmentFolderPath: string = this.plugin.app.vault.getConfig?.(
      "attachmentFolderPath"
    );
    const ext = images[0].split(":")[1].split(";")[0].split("/")[1];
    const fileName = `Image created by ${model.split(".")[0]} ${new Date().toISOString().split(".")[0].replaceAll(":", "").replace("T", "").replaceAll("-", "")}.${ext}`;
    this.plugin.app.vault.createBinary(
      attachmentFolderPath + `/` + fileName,
      imageBytes
    );
    return `![[${fileName}]]`;
  }

  async generateMultiple(
    messages: Message[],
    reqParams: Partial<LLMConfig>,
    customConfig?: CustomConfig
  ): Promise<string[]> {
    try {
      logger("generateMultiple", reqParams);
      const config = (this.plugin.settings.LLMProviderOptions[this.id] ??= {});
      logger("config", config);
      logger("Custom Config", customConfig);
      const credentials =
        await new AwsCredentialsWrapper().getAWSCredentialIdentity(
          "obsidian-bedrock"
        );
      const client = new BedrockRuntimeClient({
        region: config.region,
        credentials,
      });
      const model = reqParams.model ?? config.model;
      const fm = fromModelId(model, {
        // @ts-ignore
        client,
        maxTokenCount: reqParams.max_tokens,
        stopSequences: reqParams.stop ?? [],
        temperature: reqParams.temperature,
      });
      if (!Platform.isDesktop) {
        return [""];
      }
      //const stream = reqParams.stream && this.streamable && config.streamable;

      let i = 0;
      const converse_messages = messages.map((m) => this.convertMessage(m));
      logger(converse_messages);
      const suggestions = [];
      logger("message", messages);
      while (i++ < (reqParams.n ?? 1)) {
        const resp = await fm.chat(converse_messages, {
          stopSequences: [...(reqParams.stop ?? []), ":"],
        });
        if (resp.message) suggestions.push(resp.message);
      }

      return suggestions;
    } catch (errorRequest: any) {
      logger("generateMultiple error", errorRequest);
      throw new Error(errorRequest);
    }
  }

  async generateVideo(
    model: string,
    client: BedrockRuntimeClient,
    messages: Message[],
    reqParams: Partial<
      Omit<LLMConfig, "n"> & { prompt: string | MessageContentComplex[] }
    >
  ): Promise<string> {
    logger("generateVideo", { model, reqParams, messages });
    let prompt: string | undefined;
    let image: string | undefined;

    if (typeof reqParams.prompt !== "string") {
      prompt = reqParams.prompt
        ?.filter((x) => x.type === "text")
        ?.at(0)
        // @ts-ignore
        ?.text.replace("\n", " ")
        .trim();
      image = reqParams.prompt?.filter((x) => x.type === "image_url")?.at(0) // @ts-ignore
        ?.image_url.url;
    } else {
      prompt = reqParams.prompt;
    }
    logger("generateVideo", { prompt, image });
    if (!prompt) throw new Error("No prompt provided");
    // @ts-ignore need to fix the import type - parameter is correct
    const videoModel = fromVideoModelId(model, { client });
    const video = await videoModel.generateVideo(prompt, {
      image: image,
      rawResponse: true,
      s3Uri: "s3://bedrock-video-generation-us-east-1-hta1ce", // config parameter, global and front matter?
    });
    logger("generateVideo", { video });
    return `\`\`\`bedrock-video\n${video}\n\`\`\``;
    // video.s3Uri = video.s3Uri.replace("s3://", "");
    // const s3client = new S3Client();
    // const resp = await s3client.send(
    //   new GetObjectCommand({
    //     Bucket: video.s3Uri.split("/")[0],
    //     Key: video.s3Uri.split("/")[1],
    //   })
    // );

    // const videoBytes = await resp.Body?.transformToByteArray();
    // if (!videoBytes) throw new Error("No video bytes");
    // // @ts-ignore
    // const attachmentFolderPath: string = this.plugin.app.vault.getConfig?.(
    //   "attachmentFolderPath"
    // );
    // const fileName = `Video created by ${model.split(".")[0]} ${new Date().toISOString().split(".")[0].replaceAll(":", "").replace("T", "").replaceAll("-", "")}.mp4`;
    // this.plugin.app.vault.createBinary(
    //   attachmentFolderPath + `/` + fileName,
    //   videoBytes
    // );
    // return `![[${fileName}]]`;
  }

  RenderSettings(props: Parameters<LLMProviderInterface["RenderSettings"]>[0]) {
    const global = useGlobal();

    const config = (global.plugin.settings.LLMProviderOptions[
      props.self.id || "default"
    ] ??= {
      ...default_values,
      useConverseApi: false,
    });

    // const vars = useMemo(() => {
    //   return getHBValues(
    //     `${config?.custom_header}
    //     ${config?.custom_body}`
    //   ).filter((d) => !globalVars[d]);
    // }, [global.trg]);

    useEffect(() => {
      untangableVars.forEach((v) => {
        config[v] = default_values[v as keyof typeof default_values];
      });
      global.triggerReload();
      global.plugin.saveSettings();
    }, []);

    return (
      <>
        <SettingItem
          name="Region"
          register={props.register}
          sectionId={props.sectionId}
        >
          <Input
            value={config.region || default_values.region}
            placeholder="Enter the AWS Region"
            type="text"
            setValue={async (value) => {
              config.region = value;
              global.triggerReload();
              await global.plugin.saveSettings();
            }}
          />
        </SettingItem>
        <ModelsHandler
          register={props.register}
          sectionId={props.sectionId}
          llmProviderId={props.self.originalId}
          default_values={default_values}
        />
        <SettingItem
          name="Wait for video generation"
          register={props.register}
          sectionId={props.sectionId}
        >
          <Input
            value={config.waitForVideo || default_values.waitForVideo}
            type="checkbox"
            setValue={async (value) => {
              config.waitForVideo = value;
              global.triggerReload();
              await global.plugin.saveSettings();
            }}
          />
        </SettingItem>
        {/* <SettingItem
          key="useConverseApi"
          name="Use Converse API"
          register={props.register}
          sectionId={props.sectionId}
        >
          <Input
            value={"" + config.useConverseApi}
            type="checkbox"
            setValue={async (val) => {
              logger(val);
              config.useConverseApi = val === "true";
              await global.plugin.saveSettings();
              global.triggerReload();
            }}
          />
        </SettingItem> */}

        {/* {vars.map((v: string) => (
          <SettingItem
            key={v}
            name={v}
            register={props.register}
            sectionId={props.sectionId}
          >
            <Input
              value={config[v]}
              placeholder={`Enter your ${v}`}
              type={v.toLowerCase().contains("key") ? "password" : "text"}
              setValue={async (value) => {
                config[v] = value;
                global.triggerReload();
                if (v.toLowerCase().contains("key"))
                  global.plugin.encryptAllKeys();
                await global.plugin.saveSettings();
              }}
            />
          </SettingItem>
        ))} */}

        <div className="plug-tg-flex plug-tg-flex-col plug-tg-gap-1">
          <div className="plug-tg-flex plug-tg-items-center plug-tg-gap-1">
            To use this provider you need to create an AWS profile for the CLI
            called <pre>obsidian-bedrock</pre>.
          </div>
          <div className="plug-tg-text-lg plug-tg-opacity-70">Useful links</div>
          <a href="https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html">
            <SettingItem
              name="AWS CLI configuration"
              className="plug-tg-text-s plug-tg-opacity-70 hover:plug-tg-opacity-100"
              register={props.register}
              sectionId={props.sectionId}
            >
              <IconExternalLink />
            </SettingItem>
          </a>
          <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html">
            <SettingItem
              name="What is Amazon Bedrock?"
              className="plug-tg-text-s plug-tg-opacity-70 hover:plug-tg-opacity-100"
              register={props.register}
              sectionId={props.sectionId}
            >
              <IconExternalLink />
            </SettingItem>
          </a>
          <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html">
            <SettingItem
              name="Available models"
              className="plug-tg-text-s plug-tg-opacity-70 hover:plug-tg-opacity-100"
              register={props.register}
              sectionId={props.sectionId}
            >
              <IconExternalLink />
            </SettingItem>
          </a>
        </div>
      </>
    );
  }
}
