import { LlmSlugType, LlmType } from ".";

export default class LLMProviderRegistry<
  T extends { slug?: any; id: any; displayName?: string },
> {
  // private plugins: Map<string, T> = new Map();
  private plugins: Record<string, T> = {};

  ProviderSlugs: Partial<Record<LlmSlugType, LlmType>> = {};
  UnProviderSlugs: Record<string, LlmSlugType> = {};
  ProviderSlugsList: LlmSlugType[] = [];
  UnProviderNames: Record<string, LlmSlugType> = {};
  constructor(plugins: Record<string, T> = {}) {
    // for (const provider in plugins) {
    //     if (Object.prototype.hasOwnProperty.call(plugins, provider)) {
    //         const element = plugins[provider as keyof typeof plugins];
    //         this.register(provider, element as unknown as T)
    //     }
    // }
    this.plugins = plugins;
  }

  load() {
    /** to get llm from slug */
    this.ProviderSlugs = {};
    /** to get llm slug */
    this.UnProviderSlugs = {};

    this.ProviderSlugsList = [];

    this.UnProviderNames = {};

    for (const id in this.plugins) {
      if (this.plugins.hasOwnProperty(id)) {
        const pvrd = this.plugins[id];
        if (pvrd.slug) {
          this.ProviderSlugs[pvrd.slug as keyof typeof this.ProviderSlugs] =
            pvrd.id;
          this.UnProviderSlugs[pvrd.id] = pvrd.slug;
          this.ProviderSlugsList.push(pvrd.slug);
        }
        this.UnProviderNames[pvrd.id] = pvrd.displayName as LlmSlugType;
      }
    }
  }

  register(name: string, plugin: T) {
    // this.plugins.set(name, plugin);
    this.plugins[name] = plugin;
  }

  getList() {
    return Object.keys(this.plugins);
  }

  get(name: string): T | undefined {
    // return this.plugins.get(name);
    return (
      this.plugins[
        this.ProviderSlugs[name as keyof typeof this.ProviderSlugs] as any
      ] || this.plugins[name]
    );
  }
}
