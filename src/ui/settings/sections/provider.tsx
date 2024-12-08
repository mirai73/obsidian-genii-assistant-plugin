import React, { useId } from "react";
import LLMProviderController from "../components/llmProviderController";
import SettingsSection from "../components/section";
import { useToggle } from "usehooks-ts";
import useGlobal from "#/ui/context/global/context";

export default function ProviderSetting() {
  const global = useGlobal();
  const sectionId = useId();
  const [resized, triggerResize] = useToggle();
  if (!global) throw new Error("Global settings not found");
  return (
    <>
      <SettingsSection
        title="LLM Settings"
        className="plug-tg-flex plug-tg-w-full plug-tg-flex-col"
        id={sectionId}
        triggerResize={resized}
        alwaysOpen
      >
        <LLMProviderController
          getSelectedProvider={() =>
            global.plugin.settings.selectedProvider || ""
          }
          setSelectedProvider={(newVal) =>
            (global.plugin.settings.selectedProvider = (newVal as any) || "")
          }
          triggerResize={triggerResize}
        />
      </SettingsSection>
    </>
  );
}
