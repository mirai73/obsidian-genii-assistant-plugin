import React, { useEffect, useId, useState } from "react";
import Dropdown from "./dropdown";
import SettingItem from "./item";
import LLMProviderInterface from "../../../LLMProviders/interface";
import useGlobal from "#/ui/context/global/context";
import Input from "./input";

import { z } from "zod";

export const profileFileSchema = z.object({
  id: z.string(),
  profile: z.object({
    extends: z.string(),
    name: z.string(),
  }),
  config: z.record(z.any()),
});

export default function LLMProviderController(props: {
  setSelectedProvider(p: string): void;
  getSelectedProvider(): string;
  triggerResize(): void;
  /** Minimal, aka just select the llm provider */
  mini?: boolean;
}) {
  const global = useGlobal();
  if (!global) throw new Error("Global settings not found");
  const llmList = global.plugin.geniiAssistant?.LLMRegistry?.getList();
  const sectionId = useId();
  const [selectedLLM, setSelectedLLM] = useState<
    LLMProviderInterface | undefined
  >();

  const [selectedLLMId, setSelectedLLMId] = useState<string | undefined>(
    props.getSelectedProvider()
  );

  const updateLLm = (selectedLLMId: string | undefined) => {
    if (!selectedLLMId) return;

    global.plugin.geniiAssistant?.load();

    const llm = global.plugin.geniiAssistant?.LLMRegistry?.get(selectedLLMId);

    if (llm) {
      props.setSelectedProvider(selectedLLMId as any);
      setSelectedLLM(
        //@ts-ignore
        new llm({
          plugin: global.plugin,
        })
      );
    }

    global.plugin.geniiAssistant?.load();
  };

  const isDefaultProvider = selectedLLM ? !selectedLLM.cloned : false;

  useEffect(() => updateLLm(selectedLLMId), []);

  const selectLLM = (selectedLLMId: string) => {
    setSelectedLLMId(selectedLLMId);
    updateLLm(selectedLLMId);
    global.plugin.saveSettings();
    global.triggerReload();
    props.triggerResize();
  };

  return (
    <>
      <SettingItem
        name={`Provider Profile`}
        description={
          selectedLLM?.cloned
            ? `Based on ${selectedLLM.originalId}`
            : selectedLLMId?.split("(")?.[1]?.split(")")?.[0] || ""
        }
        sectionId={sectionId}
      >
        <Dropdown
          value={selectedLLMId}
          setValue={selectLLM}
          aliases={global.plugin.geniiAssistant?.LLMRegistry?.UnProviderNames}
          values={llmList ?? []}
        />
      </SettingItem>

      {!props.mini && selectedLLM && selectedLLMId && (
        <>
          <div className="plug-tg-flex plug-tg-h-full plug-tg-w-full plug-tg-flex-col plug-tg-gap-2">
            <selectedLLM.RenderSettings
              key={selectedLLMId}
              self={selectedLLM}
              sectionId={sectionId}
            />
          </div>
          {isDefaultProvider ? (
            ""
          ) : (
            <SettingItem
              name="Name"
              description="Change name of the profile"
              className=""
              sectionId={sectionId}
            >
              <Input
                type="text"
                className="plug-tg-input-sm"
                placeholder={
                  global.plugin.geniiAssistant?.LLMRegistry?.UnProviderNames[
                    selectedLLMId
                  ]
                }
                value={
                  global.plugin.geniiAssistant?.LLMRegistry?.UnProviderNames[
                    selectedLLMId
                  ]
                }
                setValue={async (val) => {
                  if (
                    global.plugin.geniiAssistant?.LLMRegistry?.UnProviderNames[
                      selectedLLMId
                    ]
                  ) {
                    global.plugin.settings.LLMProviderProfiles[
                      selectedLLMId
                    ].name = val;

                    await global.plugin.saveSettings();
                    global.triggerReload();
                  }
                }}
              />
            </SettingItem>
          )}
        </>
      )}
    </>
  );
}
