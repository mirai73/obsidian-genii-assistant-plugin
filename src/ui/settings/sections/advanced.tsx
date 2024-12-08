import React, { useId } from "react";
import useGlobal from "#/ui/context/global/context";
import SettingItem from "../components/item";
import SettingsSection from "../components/section";
import Input from "../components/input";
import Confirm from "#/ui/components/confirm";
import { ConfigItem } from "../components/configItem";

export default function AdvancedSetting() {
  const global = useGlobal();
  if (!global) throw new Error("Global settings not found");

  const sectionId = useId();

  const reloadPlugin = () => global.plugin.reload();

  const resetSettings = async () => {
    if (
      !(await Confirm(
        "Are you sure, you want to Reset all your settings,\n this action will delete all your configuration to their default state"
      ))
    )
      return;

    await global.plugin.resetSettingsToDefault();
    await reloadPlugin();
  };

  return (
    <SettingsSection
      title="Advanced Settings"
      className="plug-tg-flex plug-tg-w-full plug-tg-flex-col"
      id={sectionId}
    >
      <ConfigItem
        name="Streaming"
        description="Enable streaming if supported by the provider"
        sectionId={sectionId}
        value={global.plugin.settings.stream ?? false}
        onChange={(v) => {
          global.plugin.settings.stream = v as boolean;
        }}
      />
      <ConfigItem
        name="Display errors in the editor"
        description="If you want to see the errors in the editor"
        sectionId={sectionId}
        value={global.plugin.settings.displayErrorInEditor ?? false}
        onChange={(v) => {
          global.plugin.settings.displayErrorInEditor = v as boolean;
        }}
      />

      <ConfigItem
        name="Show Status in StatusBar"
        description="Show information in the Status Bar"
        sectionId={sectionId}
        value={global.plugin.settings.showStatusBar ?? false}
        onChange={async (v) => {
          global.plugin.settings.showStatusBar = v as boolean;
        }}
      />

      <ConfigItem
        name="Output generated text to blockquote"
        description="Distinguish between AI generated text and typed text using a blockquote"
        sectionId={sectionId}
        value={global.plugin.settings.outputToBlockQuote ?? false}
        onChange={async (v) => {
          global.plugin.settings.outputToBlockQuote = v as boolean;
        }}
      />
      <ConfigItem
        name="Experimentation Features"
        description="This adds experiment features, which might not be stable yet"
        sectionId={sectionId}
        value={global.plugin.settings.experiment ?? false}
        onChange={async (v) => {
          global.plugin.settings.experiment = v as boolean;
        }}
      />
      <ConfigItem
        name="Include Attachments"
        description="EXPERIMENTAL: adds the images that are referenced in the request, IT MIGHT CONSUME ALOT OF TOKENS"
        sectionId={sectionId}
        value={
          global.plugin.settings.advancedOptions?.includeAttachmentsInRequest ??
          false
        }
        onChange={async (v) => {
          if (!global.plugin.settings.advancedOptions)
            global.plugin.settings.advancedOptions = {};
          global.plugin.settings.advancedOptions.includeAttachmentsInRequest =
            v as boolean;
        }}
      />
      <ConfigItem
        name="Templates Path"
        description="Path for Templates directory"
        sectionId={sectionId}
        value={global.plugin.settings.promptsPath}
        onChange={async (v) => {
          global.plugin.settings.promptsPath = v as string;
        }}
      />
      <ConfigItem
        name="Work Path"
        description="Path work path for Backups and logs"
        sectionId={sectionId}
        value={global.plugin.settings.textGenPath}
        onChange={async (v) => {
          global.plugin.settings.textGenPath = v as string;
        }}
      />
      <SettingItem
        name="Resets all settings to default"
        description="It will delete all your configurations"
        sectionId={sectionId}
      >
        <button className="plug-tg-btn-danger" onClick={resetSettings}>
          Reset
        </button>
      </SettingItem>
      <SettingItem
        name="Keys encryption"
        description="Enable encrypting keys, this could cause incompatibility with mobile devices"
        sectionId={sectionId}
      >
        <Input
          type="checkbox"
          value={"" + global.plugin.settings.encrypt_keys}
          setValue={async (val) => {
            try {
              global.plugin.settings.encrypt_keys = val === "true";
              await global.plugin.encryptAllKeys();
              await global.plugin.saveSettings();
              global.triggerReload();
            } catch (err: any) {
              global.plugin.handelError(err);
            }
          }}
        />
      </SettingItem>
    </SettingsSection>
  );
}
