import React, { createContext, useContext, useMemo, useState } from "react";
// ---------- sections ----------
import AdvancedSetting from "./advanced";
import ProviderSetting from "./provider";
import DMPSetting from "./default-model-parameters";
import ConsideredContextSetting from "./considered-context";
import ExtractorOptionsSetting from "./extractors-options";
import AutoSuggestSetting from "./auto-suggest";
import SlashSuggestSetting from "./slash-suggest";
import OptionsSetting from "./options";
import Input from "../components/input";
import OtherProvidersSetting from "./otherProviders";
import useGlobal from "#/ui/context/global/context";
// ------------------------------

type SearchContext = {
  listOfAllowed: string[];
  activeSections: Record<string, true>;
  searchTerm: string;
  register(id: string, searchInfo: string, section?: string): void;
  unRegister(id: string): void;
  checkAll(ids: string[]): boolean;
};

const SearchSettingsContext = createContext<SearchContext | undefined>(
  undefined
);

export function useSearchContext() {
  return useContext(SearchSettingsContext);
}

export default function SectionsMain() {
  const global = useGlobal();
  const [items, setItems] = useState<
    Record<
      string,
      {
        term: string;
        sectionId: string;
      }
    >
  >({});
  const [searchTerm, setSearchTerm] = useState<string>("");

  const searchedEntries = useMemo(
    () =>
      !searchTerm.length
        ? Object.entries(items)
        : // eslint-disable-next-line
          Object.entries(items).filter(([key, val]) =>
            `${val.term} ${items[val.sectionId]?.term}`
              .toLocaleLowerCase()
              .includes(searchTerm.toLocaleLowerCase())
          ),
    [items, searchTerm]
  );

  const searchedItems = useMemo<string[]>(
    () => searchedEntries.map((e) => e[0]),
    [searchedEntries]
  );

  const activeSections = useMemo(() => {
    const obj: Record<string, true> = {};
    searchedEntries.forEach((e) => {
      if (e[1].sectionId) obj[e[1].sectionId] = true;
    });

    return obj;
  }, [searchedItems]);

  const register: SearchContext = {
    listOfAllowed: searchedItems,
    activeSections,
    searchTerm,
    register(id, searchInfo, sectionId) {
      setItems((items) => {
        items[id] = {
          term: searchInfo,
          sectionId: sectionId ?? "",
        };
        return { ...items };
      });
    },
    unRegister(id) {
      setItems((items) => {
        delete items[id];
        return { ...items };
      });
    },
    checkAll(ids) {
      return ids.every((id) => searchedItems.contains(id));
    },
  };

  return (
    <SearchSettingsContext.Provider value={register}>
      <div className="plug-tg-flex plug-tg-w-full plug-tg-flex-col plug-tg-gap-3">
        <div className="w-full gap-2 plug-tg-flex plug-tg-flex-col plug-tg-justify-between md:plug-tg-flex-row">
          <div>
            <h1>Genii Assistant</h1>
          </div>
          <Input
            type="text"
            setValue={(val) => setSearchTerm(val.toLocaleLowerCase())}
            value={searchTerm}
            className="plug-tg-input-sm plug-tg-w-full lg:plug-tg-w-auto"
            placeholder="Search For Option"
          />
        </div>

        <div className="tags plug-tg-flex plug-tg-flex-wrap plug-tg-gap-2">
          <a
            className="tag"
            href={`https://github.com/mirai73/obsidian-genii-assistant-plugin/releases/tag/${global?.plugin.manifest.version}`}
          >
            V{global?.plugin.manifest.version}
          </a>
          {/* <a className="tag" href="https://bit.ly/tg_docs">
          {"\u{1F4D6}"} Documentation
        </a>
        <a className="tag" href="https://bit.ly/Tg-discord">
          {"\u{1F44B}"} Discord
        </a>
        <a className="tag" href="https://bit.ly/tg-twitter2">
          {"\u{1F3A5}"} YouTube
        </a>
        <a className="tag" href="https://bit.ly/tg-twitter2">
          {"\u{1F426}"} Twitter
        </a> */}
        </div>

        <ProviderSetting />
        <AdvancedSetting />
        <DMPSetting />
        <AutoSuggestSetting />
        <SlashSuggestSetting />
        <ConsideredContextSetting />
        <ExtractorOptionsSetting />
        <OtherProvidersSetting />
        <OptionsSetting />
      </div>
    </SearchSettingsContext.Provider>
  );
}
