import { App, Notice, FuzzySuggestModal, FuzzyMatch } from "obsidian";
import TextGeneratorPlugin from "src/main";
import { PromptTemplate } from "src/types";
import debug from "debug";

const logger = debug("genii:model");

export class TemplatesModal extends FuzzySuggestModal<PromptTemplate> {
  plugin: TextGeneratorPlugin;
  onChoose: (result: PromptTemplate) => void;
  constructor(
    app: App,
    plugin: TextGeneratorPlugin,
    onChoose: (result: PromptTemplate) => void,
    placeholder = "Select a template"
  ) {
    super(app);
    this.onChoose = onChoose;
    this.plugin = plugin;
    this.setPlaceholder(placeholder);
  }

  getItems() {
    const viewType = this.plugin.app.workspace.activeLeaf?.view.getViewType();
    return (
      this.plugin.textGenerator
        ?.getTemplates()
        // show only templates that works with this view type
        .filter(
          (t) => !viewType || !t.viewTypes || t.viewTypes?.includes(viewType)
        ) as any
    );
  }

  // Renders each suggestion item.
  renderSuggestion(template: FuzzyMatch<PromptTemplate>, el: HTMLElement) {
    logger("renderSuggestion", template);
    el.createEl("div", { text: template.item.name });
    el.createEl("small", {
      text: template.item.description?.substring(0, 150),
      cls: "plug-tg-text-sm plug-tg-ml-6",
    });
    el.createEl("div", {});
    el.createEl("small", { text: template.item.path, cls: "path" });
    logger("renderSuggestion end", template);
  }

  calculateMatchScore(
    item: PromptTemplate & { id: string },
    queryString: string
  ): number {
    const itemText = this.getItemText(item).toLowerCase();

    // Calculate match score based on various factors
    const index = itemText.indexOf(queryString);
    const startsWithQuery = index === 0;
    const containsQuery = index !== -1;

    let matchScore = 0;

    // Assign higher match scores for better matches
    if (startsWithQuery) {
      matchScore += 2;
    } else if (containsQuery) {
      matchScore += 1;
    }

    // You can add more factors to influence the match score based on your requirements

    return matchScore;
  }

  getItemText(template: PromptTemplate): string {
    return `${template.tags || ""} \
${!template.name && !template.id ? template.path || "" : ""} \
${template.id || ""} \
${template.name || ""} \
${this.getItemPackageId(template)} \
${template.author || ""} \
${template.description || ""}`;
  }

  getItemPackageId(template: PromptTemplate): string {
    return template.path?.split("/").reverse()[1] || template.id;
  }

  onChooseItem(template: PromptTemplate, evt: MouseEvent | KeyboardEvent) {
    logger("onChooseItem", template);
    new Notice(`Selected ${template.name}`);
    this.onChoose(template);
  }
}
