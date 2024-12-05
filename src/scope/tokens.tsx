import debug from "debug";
import cl100k_base from "@dqbd/tiktoken/encoders/cl100k_base.json";
import r50k_base from "@dqbd/tiktoken/encoders/r50k_base.json";
import p50k_base from "@dqbd/tiktoken/encoders/p50k_base.json";
import TextGeneratorPlugin from "src/main";
import wasm from "../../node_modules/@dqbd/tiktoken/tiktoken_bg.wasm";
import { init, Tiktoken } from "@dqbd/tiktoken/lite/init";
import { Notice } from "obsidian";
import React from "react";
import { createRoot } from "react-dom/client";
import { InputContext } from "./context-manager";
const logger = debug("genii:tokens-service");

export default class TokensScope {
  plugin: TextGeneratorPlugin;
  constructor(plugin: TextGeneratorPlugin) {
    this.plugin = plugin;
  }

  async setup() {
    await init((imports) => WebAssembly.instantiate(wasm, imports));

    return this;
  }

  getEncoderFromEncoding(encoding: string) {
    let model: any;
    switch (encoding) {
      case "cl100k_base":
        model = cl100k_base;
        break;
      case "r50k_base":
        model = r50k_base;
        break;
      case "p50k_base":
        model = p50k_base;
        break;
      default:
        break;
    }
    const encoder = new Tiktoken(
      model?.bpe_ranks,
      model?.special_tokens,
      model?.pat_str
    );
    return encoder;
  }

  async estimate(context: InputContext) {
    logger("estimateTokens", context);
    const { options, template } = context;

    const prompt =
      template && !context.context
        ? await template.inputTemplate(options)
        : context.context;

    if (!this.plugin.textGenerator?.reqFormatter) return;
    const { bodyParams } =
      await this.plugin.textGenerator.reqFormatter.getRequestParameters(
        {
          ...this.plugin.settings,
          prompt,
        },
        true,
        ""
      );

    const llmSettings = this.plugin.textGenerator?.LLMProvider?.getSettings();

    const conf = {
      ...this.plugin.settings,
      ...llmSettings,
      ...bodyParams,
    };

    const { tokens, maxTokens } =
      (await this.plugin.textGenerator?.LLMProvider?.calcTokens(
        bodyParams.messages,
        conf
      )) ?? { tokens: 0, maxTokens: 0 };

    const cost = await this.plugin.textGenerator?.LLMProvider?.calcPrice(
      tokens,
      conf
    );

    const result = {
      maxTokens,
      completionTokens: this.plugin.settings.max_tokens,
      tokens,
      cost,
    };

    logger("estimateTokens", result);
    return result;
  }

  showTokens(props: {
    tokens: any;
    maxTokens: number;
    cost?: number;
    completionTokens: number;
  }) {
    logger("showTokens", props);

    const doc = new DocumentFragment();
    const summaryEl = document.createElement("div");
    doc.appendChild(summaryEl);
    summaryEl.classList.add("plug-tg-summary");

    const provider = createRoot(summaryEl);

    provider.render(
      <div className="plug-tg-flow-root">
        <ul
          role="list"
          className="plug-tg-divide-y plug-tg-divide-gray-200 dark:plug-tg-divide-gray-700"
        >
          <li className="plug-tg-py-3 sm:plug-tg-py-4">
            <div className="plug-tg-flex plug-tg-items-center plug-tg-justify-between plug-tg-space-x-4">
              <div>Total tokens</div>
              <div className="plug-tg-inline-flex plug-tg-items-center plug-tg-pr-3 plug-tg-text-base plug-tg-font-semibold plug-tg-text-gray-900 dark:plug-tg-text-white">
                {props.tokens}
              </div>
            </div>
          </li>

          <li className="plug-tg-py-3 sm:plug-tg-py-4">
            <div className="plug-tg-flex plug-tg-items-center plug-tg-justify-between plug-tg-space-x-4">
              <div>Completion tokens</div>
              <div className="plug-tg-inline-flex plug-tg-items-center plug-tg-pr-3 plug-tg-text-base plug-tg-font-semibold plug-tg-text-gray-900 dark:plug-tg-text-white">
                {props.completionTokens}
              </div>
            </div>
          </li>

          <li className="plug-tg-py-3 sm:plug-tg-py-4">
            <div className="plug-tg-flex plug-tg-items-center plug-tg-justify-between plug-tg-space-x-4">
              <div>Max Tokens</div>
              <div className="plug-tg-inline-flex plug-tg-items-center plug-tg-pr-3 plug-tg-text-base plug-tg-font-semibold plug-tg-text-gray-900 dark:plug-tg-text-white">
                {props.maxTokens}
              </div>
            </div>
          </li>

          <li className="plug-tg-py-3 sm:plug-tg-py-4">
            <div className="plug-tg-flex plug-tg-items-center plug-tg-justify-between plug-tg-space-x-4">
              <div>Estimated Price</div>
              <div className="plug-tg-inline-flex plug-tg-items-center plug-tg-pr-3 plug-tg-text-base plug-tg-font-semibold plug-tg-text-gray-900 dark:plug-tg-text-white">
                ${props.cost?.toLocaleString()}
              </div>
            </div>
          </li>
        </ul>
      </div>
    );

    logger("showTokens", { summaryEl });
    logger(summaryEl);
    new Notice(doc, 5000);
  }
}
