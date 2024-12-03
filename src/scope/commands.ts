import { Command, Editor, Notice } from "obsidian";
import TextGeneratorPlugin from "../main";
import { TemplatesModal } from "../models/model";

import { PackageManagerUI } from "#/scope/package-manager/package-manager-ui";
import ContentManagerFactory from "#/scope/content-manager";

import { SetMaxTokens } from "#/ui/settings/components/set-max-tokens";
import { TextExtractorTool } from "#/ui/text-extractor-tool";
import { SetLLMProvider } from "#/ui/settings/components/set-llm-provider";
import { VIEW_Playground_ID } from "#/ui/playground";
import { VIEW_TOOL_ID } from "#/ui/tool";

import debug from "debug";
import { SetModel } from "#/ui/settings/components/set-model";
import { InputContext } from "./context-manager";
const logger = debug("genii:Commands");

export default class Commands {
  plugin: TextGeneratorPlugin;

  async showTokens(context?: InputContext) {
    if (!context) {
      new Notice("No context was detected");
      return;
    }
    const tokenEstimate = await this.plugin.tokensScope?.estimate(context);
    if (tokenEstimate) this.plugin.tokensScope?.showTokens(tokenEstimate);
  }

  commands: Command[] = [
    {
      id: "generate-text",
      name: "Generate text",
      icon: "GENERATE_ICON",
      hotkeys: [{ modifiers: ["Mod"], key: "j" }],
      callback: async () => {
        try {
          if (this.plugin.processing)
            return this.plugin.textGenerator?.signalController?.abort();
          const activeView = await this.plugin.getActiveView();
          const CM = ContentManagerFactory.createContentManager(
            activeView,
            this.plugin
          );
          await this.plugin.textGenerator?.generateInEditor({}, false, CM);
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },

    {
      id: "generate-text-with-metadata",
      name: "Generate text (use Metadata)",
      icon: "GENERATE_META_ICON",
      hotkeys: [{ modifiers: ["Mod", "Alt"], key: "j" }],
      callback: async () => {
        try {
          const activeView = await this.plugin.getActiveView();
          const CM = ContentManagerFactory.createContentManager(
            activeView,
            this.plugin
          );
          await this.plugin.textGenerator?.generateInEditor({}, true, CM);
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },

    {
      id: "insert-generated-text-from-template",
      name: "Templates: Generate & Insert",
      icon: "circle",

      callback: async () => {
        try {
          new TemplatesModal(
            this.plugin.app,
            this.plugin,
            async (result) => {
              if (!result.path) throw new Error("Nothing was selected");
              try {
                const activeView = await this.plugin.getActiveView();
                const CM = ContentManagerFactory.createContentManager(
                  activeView,
                  this.plugin,
                  {
                    templatePath: result.path,
                  }
                );

                await this.plugin.textGenerator?.generateFromTemplate({
                  params: {},
                  templatePath: result.path,
                  filePath: (await CM.getActiveFile())?.path,
                  insertMetadata: true,
                  editor: CM,
                  activeFile: true,
                });
              } catch (error) {
                this.plugin.handelError(error);
              }
            },
            "Generate and Insert Template In The Active Note"
          ).open();
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },

    {
      id: "generated-text-to-clipboard-from-template",
      name: "Templates: Generate & Copy To Clipboard ",
      icon: "circle",

      callback: async () => {
        try {
          new TemplatesModal(
            this.plugin.app,
            this.plugin,
            async (result) => {
              try {
                const activeView = await this.plugin.getActiveView();
                const CM = ContentManagerFactory.createContentManager(
                  activeView,
                  this.plugin,
                  {
                    templatePath: result.path,
                  }
                );

                await this.plugin.textGenerator?.generateToClipboard(
                  {},
                  result.path || "",
                  true,
                  CM
                );
              } catch (error: any) {
                this.plugin.handelError(error);
              }
            },
            "Generate & Copy To Clipboard"
          ).open();
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },

    {
      id: "create-generated-text-from-template",
      name: "Templates: Generate & Create Note",
      icon: "plus-circle",

      callback: async () => {
        try {
          new TemplatesModal(
            this.plugin.app,
            this.plugin,
            async (result) => {
              if (!result.path) throw new Error("Nothing was selected");

              try {
                const activeView = await this.plugin.getActiveView();
                const CM = ContentManagerFactory.createContentManager(
                  activeView,
                  this.plugin,
                  {
                    templatePath: result.path,
                  }
                );

                await this.plugin.textGenerator?.generateFromTemplate({
                  params: {},
                  templatePath: result.path,
                  filePath: (await CM.getActiveFile())?.path,
                  insertMetadata: true,
                  editor: CM,
                  activeFile: false,
                });
              } catch (error: any) {
                this.plugin.handelError(error);
              }
            },
            "Generate and Create a New Note From Template"
          ).open();
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },

    {
      id: "search-results-batch-generate-from-template",
      name: "Templates (Batch): From Search Results",
      icon: "plus-circle",

      callback: async () => {
        try {
          new TemplatesModal(
            this.plugin.app,
            this.plugin,
            async (result) => {
              if (!result.path) throw new Error("Nothing was selected");
              const files =
                await this.plugin.textGenerator?.embeddingsScope.getSearchResults();

              if (!files?.length)
                return this.plugin.handelError(
                  "You need at least one search result"
                );

              await this.plugin.textGenerator?.generateBatchFromTemplate(
                files,
                {},
                result.path,
                true
              );
            },
            "Generate and create multiple notes from template"
          ).open();
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },

    {
      id: "insert-text-from-template",
      name: "Templates: Insert Template",
      icon: "square",

      callback: async () => {
        try {
          new TemplatesModal(
            this.plugin.app,
            this.plugin,
            async (result) => {
              if (!result.path) throw new Error("Nothing was selected");

              try {
                const activeView = await this.plugin.getActiveView();
                const CM = ContentManagerFactory.createContentManager(
                  activeView,
                  this.plugin,
                  {
                    templatePath: result.path,
                  }
                );

                await this.plugin.textGenerator?.generateFromTemplate({
                  params: {},
                  templatePath: result.path,
                  filePath: (await CM.getActiveFile())?.path,
                  insertMetadata: true,
                  editor: CM,
                  activeFile: true,
                });
              } catch (error: any) {
                this.plugin.handelError(error);
              }
            },
            "Insert template in the active Note"
          ).open();
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },

    {
      id: "create-text-from-template",
      name: "Templates: Insert & Create Note",
      icon: "plus-square",

      callback: async () => {
        try {
          new TemplatesModal(
            this.plugin.app,
            this.plugin,
            async (result) => {
              if (!result.path) throw new Error("Nothing was selected");

              try {
                const activeView = await this.plugin.getActiveView();
                const CM = ContentManagerFactory.createContentManager(
                  activeView,
                  this.plugin,
                  {
                    templatePath: result.path,
                  }
                );

                await this.plugin.textGenerator?.generateFromTemplate({
                  params: {},
                  templatePath: result.path,
                  filePath: (await CM.getActiveFile())?.path,
                  insertMetadata: true,
                  editor: CM,
                  activeFile: false,
                  insertMode: true,
                });
              } catch (error) {
                this.plugin.handelError(error);
              }
            },
            "Create a new Note from Template"
          ).open();
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },

    {
      id: "show-modal-from-template",
      name: "Show modal from Template",
      icon: "layout",

      callback: async () => {
        try {
          new TemplatesModal(
            this.plugin.app,
            this.plugin,
            async (result) => {
              try {
                const activeView = await this.plugin.getActiveView();
                const CM = ContentManagerFactory.createContentManager(
                  activeView,
                  this.plugin,
                  {
                    templatePath: result.path,
                  }
                );

                await this.plugin.textGenerator?.templateToModal({
                  params: {},
                  templatePath: result.path,
                  editor: CM,
                  filePath: (await CM.getActiveFile())?.path,
                });
              } catch (error) {
                this.plugin.handelError(error);
              }
            },
            "Choose a template"
          ).open();
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },

    {
      id: "open-template-as-tool",
      name: "Open Template as tool",
      icon: "layout",

      callback: async () => {
        try {
          const activeView = await this.plugin.getActiveView();
          const CM = ContentManagerFactory.createContentManager(
            activeView,
            this.plugin
          );
          new TemplatesModal(
            this.plugin.app,
            this.plugin,
            async (result) => {
              this.plugin.activateView(VIEW_TOOL_ID, {
                templatePath: result.path,
                title: result.name,
                editor: CM,
                openInPopout: true,
              });
            },
            "Choose a template"
          ).open();
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },

    {
      id: "open-playground",
      name: "Open Template playground",
      icon: "layout",

      callback: async () => {
        try {
          this.plugin.activateView(VIEW_Playground_ID, {
            editor: this.plugin.app.workspace.activeEditor?.editor,
            openInPopout: false,
          });
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },
    {
      id: "set-max-tokens",
      name: "Set Max Tokens",
      icon: "separator-horizontal",

      callback: async () => {
        new SetMaxTokens(
          this.plugin.app,
          this.plugin,
          this.plugin.settings.max_tokens.toString(),
          async (result: string) => {
            this.plugin.settings.max_tokens = parseInt(result, 10);
            await this.plugin.saveSettings();
            new Notice(`Set Max Tokens to ${result}!`);
            this.plugin.updateStatusBar("");
          }
        ).open();
      },
    },

    {
      id: "set-provider",
      name: "Choose an LLM Provider",
      icon: "list-start",

      callback: async () => {
        try {
          new SetLLMProvider(
            this.plugin.app,
            this.plugin,
            async (selectedLLMName) => {
              console.log(selectedLLMName);
              if (!selectedLLMName) return;

              const llm =
                this.plugin.textGenerator?.LLMRegistry?.get(selectedLLMName);
              if (llm) {
                this.plugin.settings.selectedProvider = selectedLLMName as any;
              }

              this.plugin.textGenerator?.load();
              await this.plugin.saveSettings();
            }
          ).open();
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },

    {
      id: "set-model",
      name: "Choose a Model",
      icon: "list-start",

      callback: async () => {
        try {
          new SetModel(this.plugin.app, this.plugin, async (selectedModel) => {
            console.log(selectedModel);
            const provider = this.plugin.settings.selectedProvider as string;
            if (!provider || !this.plugin.settings.LLMProviderOptions[provider])
              return;

            this.plugin.settings.LLMProviderOptions[provider].model =
              selectedModel;
            await this.plugin.saveSettings();
          }).open();
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },

    {
      id: "package-manager",
      name: "Template Packages Manager",
      icon: "boxes",

      callback: async () => {
        new PackageManagerUI(
          this.plugin.app,
          this.plugin,
          async (result: string) => {}
        ).open();
      },
    },

    {
      id: "create-template",
      name: "Create a Template",
      icon: "plus",

      callback: async () => {
        try {
          const activeView = await this.plugin.getActiveView();
          const CM = ContentManagerFactory.createContentManager(
            activeView,
            this.plugin
          );

          await this.plugin.textGenerator?.createTemplateFromEditor(CM);
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },

    // {
    //   id: "get-title",
    //   name: "Generate a title",
    //   icon: "heading",
    //   callback: async() => {
    //

    //     try {
    //       const CM = ContentManagerCls.compile(
    //         await this.plugin.getActiveView(),
    //         this.plugin
    //       );
    //       const file = await CM.getActiveFile();

    //       let prompt = ``;

    //       let templateContent =
    //         this.plugin.defaultSettings.advancedOptions?.generateTitleInstruct;

    //       try {
    //         if (
    //           this.plugin.settings.advancedOptions?.generateTitleInstructEnabled
    //         ) {
    //           templateContent =
    //             this.plugin.settings.advancedOptions?.generateTitleInstruct ||
    //             this.plugin.defaultSettings.advancedOptions
    //               ?.generateTitleInstruct;
    //         }

    //         const templateContext =
    //           await this.plugin.contextManager?.getTemplateContext({
    //             editor: ContentManagerCls.compile(
    //               await this.plugin.getActiveView(),
    //               this.plugin,
    //               {
    //                 templateContent,
    //               }
    //             ),
    //             templateContent,
    //             filePath: file?.path,
    //           });

    //         templateContext.content = (await CM.getValue()).trim();

    //         const splittedTemplate = this.plugin.contextManager?.splitTemplate(
    //           templateContent || ""
    //         );

    //         prompt =
    //           (await splittedTemplate?.inputTemplate?.(templateContext)) ?? "";
    //       } catch (err: any) {
    //         logger(err);
    //       }

    //       const generatedTitle = await this.plugin.textGenerator?.gen(
    //         prompt,
    //         {}
    //       );

    //       const sanitizedTitle = generatedTitle
    //         ?.trim()
    //         .replaceAll("\\", "")
    //         .replace(/[*\\"/<>:|?\.]/g, "")
    //         .replace(/^\n*/g, "");

    //       if (!file) return logger(`No active file was detected`);

    //       const renamedFilePath = file.path.replace(
    //         file.name,
    //         `${sanitizedTitle}.${file.extension}`
    //       );

    //       await this.plugin.app.fileManager.renameFile(file, renamedFilePath);

    //       logger(`Generated a title: ${sanitizedTitle}`);
    //     } catch (error) {
    //       this.plugin.handelError(error);
    //     }
    //   },
    // },

    {
      id: "auto-suggest",
      name: "Turn on or off the auto suggestion",
      icon: "heading",
      editorCallback: async (editor: Editor) => {
        this.plugin.settings.autoSuggestOptions.isEnabled =
          !this.plugin.settings.autoSuggestOptions.isEnabled;
        await this.plugin.saveSettings();

        this.plugin.autoSuggest?.renderStatusBar();

        if (this.plugin.settings.autoSuggestOptions.isEnabled) {
          new Notice(`Auto Suggestion is on!`);
        } else {
          new Notice(`Auto Suggestion is off!`);
        }
      },
    },

    {
      id: "calculate-tokens",
      name: "Estimate tokens for the current document",
      icon: "heading",
      callback: async () => {
        try {
          const activeView = await this.plugin.getActiveView();
          const CM = ContentManagerFactory.createContentManager(
            activeView,
            this.plugin
          );

          const context = await this.plugin.contextManager?.getContext({
            editor: CM,
            filePath: (await CM.getActiveFile())?.path,
            insertMetadata: true,
            additionalOpts: {
              estimatingMode: true,
            },
          });
          await this.showTokens(context);
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },

    {
      id: "calculate-tokens-for-template",
      name: "Estimate tokens for a Template",
      icon: "layout",

      callback: async () => {
        try {
          new TemplatesModal(
            this.plugin.app,
            this.plugin,
            async (result) => {
              try {
                const activeView = await this.plugin.getActiveView();
                const CM = ContentManagerFactory.createContentManager(
                  activeView,
                  this.plugin,
                  {
                    templatePath: result.path,
                  }
                );

                const context = await this.plugin.contextManager?.getContext({
                  editor: CM,
                  filePath: (await CM.getActiveFile())?.path,
                  insertMetadata: true,
                  templatePath: result.path,
                  additionalOpts: {
                    estimatingMode: true,
                  },
                });

                await this.showTokens(context);
              } catch (error) {
                this.plugin.handelError(error);
              }
            },
            "Choose a template"
          ).open();
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },
    {
      id: "text-extractor-tool",
      name: "Text extractor tool",
      icon: "layout",
      callback: async () => {
        try {
          const activeView = await this.plugin.getActiveView();
          const CM = ContentManagerFactory.createContentManager(
            activeView,
            this.plugin
          );
          new TextExtractorTool(this.plugin.app, this.plugin, CM).open();
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },
    {
      id: "text-extractor-tool-inline",
      name: "Text extractor tool inline",
      icon: "layout",
      callback: async () => {
        try {
          const activeView = await this.plugin.getActiveView();
          const CM = ContentManagerFactory.createContentManager(
            activeView,
            this.plugin
          );
          await new TextExtractorTool(
            this.plugin.app,
            this.plugin,
            CM
          ).headless();
        } catch (error) {
          this.plugin.handelError(error);
        }
      },
    },
    {
      id: "stop-stream",
      name: "Stop stream",
      icon: "layout",
      callback: async () => {
        if (!this.plugin.textGenerator?.signalController?.signal.aborted) {
          this.plugin.textGenerator?.endLoading();
        }
      },
    },
    {
      id: "reload",
      name: "Reload plugin",
      icon: "layout",
      callback: async () => {
        this.plugin.reload();
      },
    },
  ];

  constructor(plugin: TextGeneratorPlugin) {
    this.plugin = plugin;
  }

  async addCommands() {
    // call the function before testing for onload document, just to make sure it is getting called event tho the document is already loaded
    const cmds = this.commands.filter(
      (cmd) =>
        this.plugin.settings.options[
          cmd.id as keyof typeof this.plugin.settings.options
        ] !== false
    );

    const templates = await this.plugin.textGenerator?.updateTemplatesCache();

    const templatesWithCommands = templates?.filter((t) => t?.commands);
    logger("Templates with commands ", { templatesWithCommands });

    templatesWithCommands?.forEach((template) => {
      template.commands?.forEach((command) => {
        logger("Template commands ", { template, command });
        const cmd: Command = {
          id: `${template.path.split("/").slice(-2, -1)[0]}-${command}-${
            template.id
          }`,
          name: `${template.name || template.id} (${command})`,
          callback: async () => {
            const activeView = await this.plugin.getActiveView();

            const CM = ContentManagerFactory.createContentManager(
              activeView,
              this.plugin,
              {
                templatePath: template.path,
              }
            );

            const filePath = (await CM.getActiveFile())?.path;
            try {
              switch (command) {
                case "generate":
                  await this.plugin.textGenerator?.generateFromTemplate({
                    params: {},
                    templatePath: template.path,
                    insertMetadata: true,
                    editor: CM,
                    activeFile: true,
                  });
                  break;
                case "insert":
                  await this.plugin.textGenerator?.generateFromTemplate({
                    params: {},
                    templatePath: template.path,
                    insertMetadata: true,
                    editor: CM,
                    activeFile: true,
                    insertMode: true,
                  });
                  break;
                case "generate&create":
                  await this.plugin.textGenerator?.generateFromTemplate({
                    params: {},
                    templatePath: template.path,
                    insertMetadata: true,
                    editor: CM,
                    activeFile: false,
                  });
                  break;
                case "insert&create":
                  await this.plugin.textGenerator?.generateFromTemplate({
                    params: {},
                    templatePath: template.path,
                    insertMetadata: true,
                    editor: CM,
                    activeFile: false,
                    insertMode: true,
                  });
                  break;
                case "modal":
                  await this.plugin.textGenerator?.templateToModal({
                    params: {},
                    templatePath: template.path,
                    editor: CM,
                    filePath,
                  });
                  break;
                case "clipboard":
                  await this.plugin.textGenerator?.generateToClipboard(
                    {},
                    template.path,
                    true,
                    CM
                  );
                  break;
                case "estimate":
                  {
                    const context =
                      await this.plugin.contextManager?.getContext({
                        editor: CM,
                        filePath,
                        insertMetadata: true,
                        templatePath: template.path,
                        additionalOpts: {
                          estimatingMode: true,
                        },
                      });
                    await this.showTokens(context);
                  }
                  break;
                case "tool":
                  this.plugin.activateView(VIEW_TOOL_ID, {
                    templatePath: template.path,
                    title: template.id || template.name,
                    openInPopout: true,
                    editor: CM,
                  });
                  break;

                default:
                  console.error(
                    "command does not work outside of an editor",
                    command
                  );
                  break;
              }
            } catch (error) {
              this.plugin.handelError(error);
            }
          },
        };
        logger("command ", { cmd, template });
        cmds.push(cmd);
      });
    });

    cmds.forEach(async (command) => {
      this.plugin.addCommand({
        ...command,
        editorCallback: command.editorCallback?.bind(this),
        callback: command.callback?.bind(this),
      });
    });
  }
}
