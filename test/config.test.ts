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
        cursor: {
          insert: "underline",
          normal: "bar",
          visual: "block",
          visualLine: "underline",
          visualBlock: "bar",
        },
      },
    });
    expect(result.warnings).toEqual([]);
    expect(result.options.startMode).toBe("normal");
    expect(result.options.cursor).toEqual({
      insert: "underline",
      normal: "bar",
      visual: "block",
      visualLine: "underline",
      visualBlock: "bar",
    });
  });

  test("project settings override global settings field by field", () => {
    const result = resolveVimOptions(
      { piVimMode: { startMode: "normal", cursor: { insert: "underline", visual: "underline" } } },
      { piVimMode: { cursor: { insert: "bar", visualLine: "bar" } } },
    );
    expect(result.options.startMode).toBe("normal");
    expect(result.options.cursor).toEqual({
      insert: "bar",
      normal: "block",
      visual: "underline",
      visualLine: "bar",
      visualBlock: "block",
    });
  });

  test("parses configured mode labels", () => {
    const result = resolveVimOptions({
      piVimMode: {
        ui: { mode: { labels: { normal: "COMMAND" }, narrowLabels: { normal: "C" } } },
      },
    });

    expect(result.warnings).toEqual([]);
    expect(result.options.ui?.mode.labels.normal).toBe("COMMAND");
    expect(result.options.ui?.mode.narrowLabels.normal).toBe("C");
    expect(result.options.ui?.mode.labels.insert).toBe("INSERT");
  });

  test("rejects legacy vimOptions aliases in favor of UI config", () => {
    const result = resolveVimOptions({
      piVimMode: {
        vimOptions: { showmode: false, showcmd: false, ruler: true },
        ui: { mode: { enabled: true }, cursorPosition: { enabled: true } },
      },
    });

    expect(result.options.ui?.mode.enabled).toBe(true);
    expect(result.options.ui?.status.items).toContain("pendingOperator");
    expect(result.options.ui?.cursorPosition.enabled).toBe(true);
    expect(
      result.warnings.some((warning) => warning.includes("vimOptions is no longer supported")),
    ).toBe(true);
  });

  test("parses configured keymap and rejects protected keys", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          operators: { delete: ["q"], change: ["ctrl+c"] },
          motions: { wordForward: ["e"] },
          commands: { openLineBelow: ["n"], visualBlock: ["<C-v>", "<A-x>"] },
          operatorMotions: { delete: ["wordForward"] },
        },
      },
    });

    expect(result.options.keymap?.operators.delete).toEqual(["q"]);
    expect(result.options.keymap?.operators.change).toEqual(["c"]);
    expect(result.options.keymap?.motions.wordForward).toEqual(["e"]);
    expect(result.options.keymap?.commands.openLineBelow).toEqual(["n"]);
    expect(result.options.keymap?.commands.visualBlock).toEqual(["ctrl+v", "alt+x"]);
    expect(result.options.keymap?.operatorMotions.delete).toEqual(["wordForward"]);
    expect(result.warnings.some((warning) => warning.includes("protected key"))).toBe(true);
  });

  test("rejects operator motions without range semantics", () => {
    const result = resolveVimOptions({
      piVimMode: { keymap: { operatorMotions: { delete: ["right", "wordForward"] } } },
    });

    expect(result.options.keymap?.operatorMotions.delete).toEqual(["wordForward"]);
    expect(result.warnings.some((warning) => warning.includes("unsupported operator motion"))).toBe(
      true,
    );
  });

  test("warns for cross-group keymap conflicts", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          operators: { delete: ["x"] },
          commands: { deleteChar: ["x"] },
        },
      },
    });

    expect(
      result.warnings.some((warning) => warning.includes("duplicate piVimMode.keymap binding x")),
    ).toBe(true);
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
