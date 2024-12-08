import React, { useId, useMemo } from "react";
import useGlobal from "#/ui/context/global/context";
import SettingsSection from "../components/section";
import { ConfigItem } from "../components/configItem";

// object storing custom name/description of items
const extendedInfo: Record<
  string,
  {
    description?: string;
    name?: string;
  }
> = {
  "modal-suggest": {
    name: "modal-suggest",
    description: "Slash suggestions",
  },
};

export default function OptionsSetting() {
  const global = useGlobal();
  if (!global) throw new Error("Global settings not found");

  const sectionId = useId();
  const ops = useMemo(
    () => Object.keys(global.plugin.defaultSettings.options),
    []
  );

  return (
    <>
      <SettingsSection
        title="Command Palette options"
        className="plug-tg-flex plug-tg-w-full plug-tg-flex-col"
        id={sectionId}
      >
        {ops.map((key) => {
          const moreData = extendedInfo[key];
          return (
            <ConfigItem
              key={key}
              name={moreData?.name || key}
              description={
                moreData?.description ||
                global.plugin.commands?.commands.find(
                  (c) =>
                    c.id === `obsidian-textgenerator-plugin:${key}` ||
                    c.id === key
                )?.name ||
                key
              }
              sectionId={sectionId}
              value={
                global.plugin.settings.options[
                  key as keyof typeof global.plugin.settings.options
                ] ?? false
              }
              onChange={(v) => {
                global.plugin.settings.options[
                  key as keyof typeof global.plugin.settings.options
                ] = v as boolean;

                document.querySelector(".tg-opts")?.scrollIntoView();
              }}
            />
          );
        })}
      </SettingsSection>
    </>
  );
}
