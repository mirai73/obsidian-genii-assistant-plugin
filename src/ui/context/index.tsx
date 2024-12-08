import React from "react";
import type GeniiAssistantPlugin from "../../main";
import { GlobalProvider } from "./global";

export default function Contexts(props: {
  children?: any;
  plugin: GeniiAssistantPlugin;
}) {
  return (
    <GlobalProvider plugin={props.plugin}>{props.children}</GlobalProvider>
  );
}
