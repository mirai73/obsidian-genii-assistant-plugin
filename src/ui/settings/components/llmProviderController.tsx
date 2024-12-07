import React, { useEffect, useId, useState } from "react";
import type { Register } from "../sections";
import Dropdown from "./dropdown";
import SettingItem from "./item";
import LLMProviderInterface from "../../../LLMProviders/interface";
import useGlobal from "../../context/global";
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
  register: Register;
  setSelectedProvider(p: string): void;
  getSelectedProvider(): string;
  triggerResize(): void;
  /** Minimal, aka just select the llm provider */
  mini?: boolean;
}) {
  const global = useGlobal();
  const llmList = global.plugin.textGenerator?.LLMRegistry?.getList();
  const sectionId = useId();
  const [selectedLLM, setSelectedLLM] = useState<
    LLMProviderInterface | undefined
  >();

  const [selectedLLMId, setSelectedLLMId] = useState<string | undefined>(
    props.getSelectedProvider()
  );

  const updateLLm = (selectedLLMId: string | undefined) => {
    if (!selectedLLMId) return;

    global.plugin.textGenerator?.load();

    const llm = global.plugin.textGenerator?.LLMRegistry?.get(selectedLLMId);

    if (llm) {
      props.setSelectedProvider(selectedLLMId as any);
      setSelectedLLM(
        //@ts-ignore
        new llm({
          plugin: global.plugin,
        })
      );
    }

    global.plugin.textGenerator?.load();
  };

  const isDefaultProvider = selectedLLM ? !selectedLLM.cloned : false;

  useEffect(() => updateLLm(selectedLLMId), []);

  const selectLLM = (selectedLLMId: string) => {
    setSelectedLLMId(selectedLLMId);
    updateLLm(selectedLLMId);
    global.plugin.saveSettings();
    if (global.triggerReload) global.triggerReload();
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
        register={props.register}
        sectionId={sectionId}
      >
        <Dropdown
          value={selectedLLMId}
          setValue={selectLLM}
          aliases={global.plugin.textGenerator?.LLMRegistry?.UnProviderNames}
          values={llmList ?? []}
        />
      </SettingItem>

      {!props.mini && selectedLLM && selectedLLMId && (
        <>
          <div className="plug-tg-flex plug-tg-h-full plug-tg-w-full plug-tg-flex-col plug-tg-gap-2">
            <selectedLLM.RenderSettings
              key={selectedLLMId}
              register={props.register}
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
              register={props.register}
              className=""
              sectionId={sectionId}
            >
              <Input
                type="text"
                className="plug-tg-input-sm"
                placeholder={
                  global.plugin.textGenerator?.LLMRegistry?.UnProviderNames[
                    selectedLLMId
                  ]
                }
                value={
                  global.plugin.textGenerator?.LLMRegistry?.UnProviderNames[
                    selectedLLMId
                  ]
                }
                setValue={async (val) => {
                  if (
                    global.plugin.textGenerator?.LLMRegistry?.UnProviderNames[
                      selectedLLMId
                    ]
                  ) {
                    global.plugin.settings.LLMProviderProfiles[
                      selectedLLMId
                    ].name = val;

                    await global.plugin.saveSettings();
                    if (global.triggerReload) global.triggerReload();
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
