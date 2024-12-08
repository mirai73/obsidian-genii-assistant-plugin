import React from "react";
import LangchainBase from "./base";

import LLMProviderInterface, { LLMConfig } from "../interface";
import { IconExternalLink } from "@tabler/icons-react";
import { HeaderEditor, ModelsHandler } from "../utils";
import debug from "debug";

import { AI_MODELS, Input, Message, SettingItem, useGlobal } from "../refs";

const logger = debug("genii:llmProvider:openaiChat");

const default_values = {
  basePath: "https://api.openai.com/v1",
};

export default class LangchainOpenAIChatProvider
  extends LangchainBase
  implements LLMProviderInterface
{
  /** for models to know what provider is that, for example if this class is being extended. and the id changes. */

  static provider = "Langchain";
  static id = "OpenAI Chat (Langchain)" as const;
  static slug = "openAIChat" as const;
  static displayName = "OpenAI Chat";

  id = LangchainOpenAIChatProvider.id;
  provider = LangchainOpenAIChatProvider.provider;
  originalId = LangchainOpenAIChatProvider.id;
  async load() {
    const { ChatOpenAI } = await import("@langchain/openai");
    this.llmClass = ChatOpenAI;
  }

  RenderSettings(props: Parameters<LLMProviderInterface["RenderSettings"]>[0]) {
    const global = useGlobal();
    if (!global) throw new Error("Global settings not found");

    const id = props.self.id;
    const config = (global.plugin.settings.LLMProviderOptions[id] ??= {
      ...default_values,
    });

    return (
      <React.Fragment key={id}>
        <SettingItem name="API Key" sectionId={props.sectionId}>
          <Input
            type="password"
            value={config.api_key || ""}
            setValue={async (value) => {
              if (props.self.originalId === id)
                global.plugin.settings.api_key = value;
              config.api_key = value;

              global.triggerReload();
              global.plugin.encryptAllKeys();

              await global.plugin.saveSettings();
            }}
          />
        </SettingItem>
        <SettingItem
          name="Base Path"
          description={`Make sure it supports CORS`}
          sectionId={props.sectionId}
        >
          <Input
            type="text"
            value={config.basePath || default_values.basePath}
            placeholder="Enter your API Base Path"
            setValue={async (value) => {
              config.basePath = value || default_values.basePath;
              global.plugin.settings.endpoint =
                value || default_values.basePath;
              global.triggerReload();

              await global.plugin.saveSettings();
            }}
          />
        </SettingItem>

        <ModelsHandler
          sectionId={props.sectionId}
          llmProviderId={props.self.originalId || id}
          default_values={default_values}
          config={config}
        />

        <HeaderEditor
          enabled={!!config.headers}
          setEnabled={async (value) => {
            if (!value) config.headers = undefined;
            else config.headers = "{}";
            global.triggerReload();
            await global.plugin.saveSettings();
          }}
          headers={config.headers}
          setHeaders={async (value) => {
            config.headers = value;
            global.triggerReload();
            await global.plugin.saveSettings();
          }}
        />

        <div className="plug-tg-flex plug-tg-flex-col plug-tg-gap-2">
          <div className="plug-tg-text-lg plug-tg-opacity-70">Useful links</div>
          <a href="https://beta.openai.com/signup/">
            <SettingItem
              name="Create account OpenAI"
              className="plug-tg-text-xs plug-tg-opacity-50 hover:plug-tg-opacity-100"
              sectionId={props.sectionId}
            >
              <IconExternalLink />
            </SettingItem>
          </a>
          <a href="https://beta.openai.com/docs/api-reference/introduction">
            <SettingItem
              name="API documentation"
              className="plug-tg-text-xs plug-tg-opacity-50 hover:plug-tg-opacity-100"
              sectionId={props.sectionId}
            >
              <IconExternalLink />
            </SettingItem>
          </a>
          <a href="https://discord.com/channels/1083485983879741572/1159894948636799126">
            <SettingItem
              name="You can use LM Studio"
              className="plug-tg-text-xs plug-tg-opacity-50 hover:plug-tg-opacity-100"
              sectionId={props.sectionId}
            >
              <IconExternalLink />
            </SettingItem>
          </a>
          <a href="https://beta.openai.com/docs/models/overview">
            <SettingItem
              name="more information"
              className="plug-tg-text-xs plug-tg-opacity-50 hover:plug-tg-opacity-100"
              sectionId={props.sectionId}
            >
              <IconExternalLink />
            </SettingItem>
          </a>
        </div>
      </React.Fragment>
    );
  }

  async calcPrice(
    tokens: number,
    reqParams: Partial<LLMConfig>
  ): Promise<number> {
    const model = reqParams.model;
    const modelInfo =
      AI_MODELS[model as keyof typeof AI_MODELS] || AI_MODELS["gpt-3.5-turbo"];

    if (
      !modelInfo ||
      !modelInfo.prices ||
      !modelInfo.prices.prompt ||
      !modelInfo.prices.completion
    )
      throw new Error("Price info not found");
    console.log(reqParams.max_tokens, modelInfo.prices.completion);
    return (
      (tokens * modelInfo.prices.prompt +
        (reqParams.max_tokens || 100) * modelInfo.prices.completion) /
      1000
    );
  }

  async calcTokens(
    messages: Message[],
    reqParams: Partial<LLMConfig>
  ): ReturnType<LLMProviderInterface["calcTokens"]> {
    const model = reqParams.model;
    const modelInfo =
      AI_MODELS[model as keyof typeof AI_MODELS] || AI_MODELS["gpt-3.5-turbo"];

    if (!modelInfo || !modelInfo.encoding)
      return {
        tokens: 0,
        maxTokens: 0,
      };

    const encoder = this.plugin.tokensScope?.getEncoderFromEncoding(
      modelInfo.encoding
    );
    if (!encoder) {
      logger("No encoder for", modelInfo.encoding);
      return {
        tokens: 0,
        maxTokens: 0,
      };
    }

    let tokensPerMessage, tokensPerName;
    if (model && ["gpt-3.5-turbo", "gpt-3.5-turbo-0301"].includes(model)) {
      tokensPerMessage = 4;
      tokensPerName = -1;
    } else if (model && ["gpt-4", "gpt-4-0314"].includes(model)) {
      tokensPerMessage = 3;
      tokensPerName = 1;
    } else {
      tokensPerMessage = 3;
      tokensPerName = 1;
    }

    let numTokens = 0;
    // for (const message of messages) {
    //   numTokens += tokensPerMessage;
    //   for (const [key, value] of Object.entries(message)) {
    //     numTokens += encoder.encode(value).length;
    //     if (key === "name") {
    //       numTokens += tokensPerName;
    //     }
    //   }
    // }

    numTokens += 3; // every reply is primed with assistant

    return {
      tokens: numTokens,
      maxTokens: modelInfo.maxTokens,
    };
  }
}
