import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { VimEditorOptions } from "../src/types.ts";

import {
  ACTION_KEYBINDING_PRESETS,
  ACTION_KEYBINDING_RECIPES,
} from "../src/action-keybinding-recipes.ts";
import { DEFAULT_VIM_OPTIONS, loadVimOptions, resolveVimOptions } from "../src/config.ts";
import { DIAGNOSTIC_ACTIONS } from "../src/diagnostic-actions.ts";

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
  test("VimEditorOptions accepts partial consumer config shapes", () => {
    const options = {
      keymap: { commands: { replaceChar: ["R"], toggleCase: ["~"] } },
      promptStructures: { targets: { codeFence: false } },
      promptTransforms: { actions: { reflow: false }, commands: { quote: ["qte"] } },
    } satisfies VimEditorOptions;
    const redoOptions = {
      keymap: { commands: { redo: ["ctrl+r"], showKeybindings: ["gk"] } },
    } satisfies VimEditorOptions;
    expect(options.keymap?.commands?.replaceChar).toEqual(["R"]);
    expect(options.keymap?.commands?.toggleCase).toEqual(["~"]);
    expect(redoOptions.keymap?.commands?.redo).toEqual(["ctrl+r"]);
    expect(redoOptions.keymap?.commands?.showKeybindings).toEqual(["gk"]);
    const backwardSearchOptions = {
      keymap: { commands: { startSearchBackward: ["?"] } },
    } satisfies VimEditorOptions;
    expect(backwardSearchOptions.keymap?.commands?.startSearchBackward).toEqual(["?"]);
    expect(options.promptStructures.targets?.codeFence).toBe(false);
    expect(options.promptTransforms.actions?.reflow).toBe(false);
    expect(options.promptTransforms.commands?.quote).toEqual(["qte"]);
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

  test("parses workbench reserved rows field-by-field", () => {
    const valid = resolveVimOptions({
      piVimMode: {
        ui: { workbench: { reservedRows: 2 }, status: { enabled: false } },
      },
    });
    expect(valid.warnings).toEqual([]);
    expect(valid.options.ui?.workbench.reservedRows).toBe(2);
    expect(valid.options.ui?.status.enabled).toBe(false);

    const invalid = resolveVimOptions({
      piVimMode: {
        ui: { workbench: { reservedRows: 99 }, mode: { labels: { normal: "COMMAND" } } },
      },
    });
    expect(invalid.options.ui?.workbench.reservedRows).toBe(0);
    expect(invalid.options.ui?.mode.labels.normal).toBe("COMMAND");
    expect(
      invalid.warnings.some((warning) =>
        warning.includes("piVimMode.ui.workbench.reservedRows must be an integer between 0 and 5"),
      ),
    ).toBe(true);
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
            toggleCase: ["~"],
            visualBlock: ["<C-v>", "<A-x>"],
            startExCommand: ["<A-;>"],
            startSearchBackward: ["<A-?>"],
            redo: ["<C-r>", "ctrl+c"],
            openLineAbove: ["<C-S-p>"],
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
    expect(result.options.keymap?.commands.toggleCase).toEqual(["~"]);
    expect(result.options.keymap?.commands.visualBlock).toEqual(["ctrl+v", "alt+x"]);
    expect(result.options.keymap?.commands.startExCommand).toEqual(["alt+;"]);
    expect(result.options.keymap?.commands.startSearchBackward).toEqual(["alt+?"]);
    expect(result.options.keymap?.commands.redo).toEqual(["ctrl+r"]);
    expect(result.options.keymap?.commands.openLineAbove).toEqual(["O"]);
    expect(result.options.keymap?.macros.record).toEqual(["m"]);
    expect(result.options.keymap?.macros.play).toEqual(["r"]);
    expect(result.options.keymap?.marks.set).toEqual(["s"]);
    expect(result.options.keymap?.marks.jumpExact).toEqual(["alt+m"]);
    expect(result.options.keymap?.marks.jumpLine).toEqual(["'"]);
    expect(result.options.keymap?.operatorMotions.delete).toEqual(["wordForward"]);
    expect(result.warnings.some((warning) => warning.includes("protected key"))).toBe(true);
  });

  test("parses shift operator keymap and rejects motion matrices for line-only operators", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          operators: { indent: ["]"], dedent: ["["], delete: ["d"] },
          operatorMotions: {
            delete: ["wordForward"],
            indent: ["wordForward"],
            dedent: ["lineEnd"],
          },
        },
      },
    });

    expect(result.options.keymap?.operators.indent).toEqual(["]"]);
    expect(result.options.keymap?.operators.dedent).toEqual(["["]);
    expect(result.options.keymap?.operators.delete).toEqual(["d"]);
    expect(result.options.keymap?.operatorMotions.delete).toEqual(["wordForward"]);
    expect("indent" in (result.options.keymap?.operatorMotions ?? {})).toBe(false);
    expect("dedent" in (result.options.keymap?.operatorMotions ?? {})).toBe(false);
    expect(
      result.warnings.some((warning) =>
        warning.includes("unsupported piVimMode.keymap.operatorMotions.indent"),
      ),
    ).toBe(true);
    expect(
      result.warnings.some((warning) =>
        warning.includes("unsupported piVimMode.keymap.operatorMotions.dedent"),
      ),
    ).toBe(true);
  });

  test("keybindings popup command defaults unbound and validates configured bindings", () => {
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.showKeybindings).toEqual([]);

    const valid = resolveVimOptions({
      piVimMode: { keymap: { commands: { showKeybindings: ["gk"], redo: ["U"] } } },
    });
    expect(valid.options.keymap?.commands.showKeybindings).toEqual(["gk"]);
    expect(valid.options.keymap?.commands.redo).toEqual(["U"]);
    expect(valid.warnings).toEqual([]);

    const protectedKey = resolveVimOptions({
      piVimMode: { keymap: { commands: { showKeybindings: ["ctrl+p"], redo: ["U"] } } },
    });
    expect(protectedKey.options.keymap?.commands.showKeybindings).toEqual([]);
    expect(protectedKey.options.keymap?.commands.redo).toEqual(["U"]);
    expect(protectedKey.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("protected key ctrl+p")]),
    );

    const exactConflict = resolveVimOptions({
      piVimMode: { keymap: { commands: { showKeybindings: ["u"], redo: ["U"] } } },
    });
    expect(exactConflict.options.keymap?.commands.showKeybindings).toEqual([]);
    expect(exactConflict.options.keymap?.commands.redo).toEqual(["U"]);
    expect(exactConflict.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("commands.showKeybindings.u")]),
    );

    const prefixConflict = resolveVimOptions({
      piVimMode: { keymap: { commands: { showKeybindings: ["g"], redo: ["U"] } } },
    });
    expect(prefixConflict.options.keymap?.commands.showKeybindings).toEqual([]);
    expect(prefixConflict.options.keymap?.commands.redo).toEqual(["U"]);
    expect(prefixConflict.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("prefix-shadow conflict")]),
    );
  });

  test("default keymap includes roadmap actions and configurable word-end", () => {
    expect(DEFAULT_VIM_OPTIONS.keymap?.motions.wordEnd).toEqual(["e"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.incrementNumber).toEqual(["ctrl+a"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.decrementNumber).toEqual(["ctrl+x"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.replaceChar).toEqual(["r"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.toggleCase).toEqual(["~"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.repeatChange).toEqual(["."]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.redo).toEqual(["ctrl+r"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.startExCommand).toEqual([":"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.startSearchBackward).toEqual(["?"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.operators.indent).toEqual([">"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.operators.dedent).toEqual(["<"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.delete).toContain("wordEnd");

    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          motions: { wordEnd: ["E"] },
          commands: { incrementNumber: ["+"], toggleCase: ["<A-t>"], redo: ["U"] },
          operatorMotions: { change: ["wordEnd"] },
        },
      },
    });
    expect(result.options.keymap?.motions.wordEnd).toEqual(["E"]);
    expect(result.options.keymap?.commands.incrementNumber).toEqual(["+"]);
    expect(result.options.keymap?.commands.toggleCase).toEqual(["alt+t"]);
    expect(result.options.keymap?.commands.redo).toEqual(["U"]);
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

  test("parses prompt structure and transform options", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          textObjects: {
            kinds: { inner: ["Z"], around: ["Q"] },
            targets: { codeFence: ["R"], tag: ["X"] },
          },
        },
        promptStructures: { enabled: true, targets: { tag: false, errorBlock: false } },
        promptTransforms: {
          enabled: true,
          actions: { reflow: false },
          commands: { quote: ["qte"], fence: ["wrap"] },
        },
      },
    });

    expect(result.warnings).toEqual([]);
    expect(result.options.keymap?.textObjects.kinds.inner).toEqual(["Z"]);
    expect(result.options.keymap?.textObjects.targets.codeFence).toEqual(["R"]);
    expect(result.options.promptStructures?.targets.tag).toBe(false);
    expect(result.options.promptStructures?.targets.codeFence).toBe(true);
    expect(result.options.promptTransforms?.actions.reflow).toBe(false);
    expect(result.options.promptTransforms?.commands.quote).toEqual(["qte"]);
    expect(result.options.promptTransforms?.commands.fence).toEqual(["wrap"]);
  });

  test("accepts every supported normal motion as an operator motion", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          operatorMotions: {
            delete: [
              "left",
              "down",
              "up",
              "right",
              "wordForward",
              "wordBackward",
              "wordEnd",
              "lineStart",
              "firstNonBlank",
              "lineEnd",
              "bufferStart",
              "bufferEnd",
              "matchingPair",
            ],
          },
        },
      },
    });

    expect(result.warnings).toEqual([]);
    expect(result.options.keymap?.operatorMotions.delete).toEqual([
      "left",
      "down",
      "up",
      "right",
      "wordForward",
      "wordBackward",
      "wordEnd",
      "lineStart",
      "firstNonBlank",
      "lineEnd",
      "bufferStart",
      "bufferEnd",
      "matchingPair",
    ]);
  });

  test("warns for cross-group keymap conflicts", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          operators: { delete: ["x"] },
          motions: { left: ["x"] },
          commands: { deleteChar: ["x"], redo: ["x"] },
          marks: { set: ["x"] },
          textObjects: { targets: { word: ["x"] } },
        },
      },
    });

    expect(
      result.warnings.some((warning) => warning.includes("duplicate piVimMode.keymap binding x")),
    ).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("textObjects.targets.word"))).toBe(
      true,
    );

    const hijack = resolveVimOptions({
      piVimMode: { keymap: { textObjects: { kinds: { inner: ["w"] } } } },
    });
    expect(
      hijack.warnings.some((warning) =>
        warning.includes("motions.wordForward and textObjects.kinds.inner"),
      ),
    ).toBe(true);
  });

  test("rejects multi-key text object bindings", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          textObjects: { kinds: { inner: ["ii", "I"] }, targets: { codeFence: ["ff"] } },
        },
      },
    });

    expect(result.options.keymap?.textObjects.kinds.inner).toEqual(["I"]);
    expect(result.options.keymap?.textObjects.targets.codeFence).toEqual(["f"]);
    expect(
      result.warnings.filter((warning) => warning.includes("unsupported multi-key text object"))
        .length,
    ).toBe(2);
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

  test("resolves presets before explicit settings", () => {
    const result = resolveVimOptions({
      piVimMode: {
        preset: "vim-heavy",
        startMode: "insert",
        keymap: { commands: { visualBlock: ["B"] } },
        ui: { cursorPosition: { enabled: true } },
      },
    });

    expect(result.warnings).toEqual([]);
    expect(result.options.preset).toBe("vim-heavy");
    expect(result.options.startMode).toBe("insert");
    expect(result.options.keymap?.commands.visualBlock).toEqual(["B"]);
    expect(result.options.ui?.status.items).toContain("cursorPosition");
    expect(result.options.ui?.cursorPosition.enabled).toBe(true);
  });

  test("project preset overrides global preset field by field", () => {
    const result = resolveVimOptions(
      { piVimMode: { preset: "vim-heavy", cursor: { insert: "underline" } } },
      { piVimMode: { preset: "minimal", feedback: { noop: "status" } } },
    );

    expect(result.options.preset).toBe("minimal");
    expect(result.options.startMode).toBe("normal");
    expect(result.options.cursor.insert).toBe("underline");
    expect(result.options.macros?.enabled).toBe(false);
    expect(result.options.feedback?.noop).toBe("status");
  });

  test("invalid preset and feedback fall back per field", () => {
    const result = resolveVimOptions({
      piVimMode: {
        preset: "maximal",
        feedback: { noop: "loud" },
        startMode: "normal",
      },
    });

    expect(result.options.preset).toBeUndefined();
    expect(result.options.feedback?.noop).toBe("off");
    expect(result.options.startMode).toBe("normal");
    expect(
      result.warnings.some((warning) => warning.includes("unsupported piVimMode.preset")),
    ).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("feedback.noop"))).toBe(true);
  });

  test("protected shortcut warnings include ownership reason", () => {
    const result = resolveVimOptions({
      piVimMode: { keymap: { commands: { openLineBelow: ["ctrl+p"] } } },
    });

    expect(result.options.keymap?.commands.openLineBelow).toEqual(["o"]);
    expect(
      result.warnings.some((warning) =>
        warning.includes("protected key ctrl+p (Pi command/model palette)"),
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

  test("action keybinding recipes parse and keep no default action bindings", () => {
    const defaults = resolveVimOptions(undefined);
    expect(defaults.options.keymap?.actions.accepted).toEqual([]);

    for (const recipe of ACTION_KEYBINDING_RECIPES) {
      const result = resolveVimOptions({
        piVimMode: { keymap: { actions: recipe.actions } },
      });
      expect(result.warnings).toEqual([]);
      expect(result.options.keymap?.actions.accepted.map((binding) => binding.actionId)).toEqual(
        recipe.expected.map((binding) => binding.actionId),
      );
      expect(result.options.keymap?.actions.accepted.map((binding) => binding.key)).toEqual(
        recipe.expected.map((binding) => binding.key),
      );
    }
  });

  test("action keybinding recipes preserve existing rejection rules", () => {
    const result = resolveVimOptions({
      piVimMode: {
        promptTransforms: { actions: { quote: false } },
        keymap: { actions: ACTION_KEYBINDING_RECIPES[0]!.actions },
      },
    });

    expect(result.options.keymap?.actions.accepted).toEqual([
      { key: "gq", actionId: "prompt.transform.reflow", args: { action: "reflow" } },
      { key: "g<", actionId: "prompt.transform.unquote", args: { action: "unquote" } },
    ]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("disabled prompt transform action prompt.transform.quote"),
      ]),
    );
  });

  test("action keybinding presets expand through config", () => {
    const defaults = resolveVimOptions(undefined);
    expect(defaults.options.keymap?.actions.accepted).toEqual([]);

    for (const preset of ACTION_KEYBINDING_PRESETS) {
      const result = resolveVimOptions({
        piVimMode: { keymap: { actionPresets: [preset.id] } },
      });
      expect(result.warnings).toEqual([]);
      expect(result.options.keymap?.actions.accepted).toEqual(preset.expected);
    }
  });

  test("action keybinding presets merge before explicit actions", () => {
    const merged = resolveVimOptions({
      piVimMode: {
        keymap: {
          actionPresets: ["paragraph-editing", "markdown-wrapping"],
          actions: {
            "prompt.transform.quote": ["zq"],
            "prompt.transform.unquote": [],
          },
        },
      },
    });
    expect(merged.warnings).toEqual([]);
    expect(merged.options.keymap?.actions.accepted).toHaveLength(3);
    expect(merged.options.keymap?.actions.accepted).toEqual(
      expect.arrayContaining([
        { key: "gq", actionId: "prompt.transform.reflow", args: { action: "reflow" } },
        {
          key: "gT",
          actionId: "prompt.transform.fence",
          args: { action: "fence" },
        },
        { key: "zq", actionId: "prompt.transform.quote", args: { action: "quote" } },
      ]),
    );

    const projectOverride = resolveVimOptions(
      { piVimMode: { keymap: { actionPresets: ["paragraph-editing"] } } },
      { piVimMode: { keymap: { actions: { "prompt.transform.reflow": ["zq"] } } } },
    );
    expect(projectOverride.options.keymap?.actions.accepted).toEqual([
      { key: "zq", actionId: "prompt.transform.reflow", args: { action: "reflow" } },
      { key: "g>", actionId: "prompt.transform.quote", args: { action: "quote" } },
      { key: "g<", actionId: "prompt.transform.unquote", args: { action: "unquote" } },
    ]);
  });

  test("action keybinding presets warn per invalid entry and preserve valid siblings", () => {
    const invalid = resolveVimOptions({
      piVimMode: {
        startMode: "normal",
        keymap: { actionPresets: ["paragraph-editing", "nope", 3] },
      },
    });
    expect(invalid.options.startMode).toBe("normal");
    expect(invalid.options.keymap?.actions.accepted).toEqual(
      ACTION_KEYBINDING_PRESETS[0]!.expected,
    );
    expect(invalid.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("unsupported piVimMode.keymap.actionPresets.nope"),
        expect.stringContaining("piVimMode.keymap.actionPresets contains unsupported preset"),
      ]),
    );

    const notArray = resolveVimOptions({
      piVimMode: { keymap: { actionPresets: "paragraph-editing" } },
    });
    expect(notArray.options.keymap?.actions.accepted).toEqual([]);
    expect(notArray.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("piVimMode.keymap.actionPresets must be an array"),
      ]),
    );
  });

  test("action keybinding presets preserve existing rejection rules", () => {
    const disabled = resolveVimOptions({
      piVimMode: {
        promptTransforms: { actions: { quote: false } },
        keymap: { actionPresets: ["paragraph-editing"] },
      },
    });
    expect(disabled.options.keymap?.actions.accepted).toEqual([
      { key: "gq", actionId: "prompt.transform.reflow", args: { action: "reflow" } },
      { key: "g<", actionId: "prompt.transform.unquote", args: { action: "unquote" } },
    ]);
    expect(disabled.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("disabled prompt transform action prompt.transform.quote"),
      ]),
    );

    const conflict = resolveVimOptions({
      piVimMode: {
        keymap: {
          actionPresets: ["paragraph-editing"],
          motions: { bufferStart: ["gq"] },
        },
      },
    });
    expect(conflict.options.keymap?.actions.accepted).toEqual([
      { key: "g>", actionId: "prompt.transform.quote", args: { action: "quote" } },
      { key: "g<", actionId: "prompt.transform.unquote", args: { action: "unquote" } },
    ]);
    expect(conflict.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("conflicts with motions.bufferStart")]),
    );
  });

  test("parses action keymap entries and keeps no default action bindings", () => {
    const options = {
      keymap: {
        actions: {
          "prompt.transform.reflow": ["gq", { key: "gQ", args: { width: 100 } }],
          "prompt.transform.fence": [{ key: "gT", args: { language: "ts" } }],
          "prompt.transform.quote": [{ key: "g>" }],
        },
        commands: { visualBlock: ["ctrl+v"] },
      },
    } satisfies VimEditorOptions;
    expect(options.keymap?.actions?.["prompt.transform.reflow"]?.length).toBe(2);

    const defaults = resolveVimOptions(undefined);
    expect(defaults.options.keymap?.actions.accepted).toEqual([]);

    const result = resolveVimOptions({ piVimMode: options });
    expect(result.warnings).toEqual([]);
    expect(result.options.keymap?.actions.accepted).toEqual([
      { key: "gq", actionId: "prompt.transform.reflow", args: { action: "reflow" } },
      { key: "gQ", actionId: "prompt.transform.reflow", args: { action: "reflow", width: 100 } },
      { key: "gT", actionId: "prompt.transform.fence", args: { action: "fence", language: "ts" } },
      { key: "g>", actionId: "prompt.transform.quote", args: { action: "quote" } },
    ]);
    expect(result.options.keymap?.commands.visualBlock).toEqual(["ctrl+v"]);
  });

  test("resolves action keymap warnings per binding", () => {
    const result = resolveVimOptions({
      piVimMode: {
        promptTransforms: { actions: { dedent: false } },
        keymap: {
          actions: {
            "prompt.transform.reflow": [
              "gq",
              "gq",
              { key: "gQ", args: { width: "wide" } },
              { key: "ctrl+p" },
            ],
            "prompt.transform.fence": [{ key: "gF", args: { unknown: "ts" } }],
            "prompt.transform.quote": ["gg"],
            "prompt.transform.dedent": ["g<"],
            "promptTransform.reflow": ["gr"],
            "vimmode.doctor": ["gd"],
          },
        },
      },
    });

    expect(result.options.keymap?.actions.accepted).toEqual([
      { key: "gq", actionId: "prompt.transform.reflow", args: { action: "reflow" } },
    ]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("unsupported piVimMode.keymap.actions.promptTransform.reflow"),
        expect.stringContaining("vimmode.doctor"),
        expect.stringContaining("Invalid reflow width"),
        expect.stringContaining("Unknown action arg: unknown"),
        expect.stringContaining("protected key ctrl+p"),
        expect.stringContaining("disabled prompt transform action prompt.transform.dedent"),
        expect.stringContaining("conflicts with motions.bufferStart"),
      ]),
    );
    expect(result.warnings.join("\n")).not.toContain("use canonical prompt.transform.reflow");
  });

  test("rejects every metadata-only diagnostic action from keymap actions", () => {
    const actions = Object.fromEntries(
      DIAGNOSTIC_ACTIONS.map((entry, index) => [entry.id, [`g${index}`]]),
    );
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          actions: {
            ...actions,
            "prompt.transform.quote": ["g>"],
          },
        },
      },
    });

    expect(result.options.keymap?.actions.accepted).toEqual([
      { key: "g>", actionId: "prompt.transform.quote", args: { action: "quote" } },
    ]);
    for (const entry of DIAGNOSTIC_ACTIONS) {
      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining(entry.id)]));
    }
  });

  test("project action bindings replace global bindings and empty arrays unbind", () => {
    const replaced = resolveVimOptions(
      { piVimMode: { keymap: { actions: { "prompt.transform.reflow": ["gq"] } } } },
      { piVimMode: { keymap: { actions: { "prompt.transform.reflow": ["gQ"] } } } },
    );
    expect(replaced.options.keymap?.actions.accepted).toEqual([
      { key: "gQ", actionId: "prompt.transform.reflow", args: { action: "reflow" } },
    ]);

    const unbound = resolveVimOptions(
      { piVimMode: { keymap: { actions: { "prompt.transform.reflow": ["gq"] } } } },
      { piVimMode: { keymap: { actions: { "prompt.transform.reflow": [] } } } },
    );
    expect(unbound.options.keymap?.actions.accepted).toEqual([]);
  });

  test("rejects action conflicts but allows shared non-executable prefixes", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          actions: {
            "prompt.transform.reflow": ["gq", "g", "ga"],
            "prompt.transform.fence": ["gq", "zq"],
            "prompt.transform.quote": ["zq"],
          },
        },
      },
    });

    expect(result.options.keymap?.actions.accepted).toEqual([
      { key: "ga", actionId: "prompt.transform.reflow", args: { action: "reflow" } },
    ]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("prefix-shadow conflict"),
        expect.stringContaining("conflict with motions.bufferStart"),
        expect.stringContaining("duplicate action key gq"),
        expect.stringContaining("duplicate action key zq"),
      ]),
    );
  });
});
