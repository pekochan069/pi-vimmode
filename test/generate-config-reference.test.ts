import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import type { VimConfigPropertyMetadata } from "../src/config-metadata.ts";

import {
  ACTION_MARKERS,
  PROPERTY_MARKERS,
  renderActionReference,
  renderConfigReference,
  renderPropertyReference,
  replaceGeneratedRegions,
  validateLocalLinks,
  validateMetadata,
} from "../scripts/generate-config-reference.ts";
import { VIM_ACTION_METADATA, VIM_CONFIG_PROPERTY_METADATA } from "../src/config-metadata.ts";

const guide = readFileSync("docs/config.md", "utf8");

describe("generated config reference", () => {
  test("renders committed guide deterministically with resolvable aliases", () => {
    const first = renderConfigReference(guide);
    expect(renderConfigReference(first)).toBe(first);
    expect(first).toBe(guide);
    validateLocalLinks(first);
    expect(first.match(/<a id="config-property-/g)).toHaveLength(39);
    expect(first.match(/<a id="config-action-/g)).toHaveLength(109);
    expect(first).not.toContain("vimmode.keybindings");
    expect(first).toContain(`- Default keys: ${"`".repeat(5)}`);
  });

  test("sorts property and action entries by canonical ID", () => {
    const properties = renderPropertyReference(VIM_CONFIG_PROPERTY_METADATA);
    const actions = renderActionReference(VIM_ACTION_METADATA);
    expect(properties).toContain("### `vim`");
    expect(properties).toContain("### `vim.cursor`");
    expect(properties).toContain("### `vim.promptTransforms`");
    expect(properties).toContain("#### `vim.cursor.insert`");
    expect(properties.indexOf("vim.cursor.insert")).toBeLessThan(
      properties.indexOf("vim.cursor.normal"),
    );
    expect(actions).toContain("### `vim.action.command`");
    expect(actions).toContain("#### `command.easymotion`");
    expect(actions.indexOf("command.easymotion")).toBeLessThan(
      actions.indexOf("command.findCharBackward"),
    );
  });

  test("reports duplicate and missing metadata", () => {
    expect(() =>
      validateMetadata(
        [...VIM_CONFIG_PROPERTY_METADATA, VIM_CONFIG_PROPERTY_METADATA[0]!],
        VIM_ACTION_METADATA,
      ),
    ).toThrow(/duplicate property path/);
    expect(() =>
      validateMetadata(
        VIM_CONFIG_PROPERTY_METADATA.filter(({ configPath }) => configPath !== "leader"),
        VIM_ACTION_METADATA,
      ),
    ).toThrow(/missing public property metadata: vim\.leader/);
    expect(() =>
      validateMetadata(
        VIM_CONFIG_PROPERTY_METADATA,
        VIM_ACTION_METADATA.filter(({ id }) => id !== "escape"),
      ),
    ).toThrow(/missing public action metadata: escape/);
    expect(() =>
      validateMetadata(
        VIM_CONFIG_PROPERTY_METADATA.map((property) =>
          property.configPath === "leader"
            ? { ...property, jsonPaths: ["piVimMode.notReal"] }
            : property,
        ) as VimConfigPropertyMetadata[],
        VIM_ACTION_METADATA,
      ),
    ).toThrow(/unsupported JSON crosswalk: piVimMode\.notReal/);
  });

  test("rejects missing or duplicate marker pairs and unresolved links", () => {
    const blocks = { properties: "properties", actions: "actions" };
    expect(() => replaceGeneratedRegions("", blocks)).toThrow(/Expected one marker pair/);
    const duplicateProperties = `${guide}${PROPERTY_MARKERS.begin}`;
    expect(() => replaceGeneratedRegions(duplicateProperties, blocks)).toThrow(
      /Expected one marker pair/,
    );
    expect(() => validateLocalLinks("[broken](#missing)")).toThrow(/Unresolved generated anchors/);
    expect(() => validateLocalLinks('<a id="duplicate"></a>\n<a id="duplicate"></a>')).toThrow(
      /Duplicate document anchors: duplicate/,
    );
    expect(ACTION_MARKERS.begin).toContain("GENERATED CONFIG ACTIONS");
  });
});
