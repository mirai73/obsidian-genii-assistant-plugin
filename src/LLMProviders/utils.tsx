import { IconScreenshot, IconVideo, IconWaveSine } from "@tabler/icons-react";

import React, { useState, useEffect } from "react";
import LLMProviderInterface from "./interface";
import JSON5 from "json5";
import { currentDate } from "#/utils";

import { AI_MODELS, Dropdown, Input, SettingItem, useGlobal } from "./refs";
import { arrayBufferToBase64 } from "obsidian";
import { default_values } from "./custom/custom";
import { LLMProviderType } from "#/lib/types";

export function ModelsHandler(props: {
  register: Parameters<LLMProviderInterface["RenderSettings"]>[0]["register"];
  sectionId: Parameters<LLMProviderInterface["RenderSettings"]>[0]["sectionId"];
  default_values: any;
  llmProviderId: string;
  config?: any;
}) {
  const default_values = props.default_values;
  const id = props.llmProviderId;

  const global = useGlobal();
  const [models, setModels] = useState<string[]>([]);

  const config =
    props.config ||
    (global.plugin.settings.LLMProviderOptions[id] ??= {
      ...default_values,
    });

  useEffect(() => {
    Object.entries(AI_MODELS).forEach(
      ([e, o]) => o.llm.contains(id as LLMProviderType) && models.push(e)
    );

    setModels(
      [...new Set(models)]
        .sort()
        .sort(
          (m1: keyof typeof AI_MODELS, m2: keyof typeof AI_MODELS) =>
            (AI_MODELS[m2]?.order || 0) - (AI_MODELS[m1]?.order || 0)
        )
    );
  }, []);

  const modelName = ("" + config.model) as string;
  const model =
    AI_MODELS[modelName.toLowerCase()] ||
    AI_MODELS["models" + modelName.toLowerCase()];

  const supportedInputs = Object.keys(model?.inputOptions || {}).filter(
    (e) => !!e
  );
  return (
    <>
      <SettingItem
        name="Model"
        register={props.register}
        sectionId={props.sectionId}
      >
        <div className="plug-tg-flex plug-tg-flex-col">
          <Dropdown
            value={config.model}
            setValue={async (selectedModel) => {
              config.model = selectedModel;
              await global.plugin.saveSettings();
              if (global.triggerReload) global.triggerReload();
            }}
            values={models}
          />

          {!!supportedInputs.length && (
            <div className="plug-tg-flex plug-tg-items-center plug-tg-gap-2">
              {model?.inputOptions?.images && <IconScreenshot size={16} />}
              {model?.inputOptions?.audio && <IconWaveSine size={16} />}
              {model?.inputOptions?.videos && <IconVideo size={16} />}
            </div>
          )}
        </div>
      </SettingItem>
    </>
  );
}

export const saveExport = (data: any, name: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${name}_${currentDate()}.json`;
  link.href = url;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  T extends (...args: any) => Promise<infer R> ? R : any;

export function cleanConfig<T>(options: T): T {
  const cleanedOptions: any = {}; // Create a new object to store the cleaned properties

  for (const key in options) {
    if (Object.prototype.hasOwnProperty.call(options, key)) {
      const value = options[key];

      // Check if the value is not an empty string
      if (value != undefined && (typeof value !== "string" || value !== "")) {
        cleanedOptions[key] = value; // Copy non-empty properties to the cleaned object
      }
    }
  }

  return cleanedOptions;
}

export function convertArrayBufferToBase64Link(
  arrayBuffer: ArrayBuffer,
  type: string
) {
  // Convert the number array to a Base64 string using btoa and String.fromCharCode
  const base64String = arrayBufferToBase64(arrayBuffer);

  // Format as a data URL
  return `data:${type || ""};base64,${base64String}`;
}

export function HeaderEditor({
  headers,
  setHeaders,
  enabled,
  setEnabled,
}: {
  headers?: string;
  setHeaders: (headers: string) => void;
  enabled?: boolean;
  setEnabled: (enabled: boolean) => void;
}) {
  const [error, setError] = useState<string>();

  const validateAndSetHeaders = (value: string) => {
    try {
      if (!value) {
        setHeaders("");
        setError(undefined);
        return;
      }

      // Try parsing as JSON to validate
      const parsed = JSON5.parse(value) as Record<string, unknown>;

      // Verify it's an object
      if (
        typeof parsed !== "object" ||
        Array.isArray(parsed) ||
        parsed === null
      ) {
        throw new Error("Headers must be a JSON object");
      }

      // Verify all values are strings
      for (const val of Object.values(parsed)) {
        if (typeof val !== "string") {
          throw new Error("Header values must be strings");
        }
      }

      setHeaders(value);
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  return (
    <div className="plug-tg-flex plug-tg-flex-col plug-tg-gap-1">
      <SettingItem
        name="Enable Custom Headers"
        register={undefined}
        sectionId={undefined}
      >
        <Input
          type="checkbox"
          value={enabled ? "true" : "false"}
          placeholder="Enable Custom Headers"
          setValue={async (value) => {
            setEnabled(value == "true");
          }}
        />
      </SettingItem>

      {enabled && (
        <>
          <textarea
            placeholder="Headers"
            className="plug-tg-w-full plug-tg-resize-none"
            defaultValue={headers}
            onChange={async (e) => {
              validateAndSetHeaders(e.target.value);

              const compiled = await Handlebars.compile(headers)({
                ...cleanConfig(default_values), // TODO: check this out
                n: 1,
              });

              console.log("------ PREVIEW OF HEADER ------\n", compiled);
              setError(undefined);
              try {
                console.log(
                  "------ PREVIEW OF HEADER COMPILED ------\n",
                  JSON5.parse(compiled)
                );
              } catch (err: any) {
                setError(err.message || err);
                console.warn(err);
              }
            }}
            spellCheck={false}
            rows={5}
          />
          <div className="plug-tg-text-red-300">{error}</div>
        </>
      )}
    </div>
  );
}
