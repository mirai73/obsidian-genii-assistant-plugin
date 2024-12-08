import { IGNORE_IN_YAML } from "#/constants";
import { Handlebars } from "#/helpers/handlebars-helpers";
import { removeYAML } from "#/utils";
import { getHBValues } from "#/utils/barhandles";
import debug from "debug";
import set from "lodash.set";

const logger = debug("genii:ContextManager:Helpers");

export interface CodeBlock {
  type: string;
  content: string;
  full: string;
}

export type CodeBlockProcessor = (block: CodeBlock) => Promise<string>;

export function clearFrontMatterFromIgnored(yml: Record<string, any>) {
  const objNew: Record<string, any> = {};

  for (const key in yml) {
    if (
      Object.prototype.hasOwnProperty.call(yml, key) &&
      !IGNORE_IN_YAML[key]
    ) {
      objNew[key] = yml[key];
    }
  }
  return objNew;
}

export function templateContains(variables: string[], searchVariable: string) {
  return variables.some((variable) => variable.includes(searchVariable));
}

export function getFrontmatter(fileCache: any) {
  return fileCache?.frontmatter;
}

export function getHighlights(content: string) {
  const highlights =
    content.match(/==(.*?)==/gi)?.map((s: any) => s.replaceAll("==", "")) ?? [];
  return highlights;
}

export async function processCodeBlocks(
  input: string,
  processor: CodeBlockProcessor
): Promise<string> {
  const regex = /```(.+?)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let output = input;

  while ((match = regex.exec(input)) !== null) {
    const full = match[0];
    const type = match[1];
    const content = match[2];
    const block = { type, content, full };
    const replacement = await processor(block);
    output = output.replace(full, replacement);
  }
  return output;
}

export function getMetaDataAsStr(frontmatter: Record<string, string | any[]>) {
  let cleanFrontMatter = "";
  for (const [key, value] of Object.entries(frontmatter) as [
    string,
    string | any[], // or array
  ][]) {
    if (
      !value ||
      key.includes(".") ||
      IGNORE_IN_YAML[key] ||
      key.startsWith("body") ||
      key.startsWith("header")
    )
      continue;
    if (Array.isArray(value)) {
      cleanFrontMatter += `${key} : `;
      value.forEach((v) => {
        cleanFrontMatter += `${v}, `;
      });
      cleanFrontMatter += `\n`;
    } else if (typeof value === "object") {
      continue;
    } else {
      cleanFrontMatter += `${key} : ${value} \n`;
    }
  }
  return cleanFrontMatter;
}

export function getHBVariablesOfTemplate(...sections: (string | undefined)[]) {
  const vars = new Set<string>([]);

  for (const section of sections) {
    for (const v of getHBValues(section || "")) {
      vars.add(v);
    }
  }

  return Array.from(vars.values());
}

export function getHBVariablesObjectOfTemplate(
  ...sections: (string | undefined)[]
) {
  const vars: Record<string, true> = {};

  for (const section of sections) {
    for (const v of getHBValues(section || "")) {
      vars[v] = true;
    }
  }

  return vars;
}

export function getOptionsUnder(
  prefix: string,
  obj: Record<string, any> | undefined
) {
  let options: Record<string, any> = {};

  Object.entries(obj || {}).map(([key, data]) => {
    if (key.startsWith(prefix)) {
      options = set(options, key, data);
    }
  });

  return options[prefix.substring(0, prefix.length - 1)];
}

export function extractFrontmatterFromTemplateContent(templateContent: string) {
  const regex = /---([\s\S]*?)---/;
  const match = templateContent.match(regex);

  // turn yaml it into an object
  const yaml = match ? match[1] : "";
  const obj = yamlToObj(yaml);
  return obj;
}

function yamlToObj(yaml: string) {
  const frontmatterRegex = /---\n([\s\S]+?)\n---/;
  const match = yaml.match(frontmatterRegex);
  if (!match) return {};

  const frontmatterStr = match[1];
  const lines = frontmatterStr.split("\n");
  const frontmatter: Record<string, any> = {};
  lines.forEach((line) => {
    const [key, value] = line.split(": ").map((s) => s.trim());
    frontmatter[key] = value;
  });
  return frontmatter;
}
