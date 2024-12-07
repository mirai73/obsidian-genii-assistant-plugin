import React, {
  useState,
  useEffect,
  ChangeEvent,
  MouseEventHandler,
} from "react";
import {
  ContentExtractor,
  ExtractorMethod,
  getExtractorMethods,
} from "../extractors/content-extractor";
import { App, Modal, TFile } from "obsidian";
import TextGeneratorPlugin from "../main";
import { createRoot } from "react-dom/client";
import CopyButton from "./components/copyButton";
import { ContentManager } from "#/scope/content-manager/types";
import debug from "debug";

const logger = debug("genii:text-extractor-tool");

const ContentExtractorComponent = ({
  app,
  plugin,
}: {
  p: any;
  app: any;
  plugin: TextGeneratorPlugin;
}) => {
  const [urlResults, setUrlResults] = useState<
    {
      url: string;
      file: any;
      extractorMethod: ExtractorMethod;
    }[]
  >([]);
  const [convertedResults, setConvertedResults] = useState<Record<string, any>>(
    {}
  );

  const truncateUrl = (url: string, maxLength: number) => {
    if (url.length <= maxLength) {
      return url;
    }
    const ellipsis = "...";
    const prefixLength = Math.floor((maxLength - ellipsis.length) / 2);
    const suffixLength = maxLength - prefixLength - ellipsis.length;
    const truncatedUrl =
      url.substring(0, prefixLength) +
      ellipsis +
      url.substring(url.length - suffixLength);
    return truncatedUrl;
  };

  const fetchUrls = async () => {
    try {
      const contentExtractor = new ContentExtractor(app, plugin);
      const extractedUrls: {
        url: string;
        file: any;
        extractorMethod: any;
      }[] = [];

      // Iterate through each extractor method and add the extracted URLs to the array.
      const extractorMethods = getExtractorMethods();

      for (const extractorMethod of extractorMethods) {
        contentExtractor.setExtractor(extractorMethod);
        const files = await contentExtractor.extract(
          app.workspace.getActiveFile().path
        );
        if (files && files.length > 0) {
          extractedUrls.push(
            ...files?.map((file: any) => ({
              url: truncateUrl(file?.path ?? file ?? "", 50),
              file,
              extractorMethod,
            }))
          );
        }
      }
      setUrlResults(extractedUrls);
    } catch (err: any) {
      plugin.handelError(err);
    }
  };

  const handleConvertClick = async (
    file: TFile,
    extractorMethod: ExtractorMethod
  ) => {
    const contentExtractor = new ContentExtractor(app, plugin);
    contentExtractor.setExtractor(extractorMethod);
    const convertedText = await contentExtractor.convert(file.path ?? file);

    setConvertedResults((convertedResults) => ({
      ...convertedResults,
      [file.path ?? file]: convertedText,
    }));
  };

  const handleTextAreaChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
    url: string
  ) => {
    setConvertedResults((convertedResults) => ({
      ...convertedResults,
      [url]: event.target.value,
    }));
  };

  const handleRemoveClick = (url: string) => {
    setConvertedResults((convertedResults) => {
      const updatedResults = { ...convertedResults };
      delete updatedResults[url];
    });
  };

  useEffect(() => {
    fetchUrls();
  }, []);

  return (
    <div className="plug-tg-container plug-tg-mx-auto">
      <table className="plug-tg-min-w-full plug-tg-divide-y plug-tg-divide-gray-200">
        <thead>
          <tr>
            <th className="plug-tg-p-2 plug-tg-text-left plug-tg-text-xs plug-tg-font-medium plug-tg-uppercase plug-tg-tracking-wider">
              File/URL
            </th>
            <th className="plug-tg-p-2 plug-tg-text-left plug-tg-text-xs plug-tg-font-medium plug-tg-uppercase plug-tg-tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="plug-tg-divide-y plug-tg-divide-gray-200">
          {urlResults.map((urlResult, index) => (
            <tr key={index}>
              <td className="plug-tg-whitespace-nowrap plug-tg-p-2 plug-tg-text-sm">
                {urlResult.url}
              </td>
              <td className="plug-tg-whitespace-nowrap plug-tg-p-2 plug-tg-text-sm">
                <button
                  onClick={() =>
                    handleConvertClick(
                      urlResult.file,
                      urlResult.extractorMethod
                    )
                  }
                  className="plug-tg-rounded plug-tg-bg-green-500 plug-tg-px-4 plug-tg-py-1 plug-tg-font-semibold hover:plug-tg-bg-green-600 focus:plug-tg-outline-none focus:plug-tg-ring-2
                  focus:plug-tg-ring-green-300/50"
                >
                  Convert
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {Object.entries(convertedResults).map(([url, result], index) => (
        <div key={index} className="plug-tg-relative plug-tg-my-6">
          <h2 className="plug-tg-mb-2 plug-tg-font-bold">{url}</h2>
          <textarea
            dir="auto"
            className="plug-tg-mt-1 plug-tg-h-24 plug-tg-w-full plug-tg-resize-none plug-tg-rounded plug-tg-border plug-tg-border-gray-300 plug-tg-p-2 focus:plug-tg-border-blue-500"
            value={result}
            onChange={(event) => handleTextAreaChange(event, url)}
          />
          <CopyButton textToCopy={result} />
          <RemoveButton handleRemoveClick={() => handleRemoveClick(url)} />
        </div>
      ))}
    </div>
  );
};

export default ContentExtractorComponent;

export class TextExtractorTool extends Modal {
  plugin: TextGeneratorPlugin;
  root: any;
  editor: ContentManager;

  constructor(app: App, plugin: TextGeneratorPlugin, editor: ContentManager) {
    super(app);
    this.plugin = plugin;
    this.editor = editor;
    this.setTitle("Text Extractor Tool");
  }

  async headless() {
    let text = await this.editor.getSelection();
    logger("headless", { text });
    if (!text || text.length === 0) {
      text = await this.editor.getPrecedingLine();
      logger("headless", { text });
    }
    if (text && text.length > 0) {
      const contentExtractor = new ContentExtractor(this.app, this.plugin);
      for (const extractorMethod of getExtractorMethods()) {
        contentExtractor.setExtractor(extractorMethod);
        const url = await contentExtractor.extract("", text);
        logger("headless", { url });
        if (url.length > 0) {
          const extractedText = await contentExtractor.convert(url[0]);
          if (extractedText) {
            this.editor.insertText(
              extractedText,
              this.editor.getCursor(),
              "insert"
            );
            logger("headless", { extractedText });
          } else {
            logger("headless", "No text extracted");
          }
          return;
        }
      }
      logger("headless", "No extractor found");
    } else {
      logger("headless", "No text selected or found");
    }
  }

  async onOpen() {
    console.log("onOpen", this.containerEl);
    this.root = createRoot(
      this.containerEl.getElementsByClassName("modal-content")[0]
    );
    this.root.render(
      <React.StrictMode>
        <ContentExtractorComponent
          p={this}
          app={this.app}
          plugin={this.plugin}
        />
      </React.StrictMode>
    );
  }

  onClose() {
    this.root.unmount();
  }
}

const RemoveButton = (props: {
  handleRemoveClick: MouseEventHandler<HTMLButtonElement> | undefined;
}) => {
  return (
    <button
      onClick={props.handleRemoveClick}
      className="text-gray absolute bottom-[calc(-30px)] right-12 mb-1 mr-1 rounded-none bg-red-300 px-2 py-1 text-xs font-semibold hover:bg-red-600 focus:outline-none focus:ring-0"
    >
      Remove
    </button>
  );
};
