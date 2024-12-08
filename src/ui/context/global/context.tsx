import { createContext, useContext } from "react";
import GeniiAssistantPlugin from "../../../main";

export interface GlobalType {
  loading: boolean;
  setLoading?: (nloading: boolean) => void;
  plugin: GeniiAssistantPlugin;
  triggerReload: () => void;
  enableTrigger: boolean;
}

export const GlobalContext = createContext<GlobalType | undefined>(undefined);
export default function useGlobal() {
  return useContext(GlobalContext);
}
