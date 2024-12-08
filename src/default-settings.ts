import pkg from "../package.json";
import { GeniiAssistantSettings } from "./types";

const DEFAULT_SETTINGS: GeniiAssistantSettings = {
  version: pkg.version as any,
  endpoint: "https://api.openai.com/v1",
  questionsLRU: [],
  models: [],
  api_key: "",
  encrypt_keys: false,
  selectedProvider: "OpenAI Chat (Langchain)",
  max_tokens: 500,
  temperature: 0.7,
  frequency_penalty: 0.5,
  showStatusBar: true,
  outputToBlockQuote: false,
  allowJavascriptRun: false,
  experiment: false,
  promptsPath: "genii/templates",
  textGenPath: "genii/",
  prefix: "\n\n",
  tgSelectionLimiter: "^\\*\\*\\*",
  stream: true,
  context: {
    customInstructEnabled: true,
    includeClipboard: true,
    customInstruct: `Title: {{title}}

Starred Blocks: {{starredBlocks}}

{{tg_selection}}`,

    contextTemplate: `Title: {{title}}

Starred Blocks: {{starredBlocks}}

{{tg_selection}}`,
  },
  requestTimeout: 300000,
  options: {
    "generate-text": true,
    "generate-text-with-metadata": true,
    "insert-generated-text-from-template": true,
    "create-generated-text-from-template": false,
    "search-results-batch-generate-from-template": true,
    "insert-text-from-template": false,
    "create-text-from-template": false,
    "show-modal-from-template": true,
    "open-template-as-tool": true,
    "open-playground": true,
    "set-max-tokens": true,
    "set-provider": true,
    "set-model": true,
    "package-manager": true,
    "create-template": false,
    "inline-chat": true,
    "generated-text-to-clipboard-from-template": false,
    "calculate-tokens": true,
    "calculate-tokens-for-template": true,
    "text-extractor-tool": true,
    "stop-stream": true,
    "custom-instruct": true,
    "generate-in-right-click-menu": false,
    "batch-generate-in-right-click-files-menu": true,
    "tg-block-processor": true,
    reload: true,
    "disable-ribbon-icons": false,
  },

  advancedOptions: {
    generateTitleInstructEnabled: false,
    generateTitleInstruct: `Generate a title for the current document (do not use * " \\ / < > : | ? .):
{{substring content 0 255}}`,

    includeAttachmentsInRequest: false,
  },

  autoSuggestOptions: {
    customInstructEnabled: true,
    customInstruct: `Continue the following text:
Title: {{title}}
{{query}}`,
    systemPrompt: "",
    isEnabled: false,
    allowInNewLine: false,
    delay: 300,
    numberOfSuggestions: 5,
    triggerPhrase: "  ",
    stop: ".",
    showStatus: true,
    customProvider: false,
    inlineSuggestions: false,
    overrideTrigger: " ",
  },

  slashSuggestOptions: {
    isEnabled: false,
    triggerPhrase: "/",
  },

  extractorsOptions: {
    PDFExtractor: true,
    WebPageExtractor: true,
    YoutubeExtractor: true,
    AudioExtractor: false,
    ImageExtractorEmbded: true,
    ImageExtractor: true,
  },
  displayErrorInEditor: false,
  LLMProviderProfiles: {},
  LLMProviderOptions: {},
  LLMProviderOptionsKeysHashed: {},
};

export default DEFAULT_SETTINGS;
