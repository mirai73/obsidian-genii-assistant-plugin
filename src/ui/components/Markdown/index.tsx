import React from "react";
import { useEffect, useRef } from "react";

import { MarkdownRenderer } from "obsidian";
import GeniiAssistantPlugin from "#/main";
import useGlobal from "#/ui/context/global/context";
import clsx from "clsx";

export default function MarkDownViewer(props: {
  children: string;
  className?: string;
  plugin?: GeniiAssistantPlugin;
  editable?: boolean;
}) {
  // Create an array of refs for each insight item
  const ref = useRef<HTMLDivElement>(null);
  const global = useGlobal();
  if (!global) throw new Error("Global not found");
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    try {
      MarkdownRenderer.render(
        global.plugin.app,
        "" + props.children,
        ref.current,
        "",
        props.plugin || global.plugin
      );
    } catch {
      global?.plugin.handelError(
        `failed to render "${"" + props.children}" it should be a string`
      );
    }
  }, [props.children, ref.current]);

  return (
    <div
      className={clsx("markdown-source-view", props.className)}
      ref={ref}
      contentEditable={props.editable}
      onClick={(e) => e.preventDefault()}
    ></div>
  );
}
