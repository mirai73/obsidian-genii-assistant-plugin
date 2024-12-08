import React, { useEffect, useId } from "react";
import useGlobal from "#/ui/context/global/context";
import SettingItem from "../components/item";
import SettingsSection from "../components/section";
import Input from "../components/input";

import LLMProviderController from "../components/llmProviderController";
import { useToggle } from "usehooks-ts";
import AvailableVars from "#/ui/components/availableVars";
import { ContextVariables } from "#/scope/context-manager";
import { useReloader } from "../components/reloadPlugin";
import { ConfigItem } from "../components/configItem";

export default function AutoSuggestSetting() {
  const [setReloader] = useReloader();

  const global = useGlobal();
  const sectionId = useId();
  const [resized, triggerResize] = useToggle();
  if (!global) throw new Error("Global settings not found");
  useEffect(() => {
    global.plugin.settings.autoSuggestOptions = {
      ...global.plugin.defaultSettings.autoSuggestOptions,
      ...global.plugin.settings.autoSuggestOptions,
    };
  }, []);

  return (
    <SettingsSection
      title="Auto-Suggest Options"
      className="plug-tg-flex plug-tg-w-full plug-tg-flex-col"
      triggerResize={resized}
      id={sectionId}
    >
      <ConfigItem
        name="Enable/Disable"
        description="Enable or disable auto-suggest."
        sectionId={sectionId}
        value={global.plugin.settings.autoSuggestOptions.isEnabled}
        onChange={(v) => {
          global.plugin.settings.autoSuggestOptions.isEnabled = v as boolean;
          global.plugin.autoSuggest?.renderStatusBar();
          setReloader(true);
        }}
      />

      {!!global.plugin.settings.autoSuggestOptions.isEnabled && (
        <>
          <ConfigItem
            name="Inline Suggestions"
            description="Shows the suggestions text in the editor (EXPERIMENTAL)"
            sectionId={sectionId}
            value={
              global.plugin.settings.autoSuggestOptions.inlineSuggestions ??
              false
            }
            onChange={(v) => {
              global.plugin.settings.autoSuggestOptions.inlineSuggestions =
                v as boolean;
              setReloader(true);
            }}
          />

          {!!global.plugin.settings.autoSuggestOptions.inlineSuggestions && (
            <ConfigItem
              name="Show In Markdown"
              description="Shows the suggestions text compiled as markdown, may shows weird spaces at the begining and end (EXPERIMENTAL)"
              sectionId={sectionId}
              value={
                global.plugin.settings.autoSuggestOptions.showInMarkdown ??
                false
              }
              onChange={(v) => {
                global.plugin.settings.autoSuggestOptions.showInMarkdown =
                  v as boolean;
                setReloader(true);
              }}
            />
          )}
          <ConfigItem
            name="Trigger Phrase"
            description="Trigger Phrase (default: *double space*)"
            sectionId={sectionId}
            value={global.plugin.settings.autoSuggestOptions.triggerPhrase}
            onChange={(v) => {
              global.plugin.settings.autoSuggestOptions.triggerPhrase =
                v as string;
            }}
          />

          <ConfigItem
            name="Override Trigger"
            description="Overrides the trigger when suggestion is accepted (default: *single space*)"
            sectionId={sectionId}
            value={
              global.plugin.settings.autoSuggestOptions.overrideTrigger ?? ""
            }
            onChange={(v) => {
              global.plugin.settings.autoSuggestOptions.overrideTrigger =
                v as string;
            }}
          />
          <ConfigItem
            name="Delay milliseconds for trigger"
            sectionId={sectionId}
            value={global.plugin.settings.autoSuggestOptions.delay}
            onChange={(v) => {
              global.plugin.settings.autoSuggestOptions.delay = v as number;
            }}
          />

          {/* <SettingItem
            name="Delay milliseconds for trigger"
            sectionId={sectionId}
          >
            <input
              type="range"
              className="plug-tg-tooltip"
              min={0}
              max={2000}
              data-tip={global.plugin.settings.autoSuggestOptions.delay + "ms"}
              value={global.plugin.settings.autoSuggestOptions.delay}
              onChange={async (e) => {
                global.plugin.settings.autoSuggestOptions.delay = parseInt(
                  e.target.value
                );
                await global.plugin.saveSettings();
                global.triggerReload();
              }}
            />
          </SettingItem> */}

          <ConfigItem
            name="Number of Suggestions"
            description="Enter the number of suggestions to generate. Please note that increasing this value may significantly increase the cost of usage with GPT-3."
            sectionId={sectionId}
            value={
              global.plugin.settings.autoSuggestOptions.numberOfSuggestions
            }
            onChange={(v) => {
              global.plugin.settings.autoSuggestOptions.numberOfSuggestions =
                v as number;
            }}
          />
          <ConfigItem
            name="Stop Phrase"
            description="Enter the stop phrase to use for generating auto-suggestions. The generation will stop when the stop phrase is found. (Use a space for words, a period for sentences, and a newline for paragraphs.)"
            sectionId={sectionId}
            value={global.plugin.settings.autoSuggestOptions.stop}
            onChange={(v) => {
              global.plugin.settings.autoSuggestOptions.stop = v as string;
            }}
          />
          <ConfigItem
            name="Allow Suggest in new Line"
            description="This will allow it to run at the beggining of a new line"
            sectionId={sectionId}
            value={
              global.plugin.settings.autoSuggestOptions.allowInNewLine ?? false
            }
            onChange={(v) => {
              global.plugin.settings.autoSuggestOptions.allowInNewLine =
                v as boolean;
              global.plugin.autoSuggest?.renderStatusBar();
            }}
          />

          <ConfigItem
            name="Show/Hide Auto-suggest status in Status Bar"
            sectionId={sectionId}
            value={
              global.plugin.settings.autoSuggestOptions.showStatus ?? false
            }
            onChange={(v) => {
              global.plugin.settings.autoSuggestOptions.showStatus =
                v as boolean;
              global.plugin.autoSuggest?.renderStatusBar();
              setReloader(true);
            }}
          />
          <ConfigItem
            name="Custom auto-suggest Prompt"
            description={"You can customize auto-suggest prompt"}
            sectionId={sectionId}
            value={
              global.plugin.settings.autoSuggestOptions.customInstructEnabled
            }
            onChange={(v) => {
              global.plugin.settings.autoSuggestOptions.customInstructEnabled =
                v as boolean;
              setReloader(true);
            }}
          />

          {global.plugin.settings.autoSuggestOptions.customInstructEnabled && (
            <>
              <SettingItem name="" sectionId={sectionId} textArea>
                <textarea
                  placeholder="Textarea will autosize to fit the content"
                  className="plug-tg-input plug-tg-h-fit plug-tg-w-full plug-tg-resize-y plug-tg-bg-[var(--background-modifier-form-field)] plug-tg-outline-none"
                  value={
                    global.plugin.settings.autoSuggestOptions.customInstruct ||
                    global.plugin.defaultSettings.autoSuggestOptions
                      .customInstruct
                  }
                  onChange={async (e) => {
                    global.plugin.settings.autoSuggestOptions.customInstruct =
                      e.target.value;
                    global.triggerReload();
                    await global.plugin.saveSettings();
                  }}
                  spellCheck={false}
                  rows={10}
                />
              </SettingItem>
              <AvailableVars
                vars={{
                  ...ContextVariables,
                  query: {
                    example: "{{query}}",
                    hint: "query text that triggered auto-suggest",
                  },
                }}
              />
            </>
          )}

          {global.plugin.settings.autoSuggestOptions.customInstructEnabled && (
            <>
              <SettingItem name="" sectionId={sectionId} textArea>
                <textarea
                  placeholder="Textarea will autosize to fit the content"
                  className="plug-tg-input plug-tg-h-fit plug-tg-w-full plug-tg-resize-y plug-tg-bg-[var(--background-modifier-form-field)] plug-tg-outline-none"
                  value={
                    global.plugin.settings.autoSuggestOptions.systemPrompt ||
                    global.plugin.defaultSettings.autoSuggestOptions
                      .systemPrompt
                  }
                  onChange={async (e) => {
                    global.plugin.settings.autoSuggestOptions.systemPrompt =
                      e.target.value;
                    global.triggerReload();
                    await global.plugin.saveSettings();
                  }}
                  spellCheck={false}
                  rows={10}
                />
              </SettingItem>
              <AvailableVars
                vars={{
                  ...ContextVariables,
                  query: {
                    example: "{{query}}",
                    hint: "query text that triggered auto-suggest",
                  },
                }}
              />
            </>
          )}
          <ConfigItem
            name="Custom Provider"
            description={`Use a different LLM provider than the one you're generating with.
              
Make sure to setup the llm provider in the LLM Settings, before use.`}
            sectionId={sectionId}
            value={
              global.plugin.settings.autoSuggestOptions.customProvider ?? false
            }
            onChange={(v) => {
              global.plugin.settings.autoSuggestOptions.customProvider =
                v as boolean;
              global.plugin.autoSuggest?.renderStatusBar();
              setReloader(true);
            }}
          />

          {!!global.plugin.settings.autoSuggestOptions.customProvider && (
            <LLMProviderController
              getSelectedProvider={() =>
                global.plugin.settings.autoSuggestOptions.selectedProvider || ""
              }
              setSelectedProvider={(newVal) =>
                (global.plugin.settings.autoSuggestOptions.selectedProvider =
                  (newVal as any) || "")
              }
              triggerResize={triggerResize}
              mini
            />
          )}
        </>
      )}
    </SettingsSection>
  );
}
