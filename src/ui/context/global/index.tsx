import React, { useEffect, useState } from "react";

import TextgeneratorPlugin from "../../../main";
import { GlobalContext, GlobalType } from "./context";
import { useDebounceValue, useToggle } from "usehooks-ts";

const event = new Event("triggerReloadGlobalReact-textgenerator");

export function GlobalProvider({
  children,
  plugin,
}: {
  children: any;
  plugin: TextgeneratorPlugin;
}) {
  const [loading, setLoading] = useState(false);
  const [_trg, triggerReload] = useToggle();

  const [trg] = useDebounceValue(_trg, 80);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      if (loading === true) {
        setLoading(false);
      }
    }, 60 * 1000);
    return () => {
      clearTimeout(t);
    };
  }, [loading]);

  useEffect(() => {
    const ev = () => {
      triggerReload();
    };
    window.addEventListener(event.type, ev);

    return () => {
      window.removeEventListener(event.type, ev);
    };
  }, []);

  const values: GlobalType = {
    loading,
    setLoading,
    triggerReload() {
      window.dispatchEvent(event);
    },
    enableTrigger: trg,
    plugin: plugin,
  };

  return (
    <GlobalContext.Provider value={values}>{children}</GlobalContext.Provider>
  );
}
