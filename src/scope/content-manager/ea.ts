import { TFile, View } from "obsidian";
import { ContentManager, Mode, Options } from "./types";

type Item = any;
export default class ExcalidrawManager implements ContentManager {
  ea: any;
  view: View;

  constructor(ea: any, view: View, options: Options) {
    this.ea = ea;
    this.view = view;
    this.options = options;
  }

  options: Options = {
    wrapInBlockQuote: false,
  };

  getRange(from?: any, to?: any) {
    throw new Error("Method not implemented.");
  }
  getCurrentLine(): string {
    throw new Error("Method not implemented.");
  }

  protected async getSelectedItems(): Promise<Item[]> {
    return this.ea
      .getViewSelectedElements()
      .sort((a: any, b: any) => a.y + a.height - b.y - b.height);
  }

  protected async getTextSelectedItems(): Promise<Item[]> {
    return (await this.getSelectedItems())
      .filter(
        (e: Item) =>
          !e.isDeleted &&
          (!!e.rawText || !!e.link?.startsWith("data:text/html;base64,"))
      )
      .map((ee) => {
        const e = { ...ee };
        console.log({ e });
        if (e.link?.startsWith("data:text/html;base64,")) {
          e.type = "text";
          e.rawText = `\`\`\`html
 ${Buffer.from(e.link?.split(",")?.[1], "base64").toString()}
\`\`\``;
          console.log({ e });
        }

        return e.rawText;
      });
  }

  protected getElement(id: string): Item {
    const items = [...this.ea.getViewElements(), ...this.ea.getElements()];
    return items
      .map((ee) => {
        const e = { ...ee };
        if (e.link?.startsWith("data:text/html;base64,")) {
          e.type = "text";
          e.rawText = Buffer.from(e.link?.split(",")?.[1], "base64").toString();
        }

        return e;
      })
      .find((e: Item) => e.id === id);
  }

  async getSelections(): Promise<string[]> {
    return (await this.getTextSelectedItems()).map((e) => e.rawText);
  }

  getValue(): string {
    return this.ea
      .getViewElements()
      .map((ee: Item) => {
        const e = { ...ee };
        if (e.link?.startsWith("data:text/html;base64,")) {
          e.type = "text";
          e.rawText = Buffer.from(e.link?.split(",")?.[1], "base64").toString();
        }
        return e;
      })
      .map((e: Item) => e.rawText)
      .filter(Boolean)
      .join("\n");
  }

  async getSelection(): Promise<string> {
    return (await this.getSelections())[0];
  }

  async getTgSelection(tgSelectionLimiter?: string) {
    let txt = (await this.getTextSelectedItems())
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!txt?.length) {
      txt = this.getValue();
    }

    return txt;
  }

  selectTgSelection(tgSelectionLimiter?: string) {}

  getLastLetterBeforeCursor(): string {
    return "";
  }

  async getCursor(dir?: "from" | "to" | undefined): Promise<Item> {
    // get first or last item
    const items = await this.getSelectedItems();
    return items[dir === "from" ? 0 : items.length - 1];
  }

  setCursor(pos: Item | Item[]): void {
    let arr = [];

    if (pos)
      if (Array.isArray(pos)) arr = pos;
      else arr.push(pos);

    this.ea.selectElementsInView(arr);
    return;
  }

  async insertText(text: string, pos: Item, mode?: Mode): Promise<Item> {
    const items = await this.getTextSelectedItems();
    let selectedItem = pos || this.getCursor();
    let itemId = selectedItem?.id;

    if (!text.replaceAll("\n", "").trim().length) return pos;

    switch (mode) {
      case "replace":
        // remove selected items(text)
        this.ea.deleteViewElements([...items, selectedItem]);

        // add item
        selectedItem = itemId = undefined;
        break;

      case "insert":
        // add item
        selectedItem = itemId = undefined;
        break;
    }

    let item = this.getElement(itemId) || selectedItem;

    if (pos?.type === "text") {
      if (pos.strokeColor) this.ea.style.strokeColor = pos.strokeColor;
      if (pos.fontSize) this.ea.style.fontSize = pos.fontSize;
      if (pos.fontFamily) this.ea.style.fontFamily = pos.fontFamily;
    }

    if (!item) {
      const _textSize: { width: number; height: number } =
        this.ea.measureText(text);

      itemId = this.ea.addText(pos.x, pos.y, text, {
        wrapAt: 5,
        ...pos,
        id: undefined,
        box: pos?.type
          ? {
              width: Math.min(
                _textSize.width + 2,
                Math.max(this.ea.style.fontSize * 20, 200)
              ),
              boxPadding: 0,
            }
          : { boxPadding: 2 },
      });

      await this.ea.addElementsToView(false, false);
      // this.ea.clear();

      item = this.getElement(itemId);

      // console.log(item, this.ea.refreshTextElementSize(itemId))

      // await this.ea.addElementsToView(false, false);
      // this.ea.clear();
    }

    if (item?.type === "text") {
      if (item.strokeColor) this.ea.style.strokeColor = item.strokeColor;
      if (item.fontSize) this.ea.style.fontSize = item.fontSize;
      if (item.fontFamily) this.ea.style.fontFamily = item.fontFamily;
    }

    const elements = [item];

    let textSize: { width: number; height: number } = this.ea.measureText(
      (elements[0]?.text || "") + text
    );

    elements.forEach((el) => {
      el.text = el.rawText = (el?.text || "") + text;
      if (pos) {
        el.x = pos.x;
        el.width = Math.min(
          textSize.width + 10,
          Math.max(this.ea.style.fontSize * 20, 200)
        );
        el.height = textSize.height;
      } else {
        el.width = textSize.width;
      }
    });

    await this.ea.addElementsToView(false, false);
    await this.ea.targetView?.forceSave(true);
    this.ea.clear();

    elements[0] = this.getElement(itemId);

    textSize = this.ea.measureText((elements[0]?.text || "") + text);

    elements.forEach((el) => {
      if (pos) {
        if (!text.startsWith("-")) el.x += pos.width / 2 - el.width / 2;
        el.y = pos.y + pos.height + textSize.height || el.y;
      }
    });

    elements[0] = this.getElement(itemId);

    await this.ea.copyViewElementsToEAforEditing(elements);
    await this.ea.addElementsToView(false, false);
    await this.ea.targetView?.forceSave(true);
    this.ea.clear();

    return item;
  }

  async insertStream(
    pos: Item,
    mode?: "insert" | "replace"
  ): Promise<{
    insert(data: string): void;
    end(): void;
    replaceAllWith(newData: string): void;
  }> {
    const items = await this.getTextSelectedItems();
    const selectedItem = (
      items.length
        ? items
        : this.ea
            .getViewElements()
            .map((e: Item) => e.rawText)
            .filter(Boolean)
    )[items.length - 1];

    // create a new item
    const startingCursor = pos;

    let cursor: any;

    let postingContent = "";
    let stillPlaying = true;

    return {
      insert(newInsertData: string) {
        postingContent += newInsertData;
      },
      end() {
        stillPlaying = false;
      },

      replaceAllWith: async (allText) => {
        const sections = allText.split("\n").filter((t) => t.trim());
        let lastPos = pos || this.getCursor("to");
        const arr: Item[] = [];
        for (const section of sections) {
          const item = await this.insertText(section, lastPos, mode);

          if (item) {
            lastPos = item;
          }

          await new Promise((s) => setTimeout(s, 300));

          // this.insertText(allText, startingCursor, "replace");
        }
        this.setCursor(arr);
      },
    };
  }

  getActiveFile(): TFile {
    return this.ea.targetView.file;
  }
}
