import React, { useId } from "react";
import useGlobal from "#/ui/context/global/context";
import SettingItem from "../components/item";
import SettingsSection from "../components/section";
import Input from "../components/input";

import { Context } from "#/types";
import AvailableVars from "#/ui/components/availableVars";
import { ContextVariables } from "#/scope/context-manager";
import { ConfigItem } from "../components/configItem";

const extendedInfo: Record<
  string,
  {
    description: string;
    name?: string;
  }
> = {
  includeTitle: {
    description:
      "Include the title of the active document in the considered context.",
  },
  starredBlocks: {
    description: "Include starred blocks in the considered context.",
  },

  includeFrontmatter: {
    description: "Include frontmatter",
  },

  includeHeadings: {
    description: "Include headings with their content.",
  },

  includeChildren: {
    description: "Include the content of internal md links on the page.",
  },

  includeMentions: {
    description: "Include paragraphs from mentions (linked, unlinked).",
  },

  includeHighlights: {
    description: "Include Obsidian Highlights.",
  },

  includeExtractions: {
    description: "Include Extracted Information",
  },

  includeClipboard: {
    description: "Make clipboard available for templates",
  },
};

export default function ConsideredContextSetting() {
  const global = useGlobal();
  const sectionId = useId();
  if (!global) throw new Error("Global settings not found");
  return (
    <>
      <SettingsSection
        title="Custom Instructions"
        className="plug-tg-flex plug-tg-w-full plug-tg-flex-col"
        id={sectionId}
      >
        <SettingItem
          name="Custom default generation prompt"
          description={"You can customize {{context}} variable"}
          sectionId={sectionId}
        >
          <Input
            type="checkbox"
            value={"" + global.plugin.settings.context.customInstructEnabled}
            setValue={async (val) => {
              global.plugin.settings.context.customInstructEnabled =
                val === "true";
              await global.plugin.saveSettings();
              global.triggerReload();
            }}
          />
        </SettingItem>
        {global.plugin.settings.context.customInstructEnabled && (
          <>
            <SettingItem name="" description="" sectionId={sectionId} textArea>
              <textarea
                placeholder="Textarea will autosize to fit the content"
                className="plug-tg-input plug-tg-h-fit plug-tg-w-full plug-tg-resize-y plug-tg-bg-[var(--background-modifier-form-field)] plug-tg-outline-none"
                value={
                  global.plugin.settings.context.customInstruct ||
                  global.plugin.defaultSettings.context.customInstruct
                }
                onChange={async (e) => {
                  global.plugin.settings.context.customInstruct =
                    e.target.value;
                  global.triggerReload();
                  await global.plugin.saveSettings();
                }}
                spellCheck={false}
                rows={10}
              />
            </SettingItem>
            <AvailableVars vars={ContextVariables} />
          </>
        )}
        <ConfigItem
          name="Enable generate title instruct"
          description={"You can customize generate title prompt"}
          sectionId={sectionId}
          value={
            global.plugin.settings.advancedOptions
              ?.generateTitleInstructEnabled ?? false
          }
          onChange={(v) => {
            if (!global.plugin.settings.advancedOptions)
              global.plugin.settings.advancedOptions = {
                generateTitleInstructEnabled: v as boolean,
              };

            global.plugin.settings.advancedOptions.generateTitleInstructEnabled =
              v as boolean;
          }}
        />
        {global.plugin.settings.advancedOptions
          ?.generateTitleInstructEnabled && (
          <>
            <SettingItem name="" description="" sectionId={sectionId} textArea>
              <textarea
                placeholder="Textarea will autosize to fit the content"
                className="plug-tg-input plug-tg-h-fit plug-tg-w-full plug-tg-resize-y plug-tg-bg-[var(--background-modifier-form-field)] plug-tg-outline-none"
                value={
                  global.plugin.settings.advancedOptions
                    ?.generateTitleInstruct ||
                  global.plugin.defaultSettings.advancedOptions
                    ?.generateTitleInstruct
                }
                onChange={async (e) => {
                  if (!global.plugin.settings.advancedOptions)
                    global.plugin.settings.advancedOptions = {
                      generateTitleInstructEnabled: true,
                      generateTitleInstruct: e.target.value,
                    };

                  global.plugin.settings.advancedOptions.generateTitleInstruct =
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
                  example: "{{content255}}",
                  hint: "first 255 letters of trimmed content of the note",
                },
              }}
            />
          </>
        )}
        <ConfigItem
          name="Selection Limiter(regex)"
          description="tg_selection stopping character. Empty means disabled. Default: ^\*\*\*"
          sectionId={sectionId}
          value={global.plugin.settings.tgSelectionLimiter || ""}
          onChange={async (val) => {
            global.plugin.settings.tgSelectionLimiter = val as string;
          }}
        />
      </SettingsSection>

      <SettingsSection
        title="Template Settings"
        className="plug-tg-flex plug-tg-w-full plug-tg-flex-col"
        id={sectionId}
      >
        <SettingItem
          name="{{context}} Variable Template"
          description="Template for {{context}} variable"
          sectionId={sectionId}
          textArea
        >
          <textarea
            placeholder="Textarea will autosize to fit the content"
            className="plug-tg-input plug-tg-h-fit plug-tg-w-full plug-tg-resize-y plug-tg-bg-[var(--background-modifier-form-field)] plug-tg-outline-none"
            value={
              global.plugin.settings.context.contextTemplate ||
              global.plugin.defaultSettings.context.contextTemplate
            }
            onChange={async (e) => {
              global.plugin.settings.context.contextTemplate = e.target.value;
              global.triggerReload();
              await global.plugin.saveSettings();
            }}
            spellCheck={false}
            rows={10}
          />
        </SettingItem>
        <AvailableVars vars={ContextVariables} />

        {(["includeClipboard"] as (keyof Context)[])
          //   .filter((d) => !contextNotForTemplate.contains(d as any))
          .map((key: any) => {
            const moreData = extendedInfo[key];
            return (
              <ConfigItem
                key={moreData?.name || key}
                name={moreData?.name || key}
                description={
                  moreData?.description ||
                  `Include ${key} in the considered context.`
                }
                sectionId={sectionId}
                value={
                  global.plugin.settings.context[
                    key as keyof typeof global.plugin.settings.context
                  ] ?? false
                }
                onChange={(v) => {
                  global.plugin.settings.context[
                    key as keyof typeof global.plugin.settings.context
                  ] = v as boolean;
                }}
              />
            );
          })}

        <ConfigItem
          name="Allow scripts"
          description="Only enable this if you trust the authors of the templates, or know what you're doing."
          sectionId={sectionId}
          value={global.plugin.settings.allowJavascriptRun ?? false}
          onChange={(v) => {
            global.plugin.settings.allowJavascriptRun = v as boolean;
          }}
        />
      </SettingsSection>
    </>
  );
}
