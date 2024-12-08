import React, { useEffect } from "react";
import debug from "debug";
import LLMProviderInterface, { LLMConfig } from "../interface";
import useGlobal from "#/ui/context/global/context";
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
  fromVideoModelId,
} from "@mirai73/bedrock-fm";
import { AwsCredentialsWrapper } from "./awsCredentialsWrapper";
import { ModelsHandler } from "../utils";
import { MessageContentComplex } from "@langchain/core/messages";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { AI_MODELS } from "../refs";
import { ConfigItem } from "#/ui/settings/components/configItem";

const logger = debug("genii:BedrockProvider");

const untangableVars = [
  "custom_header",
  "custom_body",
  "sanitization_response",
  "canStream",
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
  canStream: true,
  useConverseApi: false,
  s3Uri: "",
  system: "",
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
  static id = "bedrock" as const;
  static slug = "bedrock" as const;
  static displayName = "Bedrock";
  models: Model[] = [];

  canStream = true;

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
        region: customConfig?.region ?? config.region,
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
        client,
        maxTokenCount: reqParams.max_tokens,
        stopSequences: reqParams.stop ?? [],
        temperature: reqParams.temperature,
      });

      const stream = reqParams.stream && this.canStream && config.canStream;
      let converse_messages: ChatMessage[] = [
        { role: "human", message: reqParams.prompt ?? "" },
      ];
      if (customConfig?.system !== undefined) {
        converse_messages.unshift({
          role: "system",
          message: customConfig?.system,
        });
      }
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
        // @ts-ignore
        .reduce((acc, x) => acc + x.text, "")
        .trim();
      image = reqParams.prompt?.filter((x) => x.type === "image_url")?.at(0) // @ts-ignore
        ?.image_url.url;
    } else {
      prompt = reqParams.prompt;
    }

    logger("generateImage", { prompt, image: image?.slice(0, 30) });
    if (!prompt) throw new Error("No prompt provided");
    // @ts-ignore
    const imageModel = fromImageModelId(model, { client });
    const images = await imageModel.generateImage(prompt, {
      size: { width: 1024, height: 1024 },
      // @ts-ignore need to fix the input type
      image: image,
    });

    logger("generateImage", { images });
    const imageLinks = images.map((im, idx) => {
      const imageBytes = Buffer.from(im.split("base64,")[1], "base64");
      // @ts-ignore
      const attachmentFolderPath: string = this.plugin.app.vault.getConfig?.(
        "attachmentFolderPath"
      );
      const ext = im.split(":")[1].split(";")[0].split("/")[1];
      const fileName = `Image created by ${model.split(".")[0]} ${new Date().toISOString().split(".")[0].replaceAll(":", "").replace("T", "").replaceAll("-", "")} [${idx}].${ext}`;
      this.plugin.app.vault.createBinary(
        attachmentFolderPath + `/` + fileName,
        imageBytes
      );
      return fileName;
    });
    return imageLinks.map((link) => `![[${link}]]`).join("\n\n");
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
      //const stream = reqParams.stream && this.canStream && config.canStream;

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
    if (!this.config.s3Uri) {
      throw new Error("S3 URI not set. Please set it in the plugin settings.");
    }
    const video = await videoModel.generateVideo(prompt, {
      image: image,
      rawResponse: true,
      s3Uri: this.config.s3Uri, // config parameter, global and front matter?
    });
    logger("generateVideo", { video });
    return `\`\`\`bedrock-video\n${video}\n\`\`\``;
  }

  RenderSettings(props: Parameters<LLMProviderInterface["RenderSettings"]>[0]) {
    const global = useGlobal();

    const initialConfig =
      global?.plugin.settings.LLMProviderOptions[props.self.id || "default"];
    const config = initialConfig
      ? initialConfig
      : {
          ...default_values,
          useConverseApi: false,
        };

    useEffect(() => {
      untangableVars.forEach((v) => {
        config[v] = default_values[v as keyof typeof default_values];
      });
      global?.triggerReload();
      global?.plugin.saveSettings();
    }, []);

    return (
      <>
        <SettingItem name="Region" sectionId={props.sectionId}>
          <Input
            value={config.region || default_values.region}
            placeholder="Enter the AWS Region"
            type="text"
            setValue={async (value) => {
              config.region = value;
              global?.triggerReload();
              await global?.plugin.saveSettings();
            }}
          />
        </SettingItem>
        <ModelsHandler
          sectionId={props.sectionId}
          llmProviderId={props.self.originalId}
          default_values={default_values}
        />
        <ConfigItem
          name="S3 URI"
          description="The S3 URI to use for video generation"
          placeholder="s3://bucket/"
          sectionId={props.sectionId}
          value={config.s3Uri ?? default_values.s3Uri}
          onChange={(v) => {
            config.s3Uri = v;
          }}
        />
        {/* <SettingItem
          key="useConverseApi"
          name="Use Converse API"
 
          sectionId={props.sectionId}
        >
          <Input
            value={"" + config.useConverseApi}
            type="checkbox"
            setValue={async (val) => {
              logger(val);
              config.useConverseApi = val === "true";
              await global?.plugin.saveSettings();
              global?.triggerReload();
            }}
          />
        </SettingItem> */}

        {/* {vars.map((v: string) => (
          <SettingItem
            key={v}
            name={v}
  
            sectionId={props.sectionId}
          >
            <Input
              value={config[v]}
              placeholder={`Enter your ${v}`}
              type={v.toLowerCase().contains("key") ? "password" : "text"}
              setValue={async (value) => {
                config[v] = value;
                global?.triggerReload();
                if (v.toLowerCase().contains("key"))
                  global?.plugin.encryptAllKeys();
                await global?.plugin.saveSettings();
              }}
            />
          </SettingItem>
        ))} */}

        <div className="plug-tg-flex plug-tg-flex-col plug-tg-gap-1">
          <div className="plug-tg-gap-1">
            To use this provider you need to create an AWS profile for the CLI
            called <span className="plug-tg-font-bold">obsidian-bedrock</span>.
          </div>
          <div className="plug-tg-text-md plug-tg-font-medium">
            Useful links
          </div>
          <a href="https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html">
            <SettingItem
              name="AWS CLI configuration"
              className="plug-tg-text-s"
              sectionId={props.sectionId}
            >
              <IconExternalLink />
            </SettingItem>
          </a>
          <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html">
            <SettingItem
              name="What is Amazon Bedrock?"
              className="plug-tg-text-s"
              sectionId={props.sectionId}
            >
              <IconExternalLink />
            </SettingItem>
          </a>
          <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html">
            <SettingItem
              name="Available models"
              className="plug-tg-text-s"
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
