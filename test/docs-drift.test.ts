import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import { DEFAULT_VIM_OPTIONS } from "../src/config.ts";
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
});
