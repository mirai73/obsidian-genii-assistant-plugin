import React, { useId } from "react";
import useGlobal from "#/ui/context/global/context";
import SettingItem from "../components/item";
import SettingsSection from "../components/section";
import Input from "../components/input";
import { useMemo } from "react";
import { ConfigItem } from "../components/configItem";

const contextNotForTemplate = ["includeTitle", "starredBlocks"];

const extendedInfo: Record<
  string,
  {
    description?: string;
    name?: string;
  }
> = {
  PDFExtractor: {
    name: "PDF Extractor",
    description: "Enable or disable PDF extractor.",
  },

  WebPageExtractor: {
    name: "Web Page Extractor",
    description: "Enable or disable web page extractor.",
  },

  AudioExtractor: {
    name: "Audio Extractor (Whisper)",
    description:
      "Enable or disable audio extractor using Whisper OpenAI ($0.006 / minute) supports multi-languages and accepts a variety of formats (m4a, mp3, mp4, mpeg, mpga, wav, webm).",
  },

  ImageExtractor: {
    name: "Image Extractor",
    description: "Enable or disable Image Extractor from URL",
  },

  ImageExtractorEmbded: {
    name: "Embedded Image Extractor",
    description: "Enable or disable Embedded Image Extractor.",
  },

  YoutubeExtractor: {
    name: "Youtube Extractor",
    description: "Enable or disable Youtube extractor.",
  },
};

export default function ExtractorsOptionsSetting() {
  const global = useGlobal();
  const sectionId = useId();
  if (!global) throw new Error("Global settings not found");

  const listOfOptions = useMemo(
    () => Object.keys(global.plugin.defaultSettings.extractorsOptions),
    []
  );

  return (
    <SettingsSection
      title="Extractors Options"
      className="plug-tg-flex plug-tg-w-full plug-tg-flex-col"
      id={sectionId}
    >
      {listOfOptions
        .filter((d) => !contextNotForTemplate.contains(d))
        .map((key) => {
          const moreData = extendedInfo[key];
          return (
            <ConfigItem
              key={moreData?.name || key}
              name={moreData?.name || key}
              description={
                moreData?.description ||
                `Enable or disable ${key.toLowerCase()} Extractor.`
              }
              sectionId={sectionId}
              value={
                global.plugin.settings.extractorsOptions[
                  key as keyof typeof global.plugin.settings.extractorsOptions
                ] ?? false
              }
              onChange={(v) => {
                global.plugin.settings.extractorsOptions[
                  key as keyof typeof global.plugin.settings.extractorsOptions
                ] = v as boolean;
              }}
            />
          );
        })}
    </SettingsSection>
  );
}
