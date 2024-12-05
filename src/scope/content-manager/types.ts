import { TFile } from "obsidian";
import type { CanvasNode } from "./canvas.d";

export type ContentInsertMode = "insert" | "stream" | "replace";

export type EditorPosition = {
  ch: number;
  line: number;
};

export type TemplateMetadata = Partial<{
  id: string;
  name: string;
  description: string;
  required_values: string[];
  author: string;
  tags: string[];
  version: string;
  commands: string[];
  viewTypes?: string[];
}>;

export type Template = TemplateMetadata & {
  title: string;
  ctime: number;
  path: string;
};

export type Item = (CanvasNode & { rawText?: string }) | undefined;

export type Options = {
  wrapInBlockQuote?: boolean;
};

export interface ContentManager {
  options: Options;
  getValue(): Promise<string> | string;

  getSelection(): Promise<string>;
  getSelections(): Promise<string[]>;

  getLastLetterBeforeCursor(): string;

  getTgSelection(tgSelectionLimiter?: string): Promise<string> | string;

  selectTgSelection(tgSelectionLimiter?: string): void;

  getCursor(pos?: "from" | "to"): any;

  getRange(from?: any, to?: any): any;
  getCurrentLine(): string;

  getPrecedingLine(): string;

  setCursor(pos: EditorPosition): void;

  getActiveFile(): Promise<TFile> | TFile | undefined;

  // replaceRange(str: string, startingPos: EditorPosition, endPos?: EditorPosition): void;

  // replaceSelection(str: string): void;

  insertText(
    data: string,
    pos: EditorPosition | Item,
    mode?: ContentInsertMode
  ): Promise<string | Item>;

  insertStream(
    pos: EditorPosition | Item,
    mode?: ContentInsertMode
  ): Promise<{
    insert(data: string): void;
    end(): void;
    replaceAllWith(newData: string): void;
  }>;
}
