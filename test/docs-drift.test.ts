import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import {
  ACTION_KEYBINDING_PRESETS,
  ACTION_KEYBINDING_RECIPES,
} from "../src/action-keybinding-recipes.ts";
import { DEFAULT_VIM_OPTIONS, resolveVimOptions } from "../src/config.ts";
import { DIAGNOSTIC_ACTIONS } from "../src/diagnostic-actions.ts";
import { parseExCommand } from "../src/ex.ts";
import { keybindingDiscoveryPopup, keybindingsPopup } from "../src/keybinding-discovery-popup.ts";
import {
  PROMPT_TRANSFORM_ACTIONS,
  bindablePromptTransformActionIds,
} from "../src/prompt-transform-actions.ts";
import { runtimeHelpEntries, runtimeHelpMessage } from "../src/runtime-help.ts";
import {
  ACTION_RECIPE_DOCS_METADATA,
  DIAGNOSTIC_ACTION_DOCS_METADATA,
  POPUP_COMMAND_DOCS_METADATA,
} from "./support/runtime-docs-metadata.ts";

const readme = readFileSync("README.md", "utf8");
const configDoc = readFileSync("docs/config.md", "utf8");
const featuresDoc = readFileSync("docs/features.md", "utf8");
const settingsDoc = readFileSync("docs/settings.md", "utf8");
const allUserDocs = `${configDoc}\n${featuresDoc}\n${settingsDoc}`;
const globalConfigExamples = [
  "examples/pi-vimmode.config.js",
  "examples/keymaps.config.js",
  "examples/async.config.js",
  "examples/imported-preset.config.js",
].map((path) => readFileSync(path, "utf8"));

function expectSameIds(actual: readonly string[], expected: readonly string[]) {
  expect([...actual].sort()).toEqual([...expected].sort());
  expect(new Set(actual).size).toBe(actual.length);
  expect(new Set(expected).size).toBe(expected.length);
}

describe("config guide documentation", () => {
  test("trusted config guide order and discovery links stay stable", () => {
    const sections = ["basic-setup", "generated-properties", "advanced-setup", "safety-semantics"];
    const positions = sections.map((anchor) => configDoc.indexOf(`id="${anchor}"`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));
    expect(configDoc).toContain("unsandboxed trusted code");
    expect(configDoc).toContain("full Pi process privileges");
    expect(readme).toContain("docs/config.md#basic-setup");
    expect(settingsDoc).toContain("config.md#basic-setup");
    expect(runtimeHelpMessage("settings", { options: DEFAULT_VIM_OPTIONS })).toContain(
      "docs/config.md#basic-setup",
    );
  });

  test("global config examples resolve types from Pi's installed package", () => {
    const annotation = '/** @type {import("./npm/node_modules/pi-vimmode/config").VimConfig} */';
    for (const example of globalConfigExamples) expect(example).toContain(annotation);
  });

  test("reload docs name every preserved and cleared lifecycle state", () => {
    const reloadSemantics =
      configDoc.match(/Reload preserves[^\n]+cursor style apply immediately\./)?.[0] ?? "";
    for (const state of [
      "pending count",
      "key prefix",
      "character target",
      "register target",
      "mark target",
      "macro target",
    ]) {
      expect(reloadSemantics).toContain(state);
    }
    expect(reloadSemantics).toContain("It clears");
  });

  test("runtime help registry entries carry drift anchors", () => {
    const entries = runtimeHelpEntries({ options: DEFAULT_VIM_OPTIONS });
    for (const entry of entries) {
      expect(entry.docsAnchor).toBeTruthy();
      expect(entry.specAnchor).toBeTruthy();
      expect(entry.testAnchors.length).toBeGreaterThanOrEqual(1);
    }
  });

  test("runtime help registry anchors exist in feature docs, specs, and tests", () => {
    for (const entry of runtimeHelpEntries({ options: DEFAULT_VIM_OPTIONS })) {
      expect(featuresDoc).toContain(`<!-- ${entry.docsAnchor} -->`);
      expect(existsSync(entry.specAnchor)).toBe(true);
      for (const testAnchor of entry.testAnchors) expect(existsSync(testAnchor)).toBe(true);
    }
  });
});

describe("diagnostic action documentation", () => {
  test("diagnostic action metadata covers every runtime entry both directions", () => {
    const runtimeIds = DIAGNOSTIC_ACTIONS.map((entry) => entry.id);
    const metadataIds = DIAGNOSTIC_ACTION_DOCS_METADATA.map((entry) => entry.id);
    expectSameIds(runtimeIds, metadataIds);
  });

  test("diagnostic action metadata anchors exist in feature docs, specs, and tests", () => {
    for (const entry of DIAGNOSTIC_ACTION_DOCS_METADATA) {
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
});

describe("documentation behavior", () => {
  test("feature docs describe every popup-backed read-only Ex command", () => {
    for (const entry of POPUP_COMMAND_DOCS_METADATA) {
      expect(featuresDoc).toContain(entry.command);
      expect(featuresDoc).toContain(`<!-- ${entry.docsAnchor} -->`);
      expect(parseExCommand(entry.parserExample, { lineCount: 5, cursorLine: 1 }).type).not.toBe(
        "error",
      );
    }
    expect(featuresDoc).not.toContain("Other runtime help and diagnostic commands remain compact");
    expect(featuresDoc).not.toContain(
      "Diagnostic and runtime help commands show transient info text",
    );
  });

  test("action recipe metadata covers every recipe and preset both directions", () => {
    const recipeIds = ACTION_KEYBINDING_RECIPES.map((recipe) => recipe.id);
    const presetIds = ACTION_KEYBINDING_PRESETS.map((preset) => preset.id);
    const metadataIds = ACTION_RECIPE_DOCS_METADATA.map((entry) => entry.id);
    expectSameIds(recipeIds, metadataIds);
    expectSameIds(presetIds, metadataIds);
  });

  test("docs cover WORD and previous-end motion names without lowercase retune claims", () => {
    for (const key of ["`W`", "`B`", "`E`", "`ge`", "`gE`", "dW", "cE", "ygE"]) {
      expect(featuresDoc).toContain(key);
    }
    for (const action of [
      "wordForwardBig",
      "wordBackwardBig",
      "wordEndBig",
      "wordPreviousEnd",
      "wordPreviousEndBig",
    ]) {
      expect(settingsDoc).toContain(action);
    }
    expect(settingsDoc).toContain('["W"]');
    expect(settingsDoc).toContain('["B"]');
    expect(settingsDoc).toContain('["E"]');
    expect(settingsDoc).toContain('["ge"]');
    expect(settingsDoc).toContain('["gE"]');
    expect(featuresDoc).toContain("Lowercase `w`, `b`, and `e` keep their current");
    expect(allUserDocs).not.toMatch(/lowercase[^\n.]{0,80}punctuation-aware/i);
    expect(allUserDocs).toContain("no subword/camelCase navigation");
    expect(allUserDocs).toContain("display-line motions");
  });

  test("docs cover paragraph motion and text object names and defaults", () => {
    for (const key of ["`{`", "`}`", "`ip`", "`ap`", "d}", "c{", "dap"]) {
      expect(featuresDoc).toContain(key);
    }
    for (const action of ["paragraphForward", "paragraphBackward"]) {
      expect(settingsDoc).toContain(action);
    }
    expect(settingsDoc).toContain("textObjects.targets.paragraph");
    expect(settingsDoc).toContain('["{"]');
    expect(settingsDoc).toContain('["}"]');
    expect(settingsDoc).toContain('["p"]');
    expect(featuresDoc).toContain("blank-line");
    expect(featuresDoc).toContain("paragraph");
  });

  test("docs cannot regress :noh or :nohlsearch into unsupported claims", () => {
    const forbidden =
      /(?:unsupported|not supported|no support)[^\n.]{0,120}:(?:noh|nohlsearch)|:(?:noh|nohlsearch)[^\n.]{0,120}(?:unsupported|not supported|no support)/i;
    expect(allUserDocs.match(forbidden)?.[0]).toBeUndefined();
    expect(featuresDoc).toContain(":nohlsearch");
    expect(settingsDoc).toContain(":noh");
  });
});

describe("documentation data contracts", () => {
  test("settings docs stay aligned with source-backed defaults", () => {
    const defaults: Record<string, string> = {
      "piVimMode.startMode": `"${DEFAULT_VIM_OPTIONS.startMode}"`,
      "piVimMode.cursor.insert": `"${DEFAULT_VIM_OPTIONS.cursor.insert}"`,
      "piVimMode.cursor.normal": `"${DEFAULT_VIM_OPTIONS.cursor.normal}"`,
      "piVimMode.keymap.escape": JSON.stringify(DEFAULT_VIM_OPTIONS.keymap!.escape),
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
    expect(allUserDocs).not.toContain("promptTransform.*");
    expect(allUserDocs).not.toContain("promptTransform.reflow");
    expect(allUserDocs).not.toMatch(
      /legacy `promptTransform\.\*`[^\n]*(supported|searchable|alias)/i,
    );
    expect(allUserDocs).not.toMatch(/promptTransform\.\*[^\n]*(diagnostic|search|config)/i);
  });
});

describe("keybinding popup documentation", () => {
  test("read-only popup docs and registry-backed action IDs stay aligned", () => {
    const popup = keybindingDiscoveryPopup(DEFAULT_VIM_OPTIONS);
    const dedicatedPopup = keybindingsPopup(DEFAULT_VIM_OPTIONS);
    const popupText = [
      popup.title,
      ...popup.lines,
      dedicatedPopup.title,
      ...dedicatedPopup.lines,
    ].join("\n");
    const popupIds = new Set(popupText.match(/prompt\.transform\.[a-z]+/g) ?? []);

    expect(featuresDoc).toContain(`<!-- ${POPUP_COMMAND_DOCS_METADATA[0]!.docsAnchor} -->`);
    expect(featuresDoc).toContain(":features keybindings");
    expect(featuresDoc).toContain(":keybindings");
    expect(featuresDoc).toContain(":keybindings <query>");
    expect(settingsDoc).toContain("piVimMode.keymap.commands.showKeybindings");
    expect(settingsDoc).toContain("piVimMode.keymap.escape");
    expect(featuresDoc).toContain("piVimMode.keymap.escape");
    expect(featuresDoc).toContain("Escape aliases");
    expect(settingsDoc).toContain("Raw printable text chords");
    expect(featuresDoc).toContain("dedicated bounded read-only overlay popup");
    expect(featuresDoc).toContain("keybinding discovery entry point");
    expect(featuresDoc).toContain("j`/`k`");
    expect(featuresDoc).toContain("arrow-down/arrow-up");
    expect(featuresDoc).toContain("does not edit the prompt");
    expect(featuresDoc).toContain("`:messages` history");
    expect(featuresDoc).toContain("Esc");
    expect(featuresDoc).toContain("Ctrl-C");
    expect(featuresDoc).toContain("Ctrl-G");
    expect(featuresDoc).toContain("no runtime `:map`");
    expect(featuresDoc).toContain("no runtime `:action`");
    expect(featuresDoc).toContain("no recursive mappings");
    expect(featuresDoc).toContain("no Vimscript");
    expect(featuresDoc).toContain("no command palette");
    expect(featuresDoc).toContain("no Vim help tags");
    expect(featuresDoc).toContain("no diagnostic/help action keybinding dispatch");
    expect(featuresDoc).toContain("no default action keybindings");
    expect(featuresDoc).toContain("no default keybinding for `:keybindings`");
    expect(featuresDoc).toContain("no unbounded output log");
    const bindableIds: readonly string[] = bindablePromptTransformActionIds();
    for (const id of popupIds) {
      expect(bindableIds).toContain(id);
      expect(allUserDocs).toContain(id);
    }
  });
});

describe("action keybinding documentation", () => {
  test("action keybinding recipe docs anchors and configs stay aligned", () => {
    for (const recipe of ACTION_KEYBINDING_RECIPES) {
      const docs = ACTION_RECIPE_DOCS_METADATA.find((entry) => entry.id === recipe.id)!;
      expect(allUserDocs).toContain(`<!-- ${docs.docsAnchor} -->`);
      const result = resolveVimOptions({ piVimMode: { keymap: { actions: recipe.actions } } });
      expect(result.warnings).toEqual([]);
      for (const binding of recipe.expected) {
        expect(bindablePromptTransformActionIds()).toContain(binding.actionId);
        expect(allUserDocs).toContain(binding.actionId);
        expect(allUserDocs).toContain(binding.key);
      }
    }
  });

  test("action keybinding preset docs anchors and configs stay aligned", () => {
    expect(allUserDocs).toContain("piVimMode.keymap.actionPresets");
    for (const preset of ACTION_KEYBINDING_PRESETS) {
      const docs = ACTION_RECIPE_DOCS_METADATA.find((entry) => entry.id === preset.id)!;
      expect(allUserDocs).toContain(`<!-- ${docs.presetDocsAnchor} -->`);
      expect(allUserDocs).toContain(preset.id);
      expect(allUserDocs).toContain("no default");
      expect(allUserDocs).toContain("no plugin API");
      const result = resolveVimOptions({
        piVimMode: { keymap: { actionPresets: [preset.id] } },
      });
      expect(result.warnings).toEqual([]);
      expect(result.options.keymap?.actions.accepted).toEqual(preset.expected);
      for (const binding of preset.expected) {
        expect(bindablePromptTransformActionIds()).toContain(binding.actionId);
        expect(allUserDocs).toContain(binding.actionId);
        expect(allUserDocs).toContain(binding.key);
      }
    }
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
