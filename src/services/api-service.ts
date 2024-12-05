// import { TemplateModalUI } from "../ui/template-modal-ui";
// import { App, Notice, Editor, RequestUrlParam, EditorPosition } from "obsidian";
import TextGeneratorPlugin from "../main";
import ReqFormatter from "../utils/api-request-formatter";
import type { InputContext } from "../scope/context-manager";
import debug from "debug";
import { Message, TextGeneratorSettings } from "../types";
import { Handlebars } from "../helpers/handlebars-helpers";
import { Platform } from "obsidian";
import LLMProviderInterface from "../LLMProviders/interface";
import LLMProviderRegistry from "../LLMProviders/registry";
import { defaultProvidersMap } from "../LLMProviders";
import providerOptionsValidator from "../LLMProviders/providerOptionsValidator";
import { ProxyService } from "./proxy-service";
const logger = debug("genii:TextGenerator");

export default class RequestHandler {
  plugin: TextGeneratorPlugin;
  reqFormatter: ReqFormatter;
  signalController?: AbortController;

  LLMProvider?: LLMProviderInterface;
  LLMRegistry?: LLMProviderRegistry<LLMProviderInterface>;

  proxyService: ProxyService;

  constructor(plugin: TextGeneratorPlugin) {
    this.plugin = plugin;
    this.reqFormatter = new ReqFormatter(
      plugin.app,
      plugin,
      this.plugin.contextManager
    );

    this.proxyService = new ProxyService();
    this.load();
  }

  async unload() {
    this.signalController?.abort();
    await this.proxyService?.stop();
  }

  async load() {
    try {
      await this.loadLLMRegistry();
      await this.loadLLM();
    } catch (err: any) {
      this.plugin.handelError(err);
    }
  }

  async loadLLMRegistry() {
    // default llm Providers;
    const llmProviders: Record<any, any> = { ...defaultProvidersMap };

    // get Custom ones and merge them with the default ones
    for (const llmId in this.plugin.settings.LLMProviderProfiles) {
      if (!this.plugin.settings.LLMProviderProfiles.hasOwnProperty(llmId)) {
        const llm = this.plugin.settings.LLMProviderProfiles[llmId];
        const parent = defaultProvidersMap[llm.extends as any];

        if (!parent) continue;

        class Clone extends parent {
          static provider = parent.provider;

          static id = llmId;
          static slug = llm.name;

          cloned = true;
          static cloned = true;
          static displayName = llm.name;

          id = Clone.id;
          provider = Clone.provider;
        }

        llmProviders[llmId] = Clone;
      }
    }

    this.LLMRegistry = new LLMProviderRegistry(llmProviders);
    await this.LLMRegistry.load();
  }

  async addLLMCloneInRegistry(props: {
    /** id */
    id: string;
    /** name */
    name: string;
    /** from where it extends from (default Provider) */
    extends: string;
    extendsDataFrom?: string;
  }) {
    this.plugin.settings.LLMProviderProfiles ??= {};

    this.plugin.settings.LLMProviderProfiles[props.id] = {
      extends: props.extends,
      name: props.name,
    };

    this.plugin.settings.LLMProviderOptions[props.id] = {
      ...this.plugin.settings.LLMProviderOptions[
        props.extendsDataFrom || props.extends
      ],
    };

    await this.plugin.saveSettings();
    await this.loadLLMRegistry();
  }

  async deleteLLMCloneFromRegistry(id: string) {
    delete this.plugin.settings.LLMProviderProfiles[id];
    delete this.plugin.settings.LLMProviderOptions[id];
    await this.plugin.saveSettings();
    await this.loadLLMRegistry();
  }

  async loadLLM(name: string = this.plugin.settings.selectedProvider ?? "") {
    const llmList = this.LLMRegistry?.getList();

    if (!llmList?.length) {
      throw new Error("No LLM providers found");
    }
    const llm =
      this.LLMRegistry?.get(name) || this.LLMRegistry?.get(llmList[0]);

    if (llm && llm.id !== this.LLMProvider?.id) {
      if (Platform.isMobile && !llm.mobileSupport)
        throw new Error(
          `Mobile is not supported for the "${llm?.id}" LLM provider`
        );

      // @ts-ignore
      const instance = new llm({
        plugin: this.plugin,
      });

      await instance.load();

      this.LLMProvider = instance;
    }
    return this.LLMProvider;
  }

  async gen(
    prompt: string,
    settings: Partial<typeof this.plugin.settings> = {}
  ) {
    logger("gen ", {
      prompt,
      pluginSettings: this.plugin.settings,
      settings,
    });

    const newPrompt: Message["content"] = await Handlebars.compile(
      this.plugin.contextManager?.overProcessTemplate(prompt)
    )({
      ...settings,
      templatePath: "default/default",
    });

    try {
      const { reqParams, bodyParams, provider, allParams } =
        await this.reqFormatter.getRequestParameters(
          {
            ...this.LLMProvider?.getSettings(),
            ...settings,
            // @ts-ignore
            prompt: newPrompt,
          },
          false
        );

      if (!this.LLMProvider?.provider) {
        throw new Error("No LLM provider selected");
      }
      await providerOptionsValidator(
        this.LLMProvider.provider,
        provider.providerOptions
      );

      const result = provider.providerOptions.estimatingMode
        ? bodyParams.messages.map((m) => m.content).join(",")
        : provider.providerOptions.disableProvider
          ? ""
          : await this.LLMProvider?.generate(
              bodyParams.messages,
              {
                ...allParams,
                ...bodyParams,
                requestParams: {
                  // body: JSON.stringify(bodyParams),
                  ...reqParams,
                  signal: this.signalController?.signal,
                },
                otherOptions:
                  this.plugin.settings.LLMProviderOptions[this.LLMProvider.id],
                stream: false,
                llmPredict:
                  bodyParams.messages?.length === 1 &&
                  !this.plugin.settings.advancedOptions
                    ?.includeAttachmentsInRequest,
              },
              undefined,
              provider.providerOptions
            );

      // Remove leading/trailing newlines
      //   result = result.trim();

      // output template, template used AFTER the generation happens

      return result;
    } catch (error) {
      logger("gen  error", error);
      throw error;
    }
  }

  async streamGenerate(
    context: InputContext,
    insertMetadata = false,
    params: Partial<TextGeneratorSettings> = {},
    templatePath = "",
    additionalParams: {
      showSpinner?: boolean;
      /** when using custom signal, it will not use text generator processing, loading or throw an error when 2 generations */
      signal?: AbortSignal;
      reqParams?: RequestInit | undefined;
      bodyParams?: any;
    } = {
      showSpinner: true,
      signal: undefined,
    }
  ) {
    try {
      console.log("calling stream generate");
      logger("generate", {
        context,
        insertMetadata,
        params,
        templatePath,
        additionalParams,
      });

      if (this.plugin.processing && !additionalParams.signal) {
        logger("streamGenerate error", "There is another generation process");
        throw new Error("There is another generation process");
      }

      const { options, template } = context;

      const prompt = (
        typeof template !== "undefined" && !context.context
          ? template.inputTemplate(options)
          : context.context
      ) as string;

      const { reqParams, bodyParams, provider, allParams } =
        await this.reqFormatter.getRequestParameters(
          {
            ...context.options,
            ...params,
            prompt,
          },
          insertMetadata,
          templatePath,
          additionalParams
        );

      if (!this.LLMProvider?.provider) {
        throw new Error("No LLM provider selected");
      }
      await providerOptionsValidator(
        this.LLMProvider?.provider,
        provider.providerOptions
      );

      if (!additionalParams.signal)
        this.startLoading(additionalParams.showSpinner);

      if (!this.LLMProvider?.streamable) {
        logger("streamGenerate error", "LLM not streamable");
        throw new Error("LLM not streamable");
      }

      // const stream = await this.streamRequest(reqParams);
      const stream = async (
        onToken: Parameters<typeof this.LLMProvider.generate>[2],
        onError?: (error: any) => void
      ): Promise<string | undefined> => {
        try {
          const innerContext = {
            ...allParams,
            ...bodyParams,
            requestParams: {
              // body: JSON.stringify(bodyParams),
              ...reqParams,
              signal: additionalParams.signal || this.signalController?.signal,
            },
            otherOptions: this.LLMProvider?.getSettings(),
            streaming: true,
            llmPredict:
              bodyParams.messages?.length === 1 &&
              !this.plugin.settings.advancedOptions
                ?.includeAttachmentsInRequest,
          };

          const k =
            provider.providerOptions.estimatingMode ||
            provider.providerOptions.disableProvider
              ? ""
              : await this.LLMProvider?.generate(
                  bodyParams.messages,
                  innerContext,
                  onToken,
                  provider.providerOptions
                );

          // output template, template used AFTER the generation happens

          const t = provider.providerOptions.output?.length
            ? await Handlebars.compile(
                provider.providerOptions.output.replaceAll("\\n", "\n"),
                {
                  noEscape: true,
                }
              )
            : await template?.outputTemplate;

          delete innerContext.LLMProviderOptions;
          delete innerContext.LLMProviderOptionsKeysHashed;
          delete innerContext.LLMProviderProfiles;

          return (
            t?.({
              requestResults: k,
              ...options,
              output: k,
              inputContext: innerContext,
            }) || k
          );
        } catch (err: any) {
          onError?.(err);
          return err.message;
        }
      };

      logger("streamGenerate end", {
        stream,
      });

      return stream;
    } catch (error) {
      logger("streamGenerate error", error);
      throw error;
    }
  }

  async batchGenerate(
    context: InputContext[],
    insertMetadata = false,
    params: Partial<typeof this.plugin.settings> = this.plugin.settings,
    templatePath = "",
    additionalParams = {
      showSpinner: true,
      insertMode: false,
    },
    onOneFinishes?: (content: string, index: number) => void
  ) {
    try {
      logger("chain", {
        context,
        insertMetadata,
        params,
        templatePath,
        additionalParams,
      });

      if (this.plugin.processing) {
        logger("generate error", "There is another generation process");
        throw new Error("There is another generation process");
      }

      this.startLoading();

      const batches = await Promise.all(
        context.map(async (ctx) => {
          return this.reqFormatter.getRequestParameters(
            {
              ...ctx.options,
              ...params,
              prompt:
                typeof ctx.template !== "undefined" && !ctx.context
                  ? await ctx.template.inputTemplate(ctx.options)
                  : ctx.context,
            },
            insertMetadata,
            templatePath
          );
        })
      );

      logger(batches[0]);

      if (batches[0].provider.providerOptions.disableProvider)
        return await Promise.all(
          batches.map(async (b, i) => {
            const conf = {
              ...context[i].options,
              output: "",
              requestResults: "",
              inputContext: { ...b.allParams },
            };

            delete conf.inputContext.LLMProviderOptions;
            delete conf.inputContext.LLMProviderOptionsKeysHashed;
            delete conf.inputContext.LLMProviderProfiles;

            onOneFinishes?.(
              (await context[0].template?.outputTemplate?.(conf)) || "",
              i
            );
          })
        );
      else if (!this.LLMProvider) {
        throw new Error("No LLM provider selected");
      }
      return await this.LLMProvider.generateBatch(
        batches.map((batch) => {
          if (!this.LLMProvider) {
            throw new Error("No LLM provider selected");
          }
          return {
            messages: batch.bodyParams.messages,
            reqParams: {
              ...batch.allParams,
              ...batch.bodyParams,
              requestParams: {
                // body: JSON.stringify(bodyParams),
                ...batch.reqParams,
                signal: this.signalController?.signal,
              },
              otherOptions:
                this.plugin.settings.LLMProviderOptions[this.LLMProvider.id],
              stream: false,
              llmPredict: batch.bodyParams.messages?.length === 1,
            },
          };
        }),

        onOneFinishes
      );
    } catch (err: unknown) {
      this.endLoading();
      this.plugin.handelError(err);
    } finally {
      this.endLoading();
    }
  }

  async generate(
    context: InputContext,
    insertMetadata = false,
    params: Partial<
      typeof this.plugin.settings & { disableProvider: boolean }
    > = this.plugin.settings,
    templatePath = "",
    // @TODO: fix this types
    additionalParams: any = {
      showSpinner: true,
      insertMode: false,
      doNotCheckProcess: false,
    }
  ) {
    try {
      console.log("calling generate");
      logger("generate", {
        context,
        insertMetadata,
        params,
        templatePath,
        additionalParams: additionalParams,
      });

      const { options, template } = context;

      if (!additionalParams.doNotCheckProcess && this.plugin.processing) {
        logger("generate error", "There is another generation process");
        throw new Error("There is another generation process");
      }

      const prompt = (
        typeof template !== "undefined" && !context.context?.trim()
          ? await template.inputTemplate(options)
          : context.context
      ) as string;

      const { reqParams, bodyParams, provider, allParams } =
        await this.reqFormatter.getRequestParameters(
          {
            ...context.options,
            ...params,
            prompt,
          },
          insertMetadata,
          templatePath
        );

      if (!this.LLMProvider?.provider) {
        throw new Error("No LLM provider selected");
      }

      await providerOptionsValidator(
        this.LLMProvider?.provider,
        provider.providerOptions
      );

      this.startLoading(additionalParams?.showSpinner);

      const innerContext = {
        ...allParams,
        ...bodyParams,
        requestParams: {
          ...reqParams,
          signal: this.signalController?.signal,
        },
        otherOptions:
          this.plugin.settings.LLMProviderOptions[this.LLMProvider?.id],
        stream: false,
        llmPredict:
          bodyParams.messages?.length === 1 &&
          !this.plugin.settings.advancedOptions?.includeAttachmentsInRequest,
      };

      let result =
        provider.providerOptions.estimatingMode ||
        provider.providerOptions.disableProvider
          ? ""
          : await this.LLMProvider?.generate(
              bodyParams.messages,
              innerContext,
              undefined,
              provider.providerOptions
            );

      // output template, template used AFTER the generation happens

      const conf = {
        ...options,
        output: result,
        requestResults: result,
        inputContext: innerContext,
      };

      delete conf.inputContext.LLMProviderOptions;
      delete conf.inputContext.LLMProviderOptionsKeysHashed;
      delete conf.inputContext.LLMProviderProfiles;

      result = provider.providerOptions.output
        ? await Handlebars.compile(
            provider.providerOptions.output.replaceAll("\\n", "\n"),
            {
              noEscape: true,
            }
          )(conf)
        : result;

      const res = await template?.outputTemplate?.({
        ...conf,
        output: result,
      });

      result = res || result;

      logger("generate end", {
        result,
      });

      return result;
    } catch (error) {
      logger("generate error", error);
      throw error;
    } finally {
      this.endLoading(additionalParams?.showSpinner);
    }
  }

  protected startLoading(showSpinner?: boolean) {
    this.signalController = new AbortController();
    this.plugin.startProcessing(showSpinner);
  }

  endLoading(showSpinner?: boolean) {
    this.signalController?.abort();
    this.signalController = undefined;
    this.plugin.endProcessing(showSpinner);
  }
}
