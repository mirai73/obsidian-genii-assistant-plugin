export default async function providerOptionsValidator(
  provider: string,
  config: any
) {
  if (config?.chain?.type && provider !== "Langchain")
    throw new Error(
      "Chaining only allowed in Langchain providers, remove `chainType` from Template or note properties"
    );
}
