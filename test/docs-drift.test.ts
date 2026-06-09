import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import { DEFAULT_VIM_OPTIONS, resolveVimOptions } from "../src/config.ts";
import { DIAGNOSTIC_ACTIONS } from "../src/diagnostic-actions.ts";
import { parseExCommand } from "../src/ex.ts";
import {
  PROMPT_TRANSFORM_ACTIONS,
  bindablePromptTransformActionIds,
} from "../src/prompt-transform-actions.ts";
import { runtimeHelpEntries } from "../src/runtime-help.ts";

const featuresDoc = readFileSync("docs/features.md", "utf8");
const settingsDoc = readFileSync("docs/settings.md", "utf8");
const allUserDocs = `${featuresDoc}\n${settingsDoc}`;

describe("documentation drift guard", () => {
  test("runtime help registry anchors exist in feature docs, specs, and tests", () => {
    for (const entry of runtimeHelpEntries({ options: DEFAULT_VIM_OPTIONS })) {
      expect(featuresDoc).toContain(`<!-- ${entry.docsAnchor} -->`);
      expect(existsSync(entry.specAnchor)).toBe(true);
      for (const testAnchor of entry.testAnchors) expect(existsSync(testAnchor)).toBe(true);
    }
  });

  test("diagnostic action metadata anchors exist in feature docs, specs, and tests", () => {
    for (const entry of DIAGNOSTIC_ACTIONS) {
      expect(featuresDoc).toContain(`<!-- ${entry.docsAnchor} -->`);
      expect(existsSync(entry.specAnchor)).toBe(true);
      for (const testAnchor of entry.testAnchors) expect(existsSync(testAnchor)).toBe(true);
    }
  });

  test("diagnostic action metadata maps to finite Ex parser support", () => {
    const context = { lineCount: 5, cursorLine: 1 };
    for (const entry of DIAGNOSTIC_ACTIONS) {
      const command = entry.examples[0]!.replace(/^:/, "");
      expect(parseExCommand(command, context).type).not.toBe("error");
    }
  });

  test("diagnostic action metadata is excluded from bindable action IDs", () => {
    const bindableIds = bindablePromptTransformActionIds();
    for (const entry of DIAGNOSTIC_ACTIONS) expect(bindableIds).not.toContain(entry.id);
  });

  test("feature docs describe every supported runtime help command", () => {
    for (const command of [":help", ":features", ":vimmode inspect", ":messages"]) {
      expect(featuresDoc).toContain(command);
    }
  });

  test("docs cannot regress :noh or :nohlsearch into unsupported claims", () => {
    const forbidden =
      /(?:unsupported|not supported|no support)[^\n.]{0,120}:(?:noh|nohlsearch)|:(?:noh|nohlsearch)[^\n.]{0,120}(?:unsupported|not supported|no support)/i;
    expect(allUserDocs.match(forbidden)?.[0]).toBeUndefined();
    expect(featuresDoc).toContain(":nohlsearch");
    expect(settingsDoc).toContain(":noh");
  });

  test("settings docs stay aligned with source-backed defaults", () => {
    const defaults: Record<string, string> = {
      "piVimMode.startMode": `"${DEFAULT_VIM_OPTIONS.startMode}"`,
      "piVimMode.cursor.insert": `"${DEFAULT_VIM_OPTIONS.cursor.insert}"`,
      "piVimMode.cursor.normal": `"${DEFAULT_VIM_OPTIONS.cursor.normal}"`,
      "piVimMode.search.highlight": String(DEFAULT_VIM_OPTIONS.search!.highlight),
      "piVimMode.search.maxHighlights": String(DEFAULT_VIM_OPTIONS.search!.maxHighlights),
      "piVimMode.feedback.noop": `"${DEFAULT_VIM_OPTIONS.feedback!.noop}"`,
      "piVimMode.ui.workbench.reservedRows": String(DEFAULT_VIM_OPTIONS.ui!.workbench.reservedRows),
      "piVimMode.macros.enabled": String(DEFAULT_VIM_OPTIONS.macros!.enabled),
      "piVimMode.marks.enabled": String(DEFAULT_VIM_OPTIONS.marks!.enabled),
      "piVimMode.promptStructures.enabled": String(DEFAULT_VIM_OPTIONS.promptStructures!.enabled),
      "piVimMode.promptTransforms.enabled": String(DEFAULT_VIM_OPTIONS.promptTransforms!.enabled),
    };

    for (const [path, defaultValue] of Object.entries(defaults)) {
      expect(settingsDoc).toContain(path);
      expect(settingsDoc).toContain(defaultValue);
    }
  });

  test("Ex docs do not list shipped Ex behavior as unsupported", () => {
    for (const phrase of [
      "no repeat substitution",
      "no range offsets",
      "no semicolon ranges",
      "no Ex register operands",
    ]) {
      expect(featuresDoc).not.toContain(phrase);
    }
    expect(featuresDoc).toContain(":&");
    expect(featuresDoc).toContain(":delete a");
    expect(featuresDoc).toContain("piVimMode.ui.workbench.reservedRows");
  });

  test("prompt transform action registry stays aligned with docs", () => {
    const documentedIds = new Set(allUserDocs.match(/prompt\.transform\.[a-z]+/g) ?? []);
    for (const action of PROMPT_TRANSFORM_ACTIONS) {
      expect(documentedIds.has(action.id)).toBe(true);
      expect(allUserDocs).toContain(action.docsAnchor);
    }
    for (const id of documentedIds) {
      expect(PROMPT_TRANSFORM_ACTIONS.some((action) => action.id === id)).toBe(true);
    }
    expect(allUserDocs).toContain("promptTransform.*");
  });

  test("documented keymap.actions example shape parses", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          actions: {
            "prompt.transform.reflow": ["gq", { key: "gQ", args: { width: 100 } }],
            "prompt.transform.fence": [{ key: "gT", args: { language: "ts" } }],
            "prompt.transform.quote": [{ key: "g>" }],
          },
        },
      },
    });
    expect(result.warnings).toEqual([]);
    expect(result.options.keymap?.actions.accepted.map((binding) => binding.actionId)).toEqual([
      "prompt.transform.reflow",
      "prompt.transform.reflow",
      "prompt.transform.fence",
      "prompt.transform.quote",
    ]);
  });

  test("release docs include build and package contents inspection", () => {
    expect(readFileSync("README.md", "utf8")).toContain("bun run build");
    expect(readFileSync("README.md", "utf8")).toContain("bun pm pack --dry-run");
  });
});
