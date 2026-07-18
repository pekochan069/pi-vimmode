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
      keymap: {
        motions: { halfPageDown: ["<C-d>"] },
        commands: { replaceChar: ["R"], toggleCase: ["~"] },
      },
      promptStructures: { targets: { codeFence: false } },
      promptTransforms: { actions: { reflow: false }, commands: { quote: ["qte"] } },
    } satisfies VimEditorOptions;
    const redoOptions = {
      keymap: { escape: ["<D-j>"], commands: { redo: ["ctrl+r"], showKeybindings: ["gk"] } },
    } satisfies VimEditorOptions;
    const preChangeUiOptions = {
      ui: {
        status: { enabled: true, items: ["mode"] },
        mode: {
          enabled: true,
          labels: { insert: "I", normal: "N", visual: "V", visualLine: "VL", visualBlock: "VB" },
          narrowLabels: {
            insert: "I",
            normal: "N",
            visual: "V",
            visualLine: "VL",
            visualBlock: "VB",
          },
        },
      },
    } satisfies VimEditorOptions;
    expect(options.keymap?.motions?.halfPageDown).toEqual(["<C-d>"]);
    expect(options.keymap?.commands?.replaceChar).toEqual(["R"]);
    expect(options.keymap?.commands?.toggleCase).toEqual(["~"]);
    expect(redoOptions.keymap?.escape).toEqual(["<D-j>"]);
    expect(redoOptions.keymap?.commands?.redo).toEqual(["ctrl+r"]);
    expect(redoOptions.keymap?.commands?.showKeybindings).toEqual(["gk"]);
    expect(preChangeUiOptions.ui.mode.enabled).toBe(true);
    const backwardSearchOptions = {
      keymap: { commands: { startSearchBackward: ["?"] } },
    } satisfies VimEditorOptions;
    expect(backwardSearchOptions.keymap?.commands?.startSearchBackward).toEqual(["?"]);
    expect(options.promptStructures.targets?.codeFence).toBe(false);
    expect(options.promptTransforms.actions?.reflow).toBe(false);
    expect(options.promptTransforms.commands?.quote).toEqual(["qte"]);
  });

  test("uses defaults when settings are absent", () => {
    const options = resolveVimOptions(undefined).options;
    expect(options).toEqual(DEFAULT_VIM_OPTIONS);
    expect(options.ui?.status.position).toBe("left");
  });

  test("compiles resolved options and scoped lookups into one immutable plan", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: { escape: ["<C-j>"], motions: { wordForward: ["zw"] } },
        promptTransforms: { commands: { quote: ["qte"] } },
      },
    });

    expect(result.plan.options).toBe(result.options);
    expect(Object.isFrozen(result.plan)).toBe(true);
    expect(Object.isFrozen(result.plan.options)).toBe(true);
    expect(Object.isFrozen(result.plan.options.keymap?.motions.wordForward)).toBe(true);
    expect(Object.isFrozen(result.plan.scopes)).toBe(true);
    expect(result.plan.scopes.normal.exact.zw?.id).toBe("motion.wordForward");
    expect(result.plan.scopes.normal.prefixes.z).toEqual(["zw"]);
    expect(result.plan.scopes.operatorPending.exact.zw?.id).toBe("motion.wordForward");
    expect(result.plan.scopes.operatorPending.exact["ctrl+j"]?.kind).toBe("escape");
    expect(result.plan.scopes.normal.prefixes.ctrl).toBeUndefined();
    expect(result.plan.scopes.insert.exact.zw).toBeUndefined();
    expect(() =>
      (result.plan.options.keymap!.motions.wordForward as unknown as string[]).push("custom-word"),
    ).toThrow();
  });

  test("named terminal keys compile atomically without character prefixes", () => {
    const result = resolveVimOptions({
      piVimMode: { keymap: { commands: { undo: ["<Home>"] } } },
    });

    expect(result.plan.scopes.normal.exact.home?.id).toBe("command.undo");
    expect(result.plan.scopes.normal.prefixes.h).toBeUndefined();
  });

  test("immutable plan does not share configured nested fields", () => {
    const settings = {
      piVimMode: {
        keymap: { motions: { wordForward: ["q"] }, commands: { openLineBelow: ["n"] } },
        promptTransforms: { commands: { quote: ["qte"] } },
        ui: {
          status: { items: ["mode", "selection"] },
          mode: { labels: { normal: "COMMAND" } },
        },
      },
    };
    const options = resolveVimOptions(settings).options;

    expect(settings.piVimMode.keymap.motions.wordForward).toEqual(["q"]);
    expect(settings.piVimMode.keymap.commands.openLineBelow).toEqual(["n"]);
    expect(settings.piVimMode.promptTransforms.commands.quote).toEqual(["qte"]);
    expect(settings.piVimMode.ui.status.items).toEqual(["mode", "selection"]);
    expect(settings.piVimMode.ui.mode.labels.normal).toBe("COMMAND");
    expect(options.keymap?.motions.wordForward).not.toBe(
      settings.piVimMode.keymap.motions.wordForward,
    );
    expect(options.ui?.status.items).not.toBe(settings.piVimMode.ui.status.items);
    expect(Object.isFrozen(settings.piVimMode.keymap.motions.wordForward)).toBe(false);
    expect(Object.isFrozen(settings.piVimMode.ui.status.items)).toBe(false);
    expect(options.keymap?.motions.left).toEqual(["h", "left"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.motions.left).toEqual(["h", "left"]);
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

  test("project keymap overrides restore defaults removed by global conflicts", () => {
    const result = resolveVimOptions(
      { piVimMode: { keymap: { motions: { wordForward: ["q"] } } } },
      { piVimMode: { keymap: { motions: { wordForward: ["e"] } } } },
    );

    expect(result.warnings).toEqual([]);
    expect(result.options.keymap?.motions.wordForward).toEqual(["e"]);
    expect(result.options.keymap?.macros.record).toEqual(["q"]);
  });

  test("leader defaults unset and resolves printable, invalid, and null layers", () => {
    expect(resolveVimOptions(undefined).options.leader).toBeUndefined();

    const invalidProject = resolveVimOptions(
      { piVimMode: { leader: "," } },
      { piVimMode: { leader: "too-long", startMode: "normal" } },
    );
    expect(invalidProject.options.leader).toBe(",");
    expect(invalidProject.options.startMode).toBe("normal");
    expect(invalidProject.warnings).toEqual([
      "project settings: piVimMode.leader must be one printable character or null",
    ]);

    const cleared = resolveVimOptions(
      { piVimMode: { leader: "," } },
      { piVimMode: { leader: null } },
    );
    expect(cleared.options.leader).toBeUndefined();
  });

  test("expands retained leader mappings with final project leader", () => {
    const result = resolveVimOptions(
      {
        piVimMode: {
          leader: ",",
          keymap: {
            commands: { undo: ["<Leader>u"] },
            actions: { "prompt.transform.reflow": ["<leader><Leader>"] },
          },
        },
      },
      { piVimMode: { leader: " " } },
    );

    expect(result.warnings).toEqual([]);
    expect(result.options.leader).toBe(" ");
    expect(result.options.keymap?.leader).toBe(" ");
    expect(result.options.keymap?.commands.undo).toEqual([" u"]);
    expect(result.options.keymap?.actions.accepted[0]?.key).toBe("  ");
  });

  test("leader mapping warnings drop only affected keys", () => {
    const configured = resolveVimOptions({
      piVimMode: {
        leader: ",",
        keymap: { commands: { undo: ["<leader>", "g<leader>x", "<leader>u"] } },
      },
    });
    expect(configured.options.keymap?.commands.undo).toEqual([",u"]);
    expect(configured.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("contains unsupported key"),
        expect.stringContaining("cannot bind a lone <leader>"),
      ]),
    );

    const missing = resolveVimOptions({
      piVimMode: { keymap: { motions: { wordForward: ["<leader>w"] } } },
    });
    expect(missing.options.keymap?.motions.wordForward).toEqual(["w"]);
    expect(missing.options.keymap?.leader).toBeUndefined();
    expect(missing.warnings).toEqual([
      expect.stringContaining("uses <leader> but piVimMode.leader is unset"),
    ]);
  });

  test("invalid higher-layer leader mappings preserve lower valid bindings", () => {
    const classic = resolveVimOptions(
      { piVimMode: { keymap: { commands: { undo: ["U"] } } } },
      { piVimMode: { keymap: { commands: { undo: ["<leader>u"] } } } },
    );
    expect(classic.options.keymap?.commands.undo).toEqual(["U"]);

    const mixed = resolveVimOptions(
      { piVimMode: { keymap: { commands: { undo: ["U"] } } } },
      { piVimMode: { keymap: { commands: { undo: ["<leader>u", "Z"] } } } },
    );
    expect(mixed.options.keymap?.commands.undo).toEqual(["Z"]);

    const action = resolveVimOptions(
      {
        piVimMode: { keymap: { actions: { "prompt.transform.reflow": ["gq"] } } },
      },
      {
        piVimMode: { keymap: { actions: { "prompt.transform.reflow": ["<leader>q"] } } },
      },
    );
    expect(action.options.keymap?.actions.accepted.map((binding) => binding.key)).toEqual(["gq"]);

    const cleared = resolveVimOptions(
      {
        piVimMode: { keymap: { actions: { "prompt.transform.reflow": ["gq"] } } },
      },
      {
        piVimMode: { keymap: { actions: { "prompt.transform.reflow": [] } } },
      },
    );
    expect(cleared.options.keymap?.actions.accepted).toEqual([]);
  });

  test("protected leader suffixes are rejected without dropping valid siblings", () => {
    const result = resolveVimOptions({
      piVimMode: {
        leader: ",",
        keymap: {
          actions: {
            "prompt.transform.quote": ["<leader>ctrl+p", "<leader><C-p>", "<leader>q"],
          },
        },
      },
    });
    expect(result.options.keymap?.actions.accepted.map((binding) => binding.key)).toEqual([",q"]);
    expect(
      result.warnings.filter((warning) => warning.includes("contains protected key ctrl+p")),
    ).toHaveLength(2);
  });

  test("rejected leader actions do not reserve their prefix", () => {
    const disabled = resolveVimOptions({
      piVimMode: {
        leader: ",",
        promptTransforms: { actions: { quote: false } },
        keymap: { actions: { "prompt.transform.quote": ["<leader>x"] } },
      },
    });
    expect(disabled.options.keymap?.leader).toBeUndefined();
    expect(disabled.options.keymap?.commands.repeatCharSearchReverse).toEqual([","]);
    expect(disabled.options.keymap?.actions.accepted).toEqual([]);

    const duplicate = resolveVimOptions({
      piVimMode: {
        leader: ",",
        keymap: {
          actions: {
            "prompt.transform.quote": ["<leader>x"],
            "prompt.transform.unquote": ["<leader>x"],
          },
        },
      },
    });
    expect(duplicate.options.keymap?.leader).toBeUndefined();
    expect(duplicate.options.keymap?.commands.repeatCharSearchReverse).toEqual([","]);
    expect(duplicate.options.keymap?.actions.accepted).toEqual([]);
  });

  test("rejected insert and text-object leader keys do not reserve normal grammar", () => {
    const result = resolveVimOptions({
      piVimMode: {
        leader: ",",
        keymap: {
          escape: ["<leader>q"],
          insert: { openLineBelow: ["<leader>o"] },
          textObjects: { targets: { word: ["<leader>w"] } },
        },
      },
    });

    expect(result.options.keymap?.leader).toBeUndefined();
    expect(result.options.keymap?.commands.repeatCharSearchReverse).toEqual([","]);
    expect(result.options.keymap?.escape).toEqual([]);
    expect(result.options.keymap?.insert.openLineBelow).toEqual([]);
    expect(result.options.keymap?.textObjects.targets.word).toEqual(["w"]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("unsupported printable text sequence <leader>q"),
        expect.stringContaining("unsupported printable text sequence <leader>o"),
        expect.stringContaining("unsupported multi-key text object binding <leader>w"),
      ]),
    );
  });

  test("parses configured status position and mode labels", () => {
    const result = resolveVimOptions({
      piVimMode: {
        ui: {
          status: { position: "right" },
          mode: {
            labels: { normal: "COMMAND" },
            narrowLabels: { normal: "C" },
          },
        },
      },
    });

    expect(result.warnings).toEqual([]);
    expect(result.options.ui?.status.position).toBe("right");
    expect(result.options.ui?.mode.labels.normal).toBe("COMMAND");
    expect(result.options.ui?.mode.narrowLabels.normal).toBe("C");
    expect(result.options.ui?.mode.labels.insert).toBe("INSERT");
  });

  test("retains inherited status position when a later value is invalid", () => {
    const result = resolveVimOptions(
      { piVimMode: { ui: { status: { position: "right" } } } },
      {
        piVimMode: {
          ui: {
            status: { position: "center" },
            mode: { enabled: false, labels: { normal: "COMMAND" } },
          },
        },
      },
    );

    expect(result.options.ui?.status.position).toBe("right");
    expect(result.options.ui?.mode.enabled).toBe(false);
    expect(result.options.ui?.mode.labels.normal).toBe("COMMAND");
    expect(result.warnings).toEqual([
      'project settings: piVimMode.ui.status.position must be "left" or "right"',
    ]);
  });

  test("merges status position across global, JS, and project fields", () => {
    const result = resolveVimOptions(
      { piVimMode: { ui: { status: { position: "right" } } } },
      {
        piVimMode: {
          ui: { status: { position: "right" }, mode: { narrowLabels: { normal: "P" } } },
        },
      },
      {
        partial: {
          ui: { status: { position: "left" }, mode: { labels: { normal: "JS" } } },
        },
      },
    );

    expect(result.warnings).toEqual([]);
    expect(result.options.ui?.status.position).toBe("right");
    expect(result.options.ui?.mode.labels.normal).toBe("JS");
    expect(result.options.ui?.mode.narrowLabels.normal).toBe("P");
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
          escape: ["<C-j>", "<D-j>"],
          operators: { delete: ["q"], lowercase: ["zu"], uppercase: ["ctrl+c"], change: ["c"] },
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
          operatorMotions: { delete: ["wordForward"], lowercase: ["wordForward"] },
        },
      },
    });

    expect(result.options.keymap?.escape).toEqual(["ctrl+j", "super+j"]);
    expect(result.options.keymap?.operators.delete).toEqual(["q"]);
    expect(result.options.keymap?.operators.lowercase).toEqual(["zu"]);
    expect(result.options.keymap?.operators.uppercase).toEqual(["gU"]);
    expect(result.options.keymap?.operators.change).toEqual(["c"]);
    expect(result.options.keymap?.motions.wordForward).toEqual(["e"]);
    expect(result.options.keymap?.commands.openLineBelow).toEqual(["n"]);
    expect(result.options.keymap?.commands.toggleCase).toEqual(["~"]);
    expect(result.options.keymap?.commands.visualBlock).toEqual(["alt+x"]);
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
    expect(result.options.keymap?.operatorMotions.lowercase).toEqual(["wordForward"]);
    expect(result.warnings.some((warning) => warning.includes("protected key"))).toBe(true);
  });

  test("insert escape aliases validate independently from normal keymap", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          escape: ["<C-j>", "<D-j>", "j", "<C-c>", 42],
          motions: { down: ["J"], up: ["K"] },
        },
      },
    });

    expect(result.options.keymap?.escape).toEqual(["ctrl+j", "super+j"]);
    expect(result.options.keymap?.motions.down).toEqual(["J"]);
    expect(result.options.keymap?.motions.up).toEqual(["K"]);
    expect(result.options.keymap?.motions.left).toEqual(["h", "left"]);
    expect(result.options.keymap?.motions.right).toEqual(["l", "right"]);
    expect(result.options.keymap?.macros.record).toEqual(["q"]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("escape contains unsupported printable text sequence j"),
        expect.stringContaining("escape contains protected key ctrl+c"),
        expect.stringContaining("escape contains unsupported key"),
      ]),
    );
  });

  test("raw text insert escape aliases are rejected", () => {
    const result = resolveVimOptions({
      piVimMode: { keymap: { escape: ["jk", "jj", "space"] } },
    });

    expect(result.options.keymap?.escape).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("escape contains unsupported printable text sequence jk"),
        expect.stringContaining("escape contains unsupported printable text sequence jj"),
        expect.stringContaining("escape contains unsupported printable text sequence space"),
      ]),
    );
  });

  test("invalid insert escape config falls back without dropping valid siblings", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          escape: "<D-j>",
          commands: { openLineBelow: ["n"] },
        },
      },
    });

    expect(result.options.keymap?.escape).toEqual([]);
    expect(result.options.keymap?.commands.openLineBelow).toEqual(["n"]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("escape must be an array")]),
    );
  });

  test("project insert escape aliases can clear global aliases", () => {
    const result = resolveVimOptions(
      { piVimMode: { keymap: { escape: ["<D-j>"] } } },
      { piVimMode: { keymap: { escape: [] } } },
    );

    expect(result.options.keymap?.escape).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  describe("insert mode newline bindings", () => {
    test("default insert keymap is empty", () => {
      const result = resolveVimOptions(undefined);
      expect(result.options.keymap?.insert.openLineBelow).toEqual([]);
      expect(result.options.keymap?.insert.openLineAbove).toEqual([]);
      expect(result.options.keymap?.insert.deleteWordBackward).toEqual([]);
      expect(result.options.keymap?.insert.deleteWordForward).toEqual([]);
      expect(result.options.keymap?.insert.deleteLineBackward).toEqual([]);
      expect(result.options.keymap?.insert.deleteLineForward).toEqual([]);
      expect(result.options.keymap?.insert.moveWordBackward).toEqual([]);
      expect(result.options.keymap?.insert.moveWordForward).toEqual([]);
      expect(result.options.keymap?.insert.moveLineStart).toEqual([]);
      expect(result.options.keymap?.insert.moveLineEnd).toEqual([]);
    });

    test("accepts configured insert open line below", () => {
      const result = resolveVimOptions({
        piVimMode: {
          keymap: { insert: { openLineBelow: ["ctrl+j"] } },
        },
      });
      expect(result.warnings).toEqual([]);
      expect(result.options.keymap?.insert.openLineBelow).toEqual(["ctrl+j"]);
      expect(result.options.keymap?.insert.openLineAbove).toEqual([]);
    });

    test("accepts configured insert open line above", () => {
      const result = resolveVimOptions({
        piVimMode: {
          keymap: { insert: { openLineAbove: ["ctrl+k"] } },
        },
      });
      expect(result.warnings).toEqual([]);
      expect(result.options.keymap?.insert.openLineAbove).toEqual(["ctrl+k"]);
      expect(result.options.keymap?.insert.openLineBelow).toEqual([]);
    });

    test("rejects raw printable text in insert bindings", () => {
      const result = resolveVimOptions({
        piVimMode: {
          keymap: { insert: { openLineBelow: ["j", "space"] } },
        },
      });
      expect(result.options.keymap?.insert.openLineBelow).toEqual([]);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            "insert.openLineBelow contains unsupported printable text sequence j",
          ),
          expect.stringContaining(
            "insert.openLineBelow contains unsupported printable text sequence space",
          ),
        ]),
      );
    });

    test("rejects protected key in insert binding without allow-list", () => {
      const result = resolveVimOptions({
        piVimMode: {
          keymap: { insert: { openLineBelow: ["enter"] } },
        },
      });
      expect(result.options.keymap?.insert.openLineBelow).toEqual([]);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining("insert.openLineBelow contains protected key enter"),
        ]),
      );
    });

    test("accepts allow-listed protected key in insert binding", () => {
      const result = resolveVimOptions({
        piVimMode: {
          keymap: {
            insert: { openLineBelow: ["enter"] },
            allowProtectedOverrides: ["enter"],
          },
        },
      });
      expect(result.options.keymap?.insert.openLineBelow).toEqual(["enter"]);
      expect(result.warnings).toEqual([]);
    });

    test("warns when insert actions share a binding", () => {
      const result = resolveVimOptions({
        piVimMode: {
          keymap: {
            insert: { openLineBelow: ["ctrl+o"], openLineAbove: ["<C-O>"] },
          },
        },
      });
      expect(result.options.keymap?.insert.openLineBelow).toEqual(["ctrl+o"]);
      expect(result.options.keymap?.insert.openLineAbove).toEqual(["ctrl+o"]);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            "duplicate piVimMode.keymap.insert binding ctrl+o for openLineBelow and openLineAbove",
          ),
        ]),
      );
    });

    test("invalid insert binding fields preserve valid siblings", () => {
      const result = resolveVimOptions({
        piVimMode: {
          keymap: {
            insert: {
              openLineBelow: ["ctrl+j"],
              unknownAction: ["ctrl+l"],
            } as Record<string, string[]>,
            commands: { openLineBelow: ["o"] },
          },
        },
      });
      expect(result.options.keymap?.insert.openLineBelow).toEqual(["ctrl+j"]);
      expect(result.options.keymap?.insert.openLineAbove).toEqual([]);
      expect(result.options.keymap?.insert.deleteWordBackward).toEqual([]);
      expect(result.options.keymap?.insert.deleteWordForward).toEqual([]);
      expect(result.options.keymap?.insert.deleteLineBackward).toEqual([]);
      expect(result.options.keymap?.insert.deleteLineForward).toEqual([]);
      expect(result.options.keymap?.insert.moveWordBackward).toEqual([]);
      expect(result.options.keymap?.insert.moveWordForward).toEqual([]);
      expect(result.options.keymap?.insert.moveLineStart).toEqual([]);
      expect(result.options.keymap?.insert.moveLineEnd).toEqual([]);
      expect(result.options.keymap?.commands.openLineBelow).toEqual(["o"]);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining("unsupported piVimMode.keymap.insert.unknownAction"),
        ]),
      );
    });

    test("non-object insert is rejected", () => {
      const result = resolveVimOptions({
        piVimMode: {
          keymap: { insert: "invalid" } as Record<string, unknown>,
        },
      });
      expect(result.options.keymap?.insert.openLineBelow).toEqual([]);
      expect(result.options.keymap?.insert.openLineAbove).toEqual([]);
      expect(result.options.keymap?.insert.deleteWordBackward).toEqual([]);
      expect(result.options.keymap?.insert.deleteWordForward).toEqual([]);
      expect(result.options.keymap?.insert.deleteLineBackward).toEqual([]);
      expect(result.options.keymap?.insert.deleteLineForward).toEqual([]);
      expect(result.options.keymap?.insert.moveWordBackward).toEqual([]);
      expect(result.options.keymap?.insert.moveWordForward).toEqual([]);
      expect(result.options.keymap?.insert.moveLineStart).toEqual([]);
      expect(result.options.keymap?.insert.moveLineEnd).toEqual([]);
      expect(result.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining("keymap.insert must be an object")]),
      );
    });

    test("insert bindings compile as immutable arrays without sharing defaults", () => {
      const result = resolveVimOptions({
        piVimMode: {
          keymap: { insert: { openLineBelow: ["ctrl+j"] } },
        },
      });
      expect(Object.isFrozen(result.options.keymap!.insert.openLineBelow)).toBe(true);
      expect(DEFAULT_VIM_OPTIONS.keymap?.insert.openLineBelow).toEqual([]);
    });

    test("accepts configured insert edit and movement bindings", () => {
      const result = resolveVimOptions({
        piVimMode: {
          keymap: {
            insert: {
              deleteWordBackward: ["ctrl+w"],
              deleteWordForward: ["alt+d"],
              deleteLineBackward: ["ctrl+u"],
              deleteLineForward: ["ctrl+k"],
              moveWordBackward: ["alt+b"],
              moveWordForward: ["alt+f"],
              moveLineStart: ["ctrl+a"],
              moveLineEnd: ["ctrl+e"],
            },
            allowProtectedOverrides: ["ctrl+u"],
          },
        },
      });
      expect(result.warnings).toEqual([]);
      expect(result.options.keymap?.insert.deleteWordBackward).toEqual(["ctrl+w"]);
      expect(result.options.keymap?.insert.deleteWordForward).toEqual(["alt+d"]);
      expect(result.options.keymap?.insert.deleteLineBackward).toEqual(["ctrl+u"]);
      expect(result.options.keymap?.insert.deleteLineForward).toEqual(["ctrl+k"]);
      expect(result.options.keymap?.insert.moveWordBackward).toEqual(["alt+b"]);
      expect(result.options.keymap?.insert.moveWordForward).toEqual(["alt+f"]);
      expect(result.options.keymap?.insert.moveLineStart).toEqual(["ctrl+a"]);
      expect(result.options.keymap?.insert.moveLineEnd).toEqual(["ctrl+e"]);
    });
  });

  test("word search command bindings remap, reject protected keys, and preserve siblings", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          commands: {
            searchWordForward: ["<C-s>", "8"],
            searchWordBackward: ["ctrl+c"],
            startSearch: ["/"],
          },
        },
      },
    });

    expect(result.options.keymap?.commands.searchWordForward).toEqual(["ctrl+s", "8"]);
    expect(result.options.keymap?.commands.searchWordBackward).toEqual(["#"]);
    expect(result.options.keymap?.commands.startSearch).toEqual(["/"]);
    expect(result.warnings.some((warning) => warning.includes("searchWordBackward"))).toBe(true);
  });

  test("scroll control keys are only allowed for scroll motions", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          motions: { halfPageDown: ["<C-d>"], halfPageUp: ["<C-u>"], left: ["<C-d>"] },
          commands: { openLineBelow: ["<C-u>"] },
        },
      },
    });

    expect(result.options.keymap?.motions.halfPageDown).toEqual(["ctrl+d"]);
    expect(result.options.keymap?.motions.halfPageUp).toEqual(["ctrl+u"]);
    expect(result.options.keymap?.motions.left).toEqual(["h", "left"]);
    expect(result.options.keymap?.commands.openLineBelow).toEqual(["o"]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("motions.left contains protected key ctrl+d"),
        expect.stringContaining("commands.openLineBelow contains protected key ctrl+u"),
      ]),
    );
  });

  test("explicit keymap bindings override lower-priority default top-level bindings", () => {
    const result = resolveVimOptions({
      piVimMode: { keymap: { motions: { wordForward: ["q"] } } },
    });

    expect(result.options.keymap?.motions.wordForward).toEqual(["q"]);
    expect(result.options.keymap?.macros.record).toEqual([]);
    expect(result.warnings.some((warning) => warning.includes("binding q"))).toBe(false);
  });

  test("explicit keymap bindings override lower-priority default prefix bindings", () => {
    const result = resolveVimOptions({
      piVimMode: { keymap: { motions: { left: ["g"] } } },
    });

    expect(result.options.keymap?.motions.left).toEqual(["g"]);
    expect(result.options.keymap?.motions.bufferStart).toEqual([]);
    expect(result.options.keymap?.motions.wordPreviousEnd).toEqual([]);
    expect(result.options.keymap?.motions.wordPreviousEndBig).toEqual([]);
    expect(result.warnings.some((warning) => warning.includes("binding g"))).toBe(false);
  });

  test("parses shift operator keymap and rejects motion matrices for line-only operators", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          operators: { indent: ["]"], dedent: ["["], delete: ["d"], toggleCase: ["z~"] },
          operatorMotions: {
            delete: ["wordForward"],
            toggleCase: ["wordForward"],
            indent: ["wordForward"],
            dedent: ["lineEnd"],
          },
        },
      },
    });

    expect(result.options.keymap?.operators.indent).toEqual(["]"]);
    expect(result.options.keymap?.operators.dedent).toEqual(["["]);
    expect(result.options.keymap?.operators.delete).toEqual(["d"]);
    expect(result.options.keymap?.operators.toggleCase).toEqual(["z~"]);
    expect(result.options.keymap?.operatorMotions.delete).toEqual(["wordForward"]);
    expect(result.options.keymap?.operatorMotions.toggleCase).toEqual(["wordForward"]);
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
    expect(DEFAULT_VIM_OPTIONS.keymap?.motions.halfPageDown).toEqual(["ctrl+d"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.motions.halfPageUp).toEqual(["ctrl+u"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.motions.paragraphBackward).toEqual(["{"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.motions.paragraphForward).toEqual(["}"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.textObjects.targets.paragraph).toEqual(["p"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.delete).toContain("paragraphForward");
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.delete).toContain("paragraphBackward");
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.change).toContain("paragraphForward");
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.yank).toContain("paragraphBackward");
    expect(DEFAULT_VIM_OPTIONS.keymap?.motions.wordForwardBig).toEqual(["W"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.motions.wordBackwardBig).toEqual(["B"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.motions.wordEndBig).toEqual(["E"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.motions.wordPreviousEnd).toEqual(["ge"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.motions.wordPreviousEndBig).toEqual(["gE"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.incrementNumber).toEqual(["ctrl+a"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.decrementNumber).toEqual(["ctrl+x"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.replaceChar).toEqual(["r"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.toggleCase).toEqual(["~"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.operators.lowercase).toEqual(["gu"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.operators.uppercase).toEqual(["gU"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.operators.toggleCase).toEqual(["g~"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.repeatChange).toEqual(["."]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.redo).toEqual(["ctrl+r"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.startExCommand).toEqual([":"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.commands.startSearchBackward).toEqual(["?"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.operators.indent).toEqual([">"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.operators.dedent).toEqual(["<"]);
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.delete).toEqual(
      DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.change,
    );
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.delete).toEqual(
      DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.yank,
    );
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.delete).toContain("wordEnd");
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.delete).not.toContain("halfPageDown");
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.delete).not.toContain("halfPageUp");
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.delete).toContain("wordForwardBig");
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.change).toContain("wordPreviousEnd");
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.yank).toContain("wordPreviousEndBig");
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.lowercase).toEqual(
      DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.delete,
    );
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.uppercase).toEqual(
      DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.delete,
    );
    expect(DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.toggleCase).toEqual(
      DEFAULT_VIM_OPTIONS.keymap?.operatorMotions.delete,
    );

    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          motions: {
            wordEnd: ["E"],
            wordForwardBig: ["gw"],
            wordPreviousEnd: ["g-"],
            halfPageDown: ["<C-d>"],
            halfPageUp: ["<C-u>"],
          },
          operators: { lowercase: ["gl"] },
          commands: { incrementNumber: ["+"], toggleCase: ["<A-t>"], redo: ["U"] },
          operatorMotions: {
            change: ["wordEnd", "wordPreviousEnd", "halfPageDown"],
            lowercase: ["wordEnd"],
          },
        },
      },
    });
    expect(result.options.keymap?.motions.wordEnd).toEqual(["E"]);
    expect(result.options.keymap?.motions.wordForwardBig).toEqual(["gw"]);
    expect(result.options.keymap?.motions.wordPreviousEnd).toEqual(["g-"]);
    expect(result.options.keymap?.motions.halfPageDown).toEqual(["ctrl+d"]);
    expect(result.options.keymap?.motions.halfPageUp).toEqual(["ctrl+u"]);
    expect(result.options.keymap?.operators.lowercase).toEqual(["gl"]);
    expect(result.options.keymap?.commands.incrementNumber).toEqual(["+"]);
    expect(result.options.keymap?.commands.toggleCase).toEqual(["alt+t"]);
    expect(result.options.keymap?.commands.redo).toEqual(["U"]);
    expect(result.options.keymap?.operatorMotions.change).toEqual(["wordEnd", "wordPreviousEnd"]);
    expect(result.options.keymap?.operatorMotions.lowercase).toEqual(["wordEnd"]);
    expect(
      result.warnings.some((warning) =>
        warning.includes("operatorMotions.change contains unsupported operator motion"),
      ),
    ).toBe(true);
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
            targets: { codeFence: ["R"], tag: ["H"] },
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
    const heavy = resolveVimOptions({ piVimMode: { preset: "vim-heavy" } });
    expect(heavy.warnings).toEqual([]);
    expect(heavy.options.keymap?.commands.visualBlock).toEqual([]);

    const result = resolveVimOptions({
      piVimMode: {
        preset: "vim-heavy",
        startMode: "insert",
        keymap: {
          commands: { visualBlock: ["ctrl+v"] },
          allowProtectedOverrides: ["ctrl+v"],
        },
        ui: { cursorPosition: { enabled: true } },
      },
    });

    expect(result.warnings).toEqual([]);
    expect(result.options.preset).toBe("vim-heavy");
    expect(result.options.startMode).toBe("insert");
    expect(result.options.keymap?.commands.visualBlock).toEqual(["ctrl+v"]);
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

  test("malformed settings files fall back safely", async () => {
    const paths = tempSettings();
    try {
      writeFileSync(paths.globalPath, "{ nope");
      writeFileSync(paths.projectPath, JSON.stringify({ piVimMode: { startMode: "normal" } }));
      const result = await loadVimOptions({
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
        allowProtectedOverrides: ["ctrl+v"],
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

  test("project exact actions override inherited grammar in only claimed scopes", () => {
    const result = resolveVimOptions(undefined, {
      piVimMode: {
        keymap: {
          actions: {
            "prompt.transform.quote": [{ key: "u", modes: ["normal"] }],
          },
        },
      },
    });

    expect(result.options.keymap?.actions.accepted).toEqual([
      {
        key: "u",
        actionId: "prompt.transform.quote",
        args: { action: "quote" },
        modes: ["normal"],
      },
    ]);
    expect(result.plan.scopes.normal.exact.u).toEqual({
      kind: "action",
      id: "prompt.transform.quote",
      args: { action: "quote" },
    });
    expect(result.plan.scopes.visual.exact.u).toBeUndefined();
    expect(result.warnings.join("\n")).not.toContain("conflicts with commands.undo");
  });

  test("project leader actions override inherited grammar after final leader expansion", () => {
    const result = resolveVimOptions(
      { piVimMode: { keymap: { commands: { undo: [",u"] } } } },
      {
        piVimMode: {
          leader: ",",
          keymap: {
            actions: { "prompt.transform.quote": [{ key: "<leader>u", modes: ["normal"] }] },
          },
        },
      },
    );

    expect(result.options.keymap?.actions.accepted).toEqual([
      {
        key: ",u",
        actionId: "prompt.transform.quote",
        args: { action: "quote" },
        modes: ["normal"],
      },
    ]);
    expect(result.plan.scopes.normal.exact[",u"]?.id).toBe("prompt.transform.quote");
    expect(result.warnings.join("\n")).not.toContain("conflicts with commands.undo");
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

  test("protected keys remain rejected when allowProtectedOverrides is absent", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          commands: { showKeybindings: ["ctrl+p"], visualBlock: ["ctrl+v", "alt+v", "ctrl+alt+v"] },
          allowProtectedOverrides: undefined,
        },
      },
    });

    expect(result.options.keymap?.commands.showKeybindings).toEqual([]);
    expect(result.options.keymap?.commands.visualBlock).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("protected key ctrl+p"),
        expect.stringContaining("protected key ctrl+v"),
        expect.stringContaining("protected key alt+v"),
        expect.stringContaining("protected key ctrl+alt+v"),
      ]),
    );
  });

  test("allow-listed protected classic bindings are accepted and normalized", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          commands: { showKeybindings: ["ctrl+p"], visualBlock: ["ctrl+v", "alt+v", "ctrl+alt+v"] },
          allowProtectedOverrides: ["ctrl+p", "ctrl+v", "alt+v", "ctrl+alt+v"],
        },
      },
    });

    expect(result.options.keymap?.commands.showKeybindings).toEqual(["ctrl+p"]);
    expect(result.options.keymap?.commands.visualBlock).toEqual(["ctrl+v", "alt+v", "ctrl+alt+v"]);
    expect(result.warnings).toEqual([]);
  });

  test("allow-listed protected action bindings are accepted unless another action validation rule rejects them", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          actions: {
            "prompt.transform.reflow": [{ key: "ctrl+p" }],
          },
          allowProtectedOverrides: ["ctrl+p"],
        },
      },
    });

    expect(result.options.keymap?.actions.accepted).toEqual([
      { key: "ctrl+p", actionId: "prompt.transform.reflow", args: { action: "reflow" } },
    ]);
    expect(result.warnings).toEqual([]);
  });

  test("global allow-list entries do not authorize project-layer protected bindings without a project allow-list", () => {
    const result = resolveVimOptions(
      { piVimMode: { keymap: { allowProtectedOverrides: ["ctrl+p"] } } },
      {
        piVimMode: {
          keymap: {
            commands: { showKeybindings: ["ctrl+p"] },
          },
        },
      },
    );

    expect(result.options.keymap?.commands.showKeybindings).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("protected key ctrl+p")]),
    );
  });

  test("invalid allow-list entries warn while valid protected entries and sibling keymap fields remain usable", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          commands: { showKeybindings: ["ctrl+p"] },
          allowProtectedOverrides: ["ctrl+p", "", "<invalid>", "ctrl+t"],
        },
      },
    });

    expect(result.options.keymap?.commands.showKeybindings).toEqual(["ctrl+p"]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("unsupported key")]),
    );
    expect(result.warnings).not.toEqual(
      expect.arrayContaining([expect.stringContaining("protected key ctrl+p")]),
    );
  });

  test("rejects later strict-prefix action overlap per scope", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          actions: {
            "prompt.transform.quote": [{ key: "za", modes: ["normal"] }],
            "prompt.transform.reflow": [
              { key: "zab", modes: ["normal"] },
              { key: "zab", modes: ["visual"] },
            ],
          },
        },
      },
    });

    expect(result.options.keymap?.actions.accepted).toEqual([
      {
        key: "za",
        actionId: "prompt.transform.quote",
        args: { action: "quote" },
        modes: ["normal"],
      },
      {
        key: "zab",
        actionId: "prompt.transform.reflow",
        args: { action: "reflow" },
        modes: ["visual"],
      },
    ]);
    expect(result.warnings).toEqual([
      expect.stringContaining("strict-prefix conflict with prompt.transform.quote.za"),
    ]);
  });

  test("keeps non-conflicting scopes from one multi-scope action binding", () => {
    const result = resolveVimOptions({
      piVimMode: {
        keymap: {
          actions: {
            "prompt.transform.quote": [{ key: "za", modes: ["normal"] }],
            "prompt.transform.reflow": [{ key: "zab", modes: ["normal", "visual"] }],
          },
        },
      },
    });

    expect(result.options.keymap?.actions.accepted).toContainEqual({
      key: "zab",
      actionId: "prompt.transform.reflow",
      args: { action: "reflow" },
      modes: ["visual"],
    });
    expect(result.plan.scopes.visual.exact.zab?.id).toBe("prompt.transform.reflow");
    expect(result.plan.scopes.normal.exact.zab).toBeUndefined();
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
        expect.stringContaining("conflict with operators.lowercase"),
        expect.stringContaining("duplicate action key gq"),
        expect.stringContaining("duplicate action key zq"),
      ]),
    );
  });
});
