import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { VimEditorOptions } from "../src/types.ts";

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
  test("VimEditorOptions accepts partial consumer keymap config", () => {
    const options = {
      keymap: { commands: { replaceChar: ["R"] } },
    } satisfies VimEditorOptions;
    expect(options.keymap?.commands?.replaceChar).toEqual(["R"]);
  });

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
          commands: {
            openLineBelow: ["n"],
            visualBlock: ["<C-v>", "<A-x>"],
            startExCommand: ["<A-;>"],
          },
          macros: { record: ["m"], play: ["r"] },
          marks: { set: ["s"], jumpExact: ["<A-m>"], jumpLine: ["'"] },
          operatorMotions: { delete: ["wordForward"] },
        },
      },
    });

    expect(result.options.keymap?.operators.delete).toEqual(["q"]);
    expect(result.options.keymap?.operators.change).toEqual(["c"]);
    expect(result.options.keymap?.motions.wordForward).toEqual(["e"]);
    expect(result.options.keymap?.commands.openLineBelow).toEqual(["n"]);
    expect(result.options.keymap?.commands.visualBlock).toEqual(["ctrl+v", "alt+x"]);
    expect(result.options.keymap?.commands.startExCommand).toEqual(["alt+;"]);
    expect(result.options.keymap?.macros.record).toEqual(["m"]);
    expect(result.options.keymap?.macros.play).toEqual(["r"]);
    expect(result.options.keymap?.marks.set).toEqual(["s"]);
    expect(result.options.keymap?.marks.jumpExact).toEqual(["alt+m"]);
    expect(result.options.keymap?.marks.jumpLine).toEqual(["'"]);
    expect(result.options.keymap?.operatorMotions.delete).toEqual(["wordForward"]);
    expect(result.warnings.some((warning) => warning.includes("protected key"))).toBe(true);
  });

  test("default keymap includes roadmap actions and configurable word-end", () => {
    expect(DEFAULT_VIM_OPTIONS.keymap?.motions.wordEnd).toEqual(["e"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.incrementNumber).toEqual(["ctrl+a"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.decrementNumber).toEqual(["ctrl+x"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.replaceChar).toEqual(["r"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.repeatChange).toEqual(["."]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.startExCommand).toEqual([":"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.delete).toContain("wordEnd");

    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          motions: { wordEnd: ["E"] },
          commands: { incrementNumber: ["+"] },
          operatorMotions: { change: ["wordEnd"] },
        },
      },
    });
    expect(result.options.keymap?.motions.wordEnd).toEqual(["E"]);
    expect(result.options.keymap?.commands.incrementNumber).toEqual(["+"]);
    expect(result.options.keymap?.operatorMotions.change).toEqual(["wordEnd"]);
  });

  test("parses macro behavior options", () => {
    const result = resolveVimOptions({
      piVimMode: {
        macros: { enabled: false, slots: ["x", "y", "bad"], maxReplaySteps: 12 },
      },
    });

    expect(result.options.macros).toMatchObject({
      enabled: false,
      slots: ["x", "y"],
      maxReplaySteps: 12,
    });
    expect(result.warnings.some((warning) => warning.includes("lowercase a-z"))).toBe(true);
  });

  test("parses search highlight options", () => {
    const result = resolveVimOptions({
      piVimMode: {
        search: {
          highlight: false,
          highlightCurrent: false,
          clearOnCancel: false,
          clearOnInsert: false,
          maxHighlights: 7,
        },
      },
    });

    expect(result.warnings).toEqual([]);
    expect(result.options.search).toEqual({
      highlight: false,
      highlightCurrent: false,
      clearOnCancel: false,
      clearOnInsert: false,
      maxHighlights: 7,
    });
  });

  test("invalid search highlight options fall back per field", () => {
    const result = resolveVimOptions({
      piVimMode: {
        search: {
          highlight: "yes",
          highlightCurrent: true,
          clearOnCancel: 1,
          clearOnInsert: false,
          maxHighlights: -1,
        },
      },
    });

    expect(result.options.search).toMatchObject({
      highlight: true,
      highlightCurrent: true,
      clearOnCancel: true,
      clearOnInsert: false,
      maxHighlights: 200,
    });
    expect(result.warnings.some((warning) => warning.includes("search.highlight"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("search.maxHighlights"))).toBe(true);
  });

  test("parses mark behavior options", () => {
    const result = resolveVimOptions({
      piVimMode: {
        marks: { enabled: false, slots: ["x", "y", "bad"] },
      },
    });

    expect(result.options.marks).toMatchObject({
      enabled: false,
      slots: ["x", "y"],
    });
    expect(result.warnings.some((warning) => warning.includes("lowercase a-z"))).toBe(true);
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
          marks: { set: ["x"] },
        },
      },
    });

    expect(
      result.warnings.some((warning) => warning.includes("duplicate piVimMode.keymap binding x")),
    ).toBe(true);
  });

  test("warns when exact keymap bindings are shadowed by longer prefixes", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          motions: { left: ["g"], bufferStart: ["gg"] },
        },
      },
    });

    expect(
      result.warnings.some((warning) =>
        warning.includes(
          "binding g for motions.left is shadowed by longer binding gg for motions.bufferStart",
        ),
      ),
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
