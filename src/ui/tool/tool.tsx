import { Command, Editor } from "obsidian";
import GeniiAssistantPlugin from "../../main";
import React, { useEffect, useMemo, useState } from "react";
import { InputContext } from "../../scope/context-manager";
import safeAwait from "safe-await";
import { VIEW_TOOL_ID, ToolView } from ".";
import CopyButton from "../components/copyButton";
import useStateView from "../context/useStateView";
import MarkDownViewer from "../components/Markdown";
import TemplateInputModalView from "../template-input-modal/view";
import { getHBVariablesOfTemplate } from "#/scope/context-manager-helpers";

export default function Tool({
  plugin,
  setCommands,
  view,
  onEvent,
}: {
  plugin: GeniiAssistantPlugin;
  setCommands: (commands: Command[]) => void;
  view: ToolView;
  onEvent: (cb: (name: string) => void) => void;
}) {
  const [selectedTemplatePath, setSelectedTemplatePath] = useState(
    view?.getState()?.templatePath
  );

  const config = useMemo<{
    templatePath: string;
    context: InputContext;
    editor?: Editor;
  }>(() => view?.getState(), [selectedTemplatePath]);

  const [answer, setAnswer] = useStateView("", "answer", view);

  const [loading, setLoading] = useState(false);
  const [templateContext, setTemplateContext] = useState<
    InputContext | undefined
  >(undefined);
  const [variables, setVariables] = useState<string[]>([]);

  const [abortController, setAbortController] = useState(new AbortController());

  const [meta, setMeta] = useStateView<{ name?: string; description?: string }>(
    {},
    "meta",
    view
  );

  const openSource = () => {
    view.app.workspace.openLinkText("", view.getState().templatePath, true);
  };

  useEffect(() => {
    (async () => {
      // make sure that tempPath is accessible, it takes a random amount of time
      // before the view state gets updated with the right values.
      await new Promise((s) => {
        const inter = setInterval(() => {
          const tp = view?.getState()?.templatePath;
          if (tp) {
            clearInterval(inter);
            s(tp);
          }
        }, 500);
      });
      setSelectedTemplatePath(view?.getState()?.templatePath);
    })();
  }, []);

  useEffect(() => {
    let onGoing = true;
    onEvent((name: string) => {
      if (onGoing)
        switch (name) {
          case "Pin":
            view.leaf.togglePinned();
            break;
          case "OnTop": {
            view.toggleAlwaysOnTop();
            break;
          }
          case "popout":
            view.app.workspace.moveLeafToPopout(view.leaf);
            break;

          case "source":
            openSource();
            break;

          default:
            throw new Error(
              `event ${name}, not implemented in the tool react component.`
            );
        }
    });

    return () => {
      onGoing = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedTemplatePath) return;
    (async () => {
      await view.leaf.setViewState({
        state: { ...config, templatePath: selectedTemplatePath },
        type: VIEW_TOOL_ID,
      });

      const metadata = plugin.geniiAssistant?.getMetadata(
        selectedTemplatePath || ""
      );
      if (metadata) setMeta(metadata);

      const templateFile = plugin.app.vault.getAbstractFileByPath(
        selectedTemplatePath || ""
      );

      const [error, templateContent] = templateFile?.path
        ? await safeAwait(
            //@ts-ignore
            plugin.app.vault.adapter.read(templateFile?.path)
          )
        : ["", ""];

      if (error) {
        throw error;
      }

      if (!templateContent) {
        throw new Error(
          `templateContent is undefined(${selectedTemplatePath}, ${templateFile?.name})`
        );
      }

      const context = plugin.contextManager?.splitTemplate(templateContent);
      if (!context) return;
      const { inputContent, outputContent } = context;

      const variables = getHBVariablesOfTemplate(inputContent, outputContent);

      const templateContext = await plugin.contextManager?.getContext({
        editor: config.editor as any,
        templatePath: config.templatePath,
      });
      if (!templateContext) return;
      if (templateContext.options)
        templateContext.options.templatePath = config.templatePath;

      //({ templateContext, config });

      setTemplateContext(templateContext?.options);
      if (variables) setVariables(variables);
    })();
  }, [selectedTemplatePath, config]);

  const handleSubmit = async (event: any) => {
    const data = event.formData;
    setLoading(true);
    try {
      const context = await plugin.contextManager?.getContext({
        insertMetadata: false,
        templatePath: selectedTemplatePath,
        editor: config.editor as any,
        additionalOpts: data,
      });
      if (!context) {
        return;
      }
      const stream = await plugin.geniiAssistant?.streamGenerate(
        context,
        false,
        {},
        context.templatePath,
        {
          showSpinner: false,
          signal: abortController.signal,
        }
      );

      const allText =
        (await stream?.(
          async (content, first) => {
            if (first) setAnswer(content);
            else setAnswer((a) => a + content);
            return content;
          },
          (err) => {
            throw err;
          }
        )) || "";

      setAnswer(allText);
    } catch (err: any) {
      console.error(err);
      setAnswer(
        `ERR: ${
          err?.message?.replace("stack:", "\n\n\n\nMore Details") || err.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const stopLoading = (e: any) => {
    e.preventDefault();
    abortController.abort();
    setAbortController(new AbortController());
    setLoading(false);
  };

  if (!templateContext) return;

  return (
    <div className="plug-tg-flex plug-tg-h-full plug-tg-w-full plug-tg-flex-col plug-tg-gap-2">
      <div className="plug-tg-min-h-16 plug-tg-flex plug-tg-w-full plug-tg-resize-y plug-tg-flex-col plug-tg-justify-end plug-tg-gap-6 plug-tg-overflow-y-scroll plug-tg-pb-2">
        <div className="plug-tg-flex plug-tg-h-full plug-tg-flex-col plug-tg-gap-2">
          <div className="plug-tg-flex plug-tg-h-full plug-tg-flex-col plug-tg-gap-4">
            <TemplateInputModalView
              labels={variables}
              metadata={meta}
              templateContext={templateContext}
              p={{ plugin: plugin }}
              onSubmit={handleSubmit}
            >
              <div className="plug-tg-flex plug-tg-justify-end plug-tg-gap-3 plug-tg-pr-3">
                {loading ? (
                  <button
                    onClick={stopLoading}
                    className="plug-tg-rounded plug-tg-bg-red-500 plug-tg-px-6 plug-tg-py-2 plug-tg-font-semibold hover:plug-tg-bg-red-600 focus:plug-tg-outline-none focus:plug-tg-ring-4 focus:plug-tg-ring-blue-300/50"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="plug-tg-rounded plug-tg-bg-blue-500 plug-tg-px-6 plug-tg-py-2 plug-tg-font-semibold hover:plug-tg-bg-blue-600 focus:plug-tg-outline-none focus:plug-tg-ring-4 focus:plug-tg-ring-blue-300/50"
                  >
                    Generate
                  </button>
                )}
                {answer && <CopyButton textToCopy={answer} justAButton />}
              </div>
            </TemplateInputModalView>
          </div>
        </div>
      </div>

      <div className="plug-tg-min-h-16 plug-tg-w-full">
        {answer ? (
          <MarkDownViewer className="plug-tg-h-full plug-tg-w-full plug-tg-select-text plug-tg-overflow-y-auto">
            {answer}
          </MarkDownViewer>
        ) : (
          <div className="plug-tg-h-full plug-tg-text-sm plug-tg-opacity-50">
            (empty)
          </div>
        )}
      </div>
    </div>
  );
}
