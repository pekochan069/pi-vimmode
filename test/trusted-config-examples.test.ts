import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { loadVimJsConfig } from "../src/config-js.ts";

const examples = join(import.meta.dir, "../examples");

async function load(name: string) {
  const result = await loadVimJsConfig(join(examples, name));
  expect(result.kind).toBe("success");
  expect(result.warnings).toEqual([]);
  if (result.kind !== "success") throw new Error(`failed to load ${name}`);
  return result.operations;
}

describe("trusted config examples", () => {
  test("basic workflow", async () => {
    expect(await load("pi-vimmode.config.js")).toContainEqual({
      kind: "leaf",
      path: "startMode",
      value: "normal",
    });
  });

  test("keymap workflow", async () => {
    const operations = await load("keymaps.config.js");
    expect(operations.filter(({ kind }) => kind === "map")).toHaveLength(4);
    expect(operations).toContainEqual({
      kind: "unmap",
      key: "zq",
      modes: ["normal"],
    });
  });

  test("async workflow", async () => {
    expect(await load("async.config.js")).toContainEqual({
      kind: "map",
      mapping: {
        kind: "action",
        actionId: "prompt.transform.reflow",
        key: "gq",
        args: { width: 88 },
        modes: ["normal"],
      },
    });
  });

  test("imported preset workflow", async () => {
    const operations = await load("imported-preset.config.js");
    expect(operations).toContainEqual({
      kind: "leaf",
      path: "keymap.actionPresets",
      value: ["markdown-wrapping"],
    });
    expect(operations).toContainEqual({ kind: "leaf", path: "startMode", value: "normal" });
  });
});
