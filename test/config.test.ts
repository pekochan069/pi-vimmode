import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { DEFAULT_VIM_OPTIONS, loadVimOptions, resolveVimOptions } from "../src/config.ts";

function tempSettings() {
  const dir = mkdtempSync(join(tmpdir(), "pi-vimmode-config-"));
  const globalPath = join(dir, "global.json");
  const projectDir = join(dir, "project", ".pi");
  mkdirSync(projectDir, { recursive: true });
  const projectPath = join(projectDir, "settings.json");
  return {
    dir,
    globalPath,
    projectPath,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

describe("vim config parsing", () => {
  test("uses defaults when settings are absent", () => {
    expect(resolveVimOptions(undefined).options).toEqual(DEFAULT_VIM_OPTIONS);
  });

  test("parses valid global settings", () => {
    const result = resolveVimOptions({
      piVimMode: {
        startMode: "normal",
        cursor: { insert: "underline", normal: "bar", visual: "block", visualLine: "underline" },
      },
    });
    expect(result.warnings).toEqual([]);
    expect(result.options).toEqual({
      startMode: "normal",
      cursor: { insert: "underline", normal: "bar", visual: "block", visualLine: "underline" },
    });
  });

  test("project settings override global settings field by field", () => {
    const result = resolveVimOptions(
      { piVimMode: { startMode: "normal", cursor: { insert: "underline", visual: "underline" } } },
      { piVimMode: { cursor: { insert: "bar", visualLine: "bar" } } },
    );
    expect(result.options).toEqual({
      startMode: "normal",
      cursor: { insert: "bar", normal: "block", visual: "underline", visualLine: "bar" },
    });
  });

  test("invalid startup and cursor values fall back per field", () => {
    const result = resolveVimOptions({
      piVimMode: {
        startMode: "visual",
        cursor: { insert: "beam", normal: "underline" },
      },
    });
    expect(result.options.startMode).toBe("insert");
    expect(result.options.cursor.insert).toBe("bar");
    expect(result.options.cursor.normal).toBe("underline");
    expect(result.warnings).toHaveLength(2);
  });

  test("malformed settings files fall back safely", () => {
    const paths = tempSettings();
    try {
      writeFileSync(paths.globalPath, "{ nope");
      writeFileSync(paths.projectPath, JSON.stringify({ piVimMode: { startMode: "normal" } }));
      const result = loadVimOptions({
        globalSettingsPath: paths.globalPath,
        projectSettingsPath: paths.projectPath,
      });
      expect(result.options.startMode).toBe("normal");
      expect(result.warnings.length).toBeGreaterThan(0);
    } finally {
      paths.cleanup();
    }
  });
});
