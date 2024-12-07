import LangchainBase from "./base";
import { GooglePaLMChatInput } from "@langchain/community/chat_models/googlepalm";
import React from "react";
import LLMProviderInterface, { LLMConfig } from "../interface";
import { useGlobal, SettingItem, Input } from "../refs";

const id = "Google Palm (Langchain)" as const;
export default class LangchainPalmProvider
  extends LangchainBase
  implements LLMProviderInterface
{
  static provider = "Langchain";
  static id = id;
  static slug = "palm" as const;
  static displayName = "Google Palm";

  mobileSupport = false;
  streamable = false;

  id = LangchainPalmProvider.id;
  provider = LangchainPalmProvider.provider;
  originalId = LangchainPalmProvider.id;
  getConfig(options: LLMConfig): Partial<GooglePaLMChatInput> {
    return this.cleanConfig({
      apiKey: options.api_key,

      // ------------Necessary stuff--------------
      modelKwargs: options.modelKwargs,
      //   modelName: options.model,
      maxTokens: options.max_tokens,
      temperature: options.temperature,
      frequencyPenalty: +options.frequency_penalty || 0,
      presencePenalty: +options.presence_penalty || 0,
      n: options.n,
      stop: options.stop,
      streaming: options.stream,
      maxRetries: 3,
      headers: options.headers || (undefined as any),
    });
  }

  async load() {
    const { ChatGooglePaLM } = await import(
      "@langchain/community/chat_models/googlepalm"
    );
    this.llmClass = ChatGooglePaLM;
  }

  calcPrice(): Promise<number> {
    throw new Error("Method not implemented.");
  }
  //   async getLLM(options: LLMConfig) {
  //     return new ChatGooglePaLM({
  //       ...this.getConfig(options),
  //     });
  //   }

  RenderSettings(props: Parameters<LLMProviderInterface["RenderSettings"]>[0]) {
    const global = useGlobal();

    const id = props.self.id;
    const config = (global.plugin.settings.LLMProviderOptions[id] ??= {});

    return (
      <>
        <SettingItem
          name="Api Key"
          register={props.register}
          sectionId={props.sectionId}
        >
          <Input
            type="password"
            value={config.api_key || ""}
            setValue={async (value) => {
              config.api_key = value;
              global.plugin.encryptAllKeys();
              global.triggerReload();

              await global.plugin.saveSettings();
            }}
          />
        </SettingItem>
        <SettingItem
          name="Base Path"
          register={props.register}
          sectionId={props.sectionId}
        >
          <Input
            type="text"
            value={config.basePath}
            placeholder="Enter your API BasePath"
            setValue={async (value) => {
              config.basePath = value;
              global.triggerReload();

              await global.plugin.saveSettings();
            }}
          />
        </SettingItem>
        <div className="plug-tg-flex plug-tg-flex-col plug-tg-gap-2">
          <div className="plug-tg-text-lg plug-tg-opacity-70">
            Recommended to use Google GenerativeAI instead
          </div>
        </div>
      </>
    );
  }
}
