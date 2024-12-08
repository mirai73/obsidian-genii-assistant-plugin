import React, { useEffect, useId } from "react";
import useGlobal from "#/ui/context/global/context";
import SettingItem from "../components/item";
import SettingsSection from "../components/section";
import Input from "../components/input";

import { useToggle } from "usehooks-ts";
import { useReloader } from "../components/reloadPlugin";
import { ConfigItem } from "../components/configItem";

export default function SlashSuggestSetting() {
  const [setReloader] = useReloader();

  const global = useGlobal();
  const sectionId = useId();
  const [resized] = useToggle();
  if (!global) throw new Error("Global settings not found");
  useEffect(() => {
    global.plugin.settings.slashSuggestOptions = {
      ...global.plugin.defaultSettings.slashSuggestOptions,
      ...global.plugin.settings.slashSuggestOptions,
    };
  }, []);

  return (
    <SettingsSection
      title="Slash-Suggest Options"
      className="plug-tg-flex plug-tg-w-full plug-tg-flex-col"
      triggerResize={resized}
      id={sectionId}
    >
      <ConfigItem
        sectionId={sectionId}
        name="Slash suggestion"
        description="Enable or disable slash-suggest."
        value={global.plugin.settings.slashSuggestOptions.isEnabled}
        onChange={(v) => {
          global.plugin.settings.slashSuggestOptions.isEnabled = v as boolean;
          global.plugin.autoSuggest?.renderStatusBar();
          setReloader(true);
        }}
      />

      {!!global.plugin.settings.slashSuggestOptions.isEnabled && (
        <>
          <ConfigItem
            name="Trigger Phrase"
            description="Trigger Phrase (default: */*)"
            sectionId={sectionId}
            placeholder="Trigger Phrase"
            value={global.plugin.settings.slashSuggestOptions.triggerPhrase}
            onChange={(v) => {
              global.plugin.settings.slashSuggestOptions.triggerPhrase =
                v as string;
            }}
          />
        </>
      )}
    </SettingsSection>
  );
}
