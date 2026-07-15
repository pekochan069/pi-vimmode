import { describe, expect, test } from "bun:test";

import type { VimMode } from "../src/types.ts";

import { CONFIG_LEAVES, VIM_ACTION_METADATA, VIM_MAPPING_SCOPES } from "../src/config-metadata.ts";
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

    expect(scopesFor("mark.set")).toEqual(["normal", "visual", "visualLine", "visualBlock"]);
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
