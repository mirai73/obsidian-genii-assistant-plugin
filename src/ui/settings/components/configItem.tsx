import useGlobal from "#/ui/context/global/context";
import React from "react";
import SettingItem from "./item";
import Input from "./input";

export const ConfigItem = ({
  sectionId,
  placeholder,
  value,
  name,
  description,
  onChange,
}: {
  name: string;
  description?: string;
  sectionId: string;
  placeholder?: string;
  value: boolean | string | number;
  onChange: (v: boolean | string | number) => void;
}) => {
  const global = useGlobal();

  return (
    <SettingItem name={name} description={description} sectionId={sectionId}>
      <Input
        type={
          typeof value === "string"
            ? "text"
            : typeof value === "number"
              ? "number"
              : "checkbox"
        }
        placeholder={placeholder ?? name}
        value={typeof value === "string" ? value : "" + value}
        setValue={async (val) => {
          onChange(
            typeof value === "string"
              ? val
              : typeof value === "number"
                ? parseInt(val)
                : val === "true"
          );
          await global?.plugin.saveSettings();
          global?.triggerReload();
        }}
      />
    </SettingItem>
  );
};
