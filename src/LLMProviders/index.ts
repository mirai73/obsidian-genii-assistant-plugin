import AnthropicCustomProvider from "./custom/anthropic";
import LangchainOpenAIChatProvider from "./langchain/openaiChat";
import LangchainMistralAIChatProvider from "./langchain/mistralaiChat";
import LangchainOpenAIInstructProvider from "./langchain/openaiInstruct";
import LangchainHFProvider from "./langchain/hf";
import ChatAnthropicLangchainProvider from "./langchain/chatanthropic";
import OllamaLangchainProvider from "./langchain/ollama";
import LangchainChatGoogleGenerativeAIProvider from "./langchain/googleGenerativeAI";
import BedrockProvider from "./custom/bedrock";

export const defaultProviders = [
  LangchainOpenAIChatProvider,
  LangchainOpenAIInstructProvider,
  LangchainChatGoogleGenerativeAIProvider,
  OllamaLangchainProvider,
  LangchainHFProvider,
  LangchainMistralAIChatProvider,
  ChatAnthropicLangchainProvider,
  AnthropicCustomProvider,
  BedrockProvider,
  //CustomProvider,
];

export type LlmType = (typeof defaultProviders)[number]["id"];
export type LlmSlugType = (typeof defaultProviders)[number]["slug"];
export type LLMProviderType = LlmType;

export const defaultProvidersMap: Record<
  any,
  (typeof defaultProviders)[number]
> = {} as any;

for (const llm of defaultProviders) {
  defaultProvidersMap[llm.id] = llm;
}
