import { MessageContent } from "@langchain/core/messages";
import { LlmType } from "./LLMProviders";

interface CommandPaletteEnabledOptions {
  "generate-text": boolean;
  "generate-text-with-metadata": boolean;
  "insert-generated-text-from-template": boolean;
  "create-generated-text-from-template": boolean;
  "insert-text-from-template": boolean;
  "create-text-from-template": boolean;
  "search-results-batch-generate-from-template": boolean;
  "show-modal-from-template": boolean;
  "open-template-as-tool": boolean;
  "set-max-tokens": boolean;
  "set-provider": boolean;
  "set-model": boolean;
  "package-manager": boolean;
  "create-template": boolean;
  //"get-title": boolean;
  "generated-text-to-clipboard-from-template": boolean;
  "calculate-tokens": boolean;
  "calculate-tokens-for-template": boolean;
  "text-extractor-tool": boolean;
  "stop-stream": boolean;
  "custom-instruct": boolean;
  "generate-in-right-click-menu": boolean;
  reload: boolean;
  "open-playground": boolean;
  "batch-generate-in-right-click-files-menu": boolean;
  "tg-block-processor": boolean;
  "disable-ribbon-icons": boolean;
}

type Context = {
  includeClipboard: boolean;
  customInstructEnabled: boolean;
  customInstruct: string;
  contextTemplate: string;
};

export type Version = `${number}.${number}.${number}`;

type GeniiAssistantSettings = {
  allowJavascriptRun?: boolean;
  version: Version;
  endpoint: string;
  api_key: string;
  api_key_encrypted?: Buffer | string;
  encrypt_keys?: boolean;
  max_tokens: number;
  temperature: number;
  frequency_penalty: number;
  promptsPath: string;
  textGenPath: string;
  showStatusBar: boolean;
  displayErrorInEditor: boolean;
  outputToBlockQuote: boolean;
  models: any;
  context: Context;
  requestTimeout: number;
  prefix: string;
  tgSelectionLimiter: string;
  stream: boolean;
  options: CommandPaletteEnabledOptions;
  experiment: boolean;
  advancedOptions?: {
    generateTitleInstruct?: string;
    generateTitleInstructEnabled?: boolean;
    /** EXPERIMENTAL: in supported models, it will include images's base64 in the request  */
    includeAttachmentsInRequest?: boolean;
  };
  autoSuggestOptions: {
    customInstructEnabled: boolean;
    customInstruct: string;
    systemPrompt: string;
    isEnabled: boolean;
    allowInNewLine: boolean;
    delay: number;
    numberOfSuggestions: number;
    triggerPhrase: string;
    stop: string;
    showStatus: boolean;
    customProvider: boolean;
    selectedProvider?: string;
    inlineSuggestions?: boolean;
    overrideTrigger?: string;
    showInMarkdown?: boolean;
  };
  slashSuggestOptions: {
    isEnabled: boolean;
    triggerPhrase: string;
  };
  extractorsOptions: {
    PDFExtractor: boolean;
    WebPageExtractor: boolean;
    YoutubeExtractor: boolean;
    AudioExtractor: boolean;
    ImageExtractorEmbded: boolean;
    ImageExtractor: boolean;
  };

  selectedProvider?: LlmType;
  // TODO: FUTURE IMPLEMENTATION
  // reason: it will clean code, and also help with custom llm providers later on
  LLMProviderProfiles: Record<
    string,
    {
      extends: string;
      name: string;
    }
  >;
  LLMProviderOptions: Record<string, Record<string, any>>;
  LLMProviderOptionsKeysHashed: Record<string, Buffer | string>;
};

type Resource = {
  id: string;
  name: string;
  size: number;
  types: string;
  metadata: Record<string, string>;
  folderName: string;
};

type Subscription = {
  id: string;
  name: string;
  type: string;
};

type GeniiAssistantConfiguration = {
  packagesHash: Record<string, PackageTemplate>;
  installedPackagesHash: Record<string, InstalledPackage>;
  resources: Record<string, Resource>;
  subscriptions: Subscription[];
};

type InstalledPackage = {
  packageId: string;
  version?: string;
  prompts?: PromptTemplate[];
  installedPrompts?: installedPrompts[];
};

type installedPrompts = {
  promptId: string;
  version: string;
};

type PackageTemplate = {
  packageId: string;
  name?: string;
  version?: string;
  minGeniiAssistantVersion?: string;
  description?: string;
  tags?: string;
  author?: string;
  authorUrl?: string;
  repo?: string;
  published_at?: Date;
  downloads?: number;
  installed?: boolean;
  type?: "template" | "feature";
  price?: number;
  core?: boolean;
  desktopOnly?: boolean;
};

type PromptTemplate = {
  promptId: string;
  id: string;
  name?: string;
  path?: string;
  description?: string;
  required_values?: string;
  author?: string;
  tags?: string;
  version?: string;
  context?: any;
};

type FileViewMode = "source" | "preview" | "default";
enum NewTabDirection {
  vertical = "vertical",
  horizontal = "horizontal",
}

type Model = {
  id: string;
};
export type {
  FileViewMode,
  NewTabDirection,
  GeniiAssistantSettings,
  PromptTemplate,
  PackageTemplate,
  Model,
  Context,
  InstalledPackage,
  GeniiAssistantConfiguration,
};

export type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  T extends (...args: any) => Promise<infer R> ? R : any;

type LiteralUnion<T extends U, U = string> = T | (U & { zz_IGNORE_ME?: never });

export type Role = LiteralUnion<
  "assistant" | "user" | "human" | "system" | "admin"
>;

export type Message = {
  role: Role;
  content: MessageContent;
};
