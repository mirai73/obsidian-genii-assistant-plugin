import React, { useId, useMemo } from "react";
import useGlobal from "../../context/global";
import { useReloader } from "../components/reloadPlugin";
import SettingItem from "../components/item";
import SettingsSection from "../components/section";
import Input from "../components/input";
import type { Register } from ".";
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

export default function OptionsSetting(props: { register: Register }) {
  const [setReloader] = useReloader();

  const global = useGlobal();
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
        register={props.register}
        id={sectionId}
      >
        {ops.map((key) => {
          const moreData = extendedInfo[key];
          return (
            <SettingItem
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
              register={props.register}
              sectionId={sectionId}
            >
              <Input
                type="checkbox"
                value={
                  "" +
                  global.plugin.settings.options[
                    key as keyof typeof global.plugin.settings.options
                  ]
                }
                setValue={async (val) => {
                  global.plugin.settings.options[
                    key as keyof typeof global.plugin.settings.options
                  ] = val === "true";

                  // new Notice(
                  //   `${key} is ${
                  //     global.plugin.settings.options[
                  //       key as keyof typeof global.plugin.settings.options
                  //     ]
                  //       ? "enabled"
                  //       : "disabled"
                  //   }.`
                  // );

                  document.querySelector(".tg-opts")?.scrollIntoView();
                  setReloader(true);
                  await global.plugin.saveSettings();
                  global.triggerReload();
                }}
              />
            </SettingItem>
          );
        })}
      </SettingsSection>
    </>
  );
}
