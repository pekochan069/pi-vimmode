import { describe, expect, test } from "bun:test";

import type { VimMode } from "../src/types.ts";

import {
  CONFIG_LEAVES,
  VIM_ACTION_METADATA,
  VIM_CONFIG_PROPERTY_METADATA,
  VIM_MAPPING_SCOPES,
} from "../src/config-metadata.ts";
import { DEFAULT_VIM_OPTIONS } from "../src/config.ts";
import { PROTECTED_SHORTCUTS } from "../src/customization.ts";
import { DIAGNOSTIC_ACTIONS } from "../src/diagnostic-actions.ts";
import {
  KEYMAP_COMMAND_DESCRIPTORS,
  KEYMAP_INSERT_DESCRIPTORS,
  KEYMAP_MARK_DESCRIPTORS,
  KEYMAP_MACRO_DESCRIPTORS,
  KEYMAP_MOTION_DESCRIPTORS,
  KEYMAP_OPERATOR_DESCRIPTORS,
  KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS,
  KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS,
} from "../src/keymap-descriptors.ts";
import { PROMPT_TRANSFORM_ACTIONS } from "../src/prompt-transform-actions.ts";

type Assert<T extends true> = T;
type OperatorPendingIsNotVimMode = Assert<"operatorPending" extends VimMode ? false : true>;

const descriptorIds = (family: string, descriptors: Record<string, unknown>) =>
  Object.keys(descriptors).map((action) => `${family}.${action}`);

const valueAtPath = (path: string): unknown =>
  path
    .split(".")
    .reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], DEFAULT_VIM_OPTIONS);

describe("canonical config metadata", () => {
  test("catalogs every existing semantic action from its current source", () => {
    const expected = [
      "escape",
      ...descriptorIds("operator", KEYMAP_OPERATOR_DESCRIPTORS),
      ...descriptorIds("motion", KEYMAP_MOTION_DESCRIPTORS),
      ...descriptorIds("command", KEYMAP_COMMAND_DESCRIPTORS),
      ...descriptorIds("macro", KEYMAP_MACRO_DESCRIPTORS),
      ...descriptorIds("mark", KEYMAP_MARK_DESCRIPTORS),
      ...descriptorIds("insert", KEYMAP_INSERT_DESCRIPTORS),
      ...descriptorIds("textObject.kind", KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS),
      ...descriptorIds("textObject.target", KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS),
      ...PROMPT_TRANSFORM_ACTIONS.map(({ id }) => id),
      ...DIAGNOSTIC_ACTIONS.map(({ id }) => id),
    ].sort();

    expect(VIM_ACTION_METADATA.map(({ id }) => id).sort()).toEqual(expected);
  });

  test("keeps operator-pending as mapping grammar, not a stable editor mode", () => {
    expect(VIM_MAPPING_SCOPES).toEqual([
      "normal",
      "visual",
      "visualLine",
      "visualBlock",
      "insert",
      "operatorPending",
    ]);
    expect(VIM_ACTION_METADATA.flatMap(({ scopes }) => scopes)).toContain("operatorPending");
    const operatorPendingIsNotVimMode: OperatorPendingIsNotVimMode = true;
    expect(operatorPendingIsNotVimMode).toBe(true);
  });

  test("scopes mark setting separately from operator mark jumps", () => {
    const scopesFor = (id: string) =>
      VIM_ACTION_METADATA.find((action) => action.id === id)?.scopes;

    expect(scopesFor("mark.set")).toEqual(["normal"]);
    expect(scopesFor("mark.jumpExact")).toEqual([
      "normal",
      "visual",
      "visualLine",
      "visualBlock",
      "operatorPending",
    ]);
    expect(scopesFor("mark.jumpLine")).toEqual([
      "normal",
      "visual",
      "visualLine",
      "visualBlock",
      "operatorPending",
    ]);
  });

  test("covers every trusted JavaScript property exactly once with docs facts", () => {
    expect(VIM_CONFIG_PROPERTY_METADATA.map(({ configPath }) => configPath)).toEqual([
      "preset",
      "leader",
      "startMode",
      "cursor.insert",
      "cursor.normal",
      "cursor.visual",
      "cursor.visualLine",
      "cursor.visualBlock",
      "keymap.actionPresets",
      "keymap.operatorMotions",
      "ui.status.enabled",
      "ui.status.position",
      "ui.status.items",
      "ui.mode.enabled",
      "ui.mode.labels",
      "ui.mode.narrowLabels",
      "ui.selection.enabled",
      "ui.selection.previewMaxChars",
      "ui.cursorPosition.enabled",
      "ui.cursorPosition.base",
      "ui.cursorPosition.format",
      "ui.workbench.reservedRows",
      "macros.enabled",
      "macros.slots",
      "macros.maxReplaySteps",
      "marks.enabled",
      "marks.slots",
      "search.highlight",
      "search.highlightCurrent",
      "search.clearOnCancel",
      "search.clearOnInsert",
      "search.maxHighlights",
      "exCommand.autocomplete",
      "feedback.noop",
      "promptStructures.enabled",
      "promptStructures.targets",
      "promptTransforms.enabled",
      "promptTransforms.actions",
      "promptTransforms.commands",
    ]);
    expect(new Set(VIM_CONFIG_PROPERTY_METADATA.map(({ anchor }) => anchor)).size).toBe(
      VIM_CONFIG_PROPERTY_METADATA.length,
    );
    for (const entry of VIM_CONFIG_PROPERTY_METADATA) {
      expect(entry.path).toBe(`vim.${entry.configPath}`);
      expect(entry.acceptedShape).not.toBe("");
      expect(entry.assignment).not.toBe("");
      expect(entry.jsonPaths).toContain(`piVimMode.${entry.configPath}`);
    }
    expect(VIM_CONFIG_PROPERTY_METADATA.find(({ configPath }) => configPath === "leader")).toEqual(
      expect.objectContaining({ aliases: ["vim.g.mapleader"] }),
    );
  });

  test("covers trusted actions once and excludes diagnostic IDs", () => {
    const bindable = VIM_ACTION_METADATA.filter(({ bindable }) => bindable);
    const expected = [
      "escape",
      ...descriptorIds("operator", KEYMAP_OPERATOR_DESCRIPTORS),
      ...descriptorIds("motion", KEYMAP_MOTION_DESCRIPTORS),
      ...descriptorIds("command", KEYMAP_COMMAND_DESCRIPTORS),
      ...descriptorIds("macro", KEYMAP_MACRO_DESCRIPTORS),
      ...descriptorIds("mark", KEYMAP_MARK_DESCRIPTORS),
      ...descriptorIds("insert", KEYMAP_INSERT_DESCRIPTORS),
      ...descriptorIds("textObject.kind", KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS),
      ...descriptorIds("textObject.target", KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS),
      ...PROMPT_TRANSFORM_ACTIONS.map(({ id }) => id),
    ].sort();
    expect(bindable.map(({ id }) => id).sort()).toEqual(expected);
    expect(new Set(bindable.map(({ anchor }) => anchor)).size).toBe(bindable.length);
    expect(bindable.find(({ id }) => id === "escape")).toEqual(
      expect.objectContaining({ factoryPath: "vim.action.escape()" }),
    );
    expect(bindable.find(({ id }) => id === "mark.jumpExact")?.publicScopes).not.toContain(
      "operatorPending",
    );
    for (const entry of VIM_ACTION_METADATA.filter(({ bindable }) => !bindable)) {
      expect(bindable.map(({ id }) => id)).not.toContain(entry.id);
    }
  });

  test("derives public scopes and prompt arguments without duplicate mappings", () => {
    for (const action of VIM_ACTION_METADATA.filter(({ bindable }) => bindable)) {
      const expectedScopes =
        action.id === "escape"
          ? VIM_MAPPING_SCOPES.filter((scope) => scope !== "normal")
          : action.scopes.filter(
              (scope) => !action.id.startsWith("mark.") || scope !== "operatorPending",
            );
      expect(action.publicScopes).toEqual(expectedScopes);
      if (action.id.startsWith("prompt.transform.")) {
        expect(action.args).toEqual(
          PROMPT_TRANSFORM_ACTIONS.find(({ id }) => id === action.id)?.args ?? [],
        );
      }
    }
  });

  test("has one source-backed default for every catalogued config leaf", () => {
    expect(new Set(CONFIG_LEAVES.map(({ path }) => path)).size).toBe(CONFIG_LEAVES.length);
    for (const leaf of CONFIG_LEAVES) expect(leaf.defaultValue).toEqual(valueAtPath(leaf.path));
    expect(CONFIG_LEAVES.map(({ path }) => path)).toContain("keymap.actionPresets");
    expect(
      CONFIG_LEAVES.find(({ path }) => path === "keymap.allowProtectedOverrides")
        ?.protectedShortcuts,
    ).toBe(PROTECTED_SHORTCUTS);
  });
});
