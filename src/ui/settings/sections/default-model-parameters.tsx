import React, { useEffect, useId } from "react";
import useGlobal from "#/ui/context/global/context";
import SettingItem from "../components/item";
import SettingsSection from "../components/section";
import Input from "../components/input";

import { z } from "zod";
import { useDebounceValue } from "usehooks-ts";

const MaxTokensSchema = z.number().min(0);
const TemperatureSchema = z.number().min(0).max(2);
const TimeoutSchema = z.number().min(0);

export default function DMPSetting() {
  const global = useGlobal();
  const sectionId = useId();
  if (!global) throw new Error("Global settings not found");
  const [debouncedMaxTokens] = useDebounceValue(
    global.plugin.settings.max_tokens,
    400
  );

  useEffect(() => {
    global.plugin.updateStatusBar("");
  }, [debouncedMaxTokens]);

  return (
    <SettingsSection
      title="Model parameters"
      className="plug-tg-flex plug-tg-w-full plug-tg-flex-col"
      id={sectionId}
    >
      You can override and specify more parameters in the Frontmatter YAML of
      the templates
      <SettingItem
        name="Max tokens"
        description="The maximum number of tokens to generate in the chat completion. The total length of input tokens and generated tokens is limited by the model's context length. (1000 tokens ~ 750 words)"
        sectionId={sectionId}
      >
        <Input
          type="number"
          value={global.plugin.settings.max_tokens}
          placeholder="max_tokens"
          validator={MaxTokensSchema}
          setValue={async (val) => {
            // @ts-ignore
            global.plugin.settings.max_tokens = parseInt(val) || val;
            await global.plugin.saveSettings();
            global.triggerReload();
          }}
        />
      </SettingItem>
      <SettingItem
        name="Temperature"
        description="What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic."
        sectionId={sectionId}
      >
        <Input
          type="number"
          value={global.plugin.settings.temperature}
          placeholder="temperature"
          validator={TemperatureSchema}
          setValue={async (val) => {
            // @ts-ignore
            global.plugin.settings.temperature = parseFloat(val) || val;
            await global.plugin.saveSettings();
            global.triggerReload();
          }}
        />
      </SettingItem>
      <SettingItem
        name="Timeout"
        description="Timeout in milliseconds. If the request takes longer than the timeout, the request will be aborted. (default: 5000ms)"
        sectionId={sectionId}
      >
        <Input
          type="number"
          placeholder="Timeout"
          value={global.plugin.settings.requestTimeout}
          validator={TimeoutSchema}
          setValue={async (val) => {
            // @ts-ignore
            global.plugin.settings.requestTimeout = parseInt(val) || val;
            await global.plugin.saveSettings();
            global.triggerReload();
          }}
        />
      </SettingItem>
      <SettingItem
        name="Prefix"
        description="Prefix to add to the beginning of the completion (default: '\n\n')"
        sectionId={sectionId}
      >
        <Input
          type="text"
          value={
            "" +
            global.plugin.settings.prefix?.replaceAll(
              `
`,
              "\\n"
            )
          }
          placeholder="Prefix"
          setValue={async (val) => {
            global.plugin.settings.prefix = val.replaceAll(
              "\\n",
              `
`
            );
            await global.plugin.saveSettings();
            global.triggerReload();
          }}
        />
      </SettingItem>
    </SettingsSection>
  );
}
