import LLMProviderRegistry from "#/LLMProviders/registry";
import GeniiAssistantPlugin from "../main";

export default class PluginAPIService {
  constructor(private plugin: GeniiAssistantPlugin) {
    this.plugin = plugin;
  }

  /** get settings
   *
   * @returns settings
   */
  async getSettings() {
    return this.plugin.settings;
  }

  /** generate text
   *
   * @param prompt prompt to generate text
   * @param settings settings to generate text
   * @returns generated text
   */
  async gen(
    prompt: string,
    settings: Partial<typeof this.plugin.settings> = {}
  ) {
    return this.plugin.geniiAssistant?.gen(prompt, settings);
  }

  /** get metadata of a note
   *
   * @param path path of the note
   * @returns metadata of the note
   */
  getMetadata(path: string) {
    return this.plugin.contextManager?.getMetaData(path);
  }

  /** get childrens of a note
   *
   * @param path path of the note
   * @returns childrens of the note
   */
  async getChildrensOf(path: string) {
    const meta = this.getMetadata(path);
    if (!meta) return [];
    return await this.plugin.contextManager?.getChildrenContent(meta);
  }

  /** get list of providers
   *
   * @returns list of providers
   */
  async getListOfProviders(): Promise<
    keyof typeof LLMProviderRegistry.ProviderSlugs
  > {
    if (!this.plugin.geniiAssistant || !this.plugin.geniiAssistant.LLMRegistry)
      return [] as any;
    return Object.keys(
      this.plugin.geniiAssistant.LLMRegistry.ProviderSlugs
    ) as any;
  }

  /** get provider's options */
  async getProvidersOptions(slug: string) {
    const reg = this.plugin.geniiAssistant?.LLMRegistry;
    return this.plugin.settings.LLMProviderOptions[
      reg?.ProviderSlugs[slug as keyof typeof reg.ProviderSlugs] || slug
    ];
  }

  /** selects and loads a provider */
  async selectProvider(slug: string): Promise<void> {
    const slugs = this.plugin.geniiAssistant?.LLMRegistry?.ProviderSlugs;
    if (!slugs) throw new Error("No LLM provider found");
    const id = slugs[slug as keyof typeof slugs] || slug;
    if (!id) throw new Error(`provider ${slug} doesn't exist`);

    this.plugin.settings.selectedProvider = id as any;

    await this.plugin.saveSettings();
    this.plugin.geniiAssistant?.loadLLM(id);
  }
}
