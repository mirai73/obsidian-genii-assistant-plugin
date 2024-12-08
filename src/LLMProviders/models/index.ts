import type { LLMProviderType } from "..";

export interface ModelType {
  encoding?: string;
  prices: {
    prompt?: number;
    completion?: number;
    image?: number;
    video?: number;
    audio?: number;
  };
  maxTokens: number;
  llm: LLMProviderType[];
  order?: number;
  inputOptions?: ContentOptions;
  outputOptions?: ContentOptions;
}

export interface ContentOptions {
  images?: boolean;
  audio?: boolean;
  videos?: boolean;
  text?: boolean;
}

const AI_MODELS: Record<string, ModelType> = {
  "gpt-4o": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.005,
      completion: 0.005,
    },
    maxTokens: 128000,
    llm: ["OpenAI Chat (Langchain)"],
  },
  "gpt-4": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.03,
      completion: 0.06,
    },
    maxTokens: 8192,
    llm: ["OpenAI Chat (Langchain)"],
  },
  "gpt-4-turbo-preview": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.01,
      completion: 0.03,
    },
    maxTokens: 128000,
    llm: ["OpenAI Chat (Langchain)"],
  },
  "gpt-4-0125-preview": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.01,
      completion: 0.03,
    },
    maxTokens: 128000,
    llm: ["OpenAI Chat (Langchain)"],
  },
  "gpt-4-1106-preview": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.01,
      completion: 0.03,
    },
    maxTokens: 128000,
    llm: ["OpenAI Chat (Langchain)"],
  },
  "gpt-4-1106": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.01,
      completion: 0.03,
    },
    maxTokens: 128000,
    llm: ["OpenAI Chat (Langchain)"],
  },
  "gpt-4-vision-preview": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.01,
      completion: 0.03,
    },
    maxTokens: 128000,
    llm: ["OpenAI Chat (Langchain)"],
  },
  "gpt-4-0314": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.03,
      completion: 0.06,
    },
    maxTokens: 8192,
    llm: ["OpenAI Chat (Langchain)"],
    order: -1,
  },
  "gpt-4-0613": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.03,
      completion: 0.06,
    },
    maxTokens: 8192,
    llm: ["OpenAI Chat (Langchain)"],
    order: -1,
  },
  "gpt-4-32k": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.06,
      completion: 0.12,
    },
    maxTokens: 32768,
    llm: ["OpenAI Chat (Langchain)"],
  },
  "gpt-4-32k-0613": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.06,
      completion: 0.12,
    },
    maxTokens: 32768,
    llm: ["OpenAI Chat (Langchain)"],
    order: -1,
  },
  "gpt-4-32k-0314": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.06,
      completion: 0.12,
    },
    maxTokens: 32768,
    llm: ["OpenAI Chat (Langchain)"],
    order: -1,
  },
  "gpt-3.5-turbo": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.0005,
      completion: 0.0015,
    },
    maxTokens: 4097,
    llm: ["OpenAI Chat (Langchain)"],
  },
  "gpt-3.5-turbo-16k": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.003,
      completion: 0.004,
    },
    maxTokens: 16385,
    llm: ["OpenAI Chat (Langchain)"],
  },
  "gpt-3.5-turbo-16k-0613": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.003,
      completion: 0.004,
    },
    maxTokens: 16385,
    llm: ["OpenAI Chat (Langchain)"],
    order: -1,
  },
  "gpt-3.5-turbo-0301": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.0015,
      completion: 0.002,
    },
    maxTokens: 4097,
    llm: ["OpenAI Chat (Langchain)"],
    order: -1,
  },
  "gpt-3.5-turbo-0613": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.0015,
      completion: 0.002,
    },
    maxTokens: 4097,
    llm: ["OpenAI Chat (Langchain)"],
    order: -1,
  },
  "gpt-3.5-turbo-1106": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.001,
      completion: 0.002,
    },
    maxTokens: 4097,
    llm: ["OpenAI Chat (Langchain)"],
  },
  "gpt-3.5-turbo-0125": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.0005,
      completion: 0.0015,
    },
    maxTokens: 4097,
    llm: ["OpenAI Chat (Langchain)"],
  },
  "gpt-3.5-turbo-instruct": {
    encoding: "cl100k_base",
    prices: {
      prompt: 0.0015,
      completion: 0.002,
    },
    maxTokens: 4097,
    llm: ["OpenAI Instruct (Langchain)"],
  },
  "text-davinci-003": {
    encoding: "p50k_base",
    prices: {
      prompt: 0.02,
      completion: 0.02,
    },
    maxTokens: 4097,
    llm: ["OpenAI Instruct (Langchain)"],
    order: -1,
  },
  "text-davinci-002": {
    encoding: "p50k_base",
    prices: {
      prompt: 0.02,
      completion: 0.02,
    },
    maxTokens: 4097,
    llm: ["OpenAI Instruct (Langchain)"],
    order: -1,
  },
  "text-davinci-001": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.02,
      completion: 0.02,
    },
    maxTokens: 2049,
    llm: ["OpenAI Instruct (Langchain)"],
    order: -1,
  },
  "text-curie-001": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.002,
      completion: 0.002,
    },
    maxTokens: 2049,
    llm: ["OpenAI Instruct (Langchain)"],
    order: -1,
  },
  "text-babbage-001": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0005,
      completion: 0.0005,
    },
    maxTokens: 2049,
    llm: ["OpenAI Instruct (Langchain)"],
    order: -1,
  },
  "text-ada-001": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["OpenAI Instruct (Langchain)"],
    order: -1,
  },
  davinci: {
    encoding: "r50k_base",
    prices: {
      prompt: 0.02,
      completion: 0.02,
    },
    maxTokens: 2049,
    llm: ["OpenAI Instruct (Langchain)"],
    order: -2,
  },
  curie: {
    encoding: "r50k_base",
    prices: {
      prompt: 0.002,
      completion: 0.002,
    },
    maxTokens: 2049,
    llm: ["OpenAI Instruct (Langchain)"],
    order: -2,
  },
  babbage: {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0005,
      completion: 0.0005,
    },
    maxTokens: 2049,
    llm: ["OpenAI Instruct (Langchain)"],
    order: -2,
  },
  ada: {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["OpenAI Instruct (Langchain)"],
    order: -1,
  },

  "gemini-1.5-flash": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.007,
      completion: 0.0105,
    },
    maxTokens: 128000,
    llm: ["Google GenerativeAI (Langchain)"],
    order: -1,
  },

  "gemini-1.5-pro": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.007,
      completion: 0.0105,
    },
    maxTokens: 128000,
    llm: ["Google GenerativeAI (Langchain)"],
    order: -1,
  },

  "models/gemini-pro": {
    encoding: "r50k_base",
    prices: {
      prompt: 0,
      completion: 0,
    },
    maxTokens: 2048,
    llm: ["Google GenerativeAI (Langchain)"],
  },

  "models/gemini-pro-vision": {
    encoding: "r50k_base",
    prices: {
      prompt: 0,
      completion: 0,
    },
    maxTokens: 2048,
    llm: ["Google GenerativeAI (Langchain)"],
    order: -1,
  },

  "mistral-tiny": {
    // @TODO: prices are not correct
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["MistralAI Chat (Langchain)"],
    // order: -1
  },
  "mistral-small": {
    // @TODO: prices are not correct
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["MistralAI Chat (Langchain)"],
    // order: -1
  },
  "mistral-medium": {
    // @TODO: prices are not correct
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["MistralAI Chat (Langchain)"],
    // order: -1
  },
  "amazon.titan-tg1-large": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "amazon.titan-text-premier-v1:0": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "amazon.titan-text-lite-v1": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "amazon.titan-text-express-v1": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "ai21.jamba-instruct-v1:0": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "anthropic.claude-3-sonnet-20240229-v1:0": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "anthropic.claude-3-haiku-20240307-v1:0": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
    inputOptions: { images: true, text: true },
  },
  "anthropic.claude-3-5-sonnet-20240620-v1:0": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
    inputOptions: { images: true, text: true },
  },
  "cohere.command-text-v14": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "cohere.command-r-v1:0": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "cohere.command-r-plus-v1:0": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "cohere.command-light-text-v14": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "meta.llama3-8b-instruct-v1:0": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "meta.llama3-70b-instruct-v1:0": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "mistral.mistral-7b-instruct-v0:2": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "mistral.mixtral-8x7b-instruct-v0:1": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "mistral.mistral-large-2402-v1:0": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "mistral.mistral-small-2402-v1:0": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "stability.stable-diffusion-xl-v1": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "stability.stable-image-core-v1:0": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    outputOptions: { images: true },
    maxTokens: 2049,
    llm: ["bedrock"],
    order: -1,
  },
  "stability.sd3-large-v1:0": {
    encoding: "r50k_base",
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    outputOptions: { images: true },
    llm: ["bedrock"],
    order: -1,
  },
  "stability.stable-image-ultra-v1:0": {
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    outputOptions: { images: true },
    llm: ["bedrock"],
    order: -1,
  },
  "amazon.nova-lite-v1:0": {
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    inputOptions: { text: true, images: true, videos: true },
    llm: ["bedrock"],
    order: -1,
  },
  "amazon.nova-micro-v1:0": {
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    inputOptions: { text: true, images: true, videos: true },
    llm: ["bedrock"],
    order: -1,
  },
  "amazon.nova-pro-v1:0": {
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    inputOptions: { text: true, images: true, videos: true },
    llm: ["bedrock"],
    order: -1,
  },
  "amazon.nova-canvas-v1:0": {
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    inputOptions: { images: true, text: true },
    outputOptions: { images: true },
    llm: ["bedrock"],
    order: -1,
  },
  "amazon.nova-reel-v1:0": {
    prices: {
      prompt: 0.0004,
      completion: 0.0004,
    },
    maxTokens: 2049,
    inputOptions: { text: true, images: true },
    outputOptions: { videos: true },
    llm: ["bedrock"],
    order: -1,
  },
};

export default AI_MODELS;
