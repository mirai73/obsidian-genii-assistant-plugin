jest.mock("obsidian");
import { App } from "obsidian";
import GeniiAssistantPlugin from "../src/main";
import ContextManager from "../src/scope/context-manager";
import manifest from "../manifest.json";

jest.mock("../src/main");
jest.mock("../src/scope/content-manager/md");

const contextManager = new ContextManager(
  new App(),
  new GeniiAssistantPlugin(new App(), manifest)
);

it("should be able to create a new context", () => {
  const result = contextManager.splitTemplate("ABC");
  expect(result).toBe("ABC");
});
