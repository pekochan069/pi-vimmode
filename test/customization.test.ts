import { describe, expect, test } from "bun:test";

import { DEFAULT_VIM_OPTIONS, resolveVimOptions } from "../src/config.ts";
import {
  actionsMessage,
  doctorMessage,
  keybindingCatalogLines,
  keybindingDetailLines,
  keymapMessage,
  mapcheckMessage,
  protectedShortcutForKey,
  searchActions,
} from "../src/customization.ts";

const keymap = DEFAULT_VIM_OPTIONS.keymap!;

describe("vim customization helpers", () => {
  test("searches finite action metadata by id, description, and binding", () => {
    expect(searchActions(keymap, "redo")[0]).toMatchObject({
      id: "redo",
      kind: "command",
      keys: ["ctrl+r"],
    });
    expect(searchActions(keymap, "next word")[0]).toMatchObject({ id: "wordForward" });
    expect(actionsMessage(keymap)).toContain("commands");
    expect(actionsMessage(keymap, "vimscript")).toBe("actions: no match for vimscript");
  });

  test("formats keymap entries from resolved bindings", () => {
    expect(keymapMessage(keymap)).toBe("keymap: 90 entries; :keymap <action>");
    expect(keymapMessage(keymap, "redo")).toContain("command.redo ctrl+r");
    expect(keymapMessage(keymap, "halfPageDown")).toContain("motion.halfPageDown ctrl+d");
    expect(keymapMessage(keymap, "missing-action")).toBe("keymap: no match for missing-action");
  });

  test("classifies diagnostic help actions as metadata-only", () => {
    expect(searchActions(keymap, "vimmode.doctor")[0]).toMatchObject({
      id: "vimmode.doctor",
      kind: "diagnostic",
      keys: [],
    });
    expect(actionsMessage(keymap, "vimdoctor")).toContain("vimmode.doctor");
    expect(actionsMessage(keymap, "vimdoctor")).toContain("metadata-only not bindable");
    expect(actionsMessage(keymap, "vimmode.help")).toContain("runtimeHelp");
    expect(actionsMessage(keymap, "vimmode.dump")).toBe("actions: no match for vimmode.dump");
    expect(actionsMessage(keymap)).toContain("diagnostic metadata");
    expect(actionsMessage(keymap)).toContain("runtime-help metadata");
    expect(keymapMessage(keymap, "vimmode.doctor")).toContain("metadata-only not bindable");
  });

  test("hides disabled macro and mark actions from diagnostics", () => {
    const { options } = resolveVimOptions(undefined, { piVimMode: { preset: "minimal" } });
    expect(keymapMessage(options.keymap!, "macro", undefined, options.macros, options.marks)).toBe(
      "keymap: no match for macro",
    );
    expect(actionsMessage(options.keymap!, "mark", undefined, options.macros, options.marks)).toBe(
      "actions: no match for mark",
    );
  });

  test("explains protected shortcuts and resolved bindings", () => {
    expect(protectedShortcutForKey("ctrl+shift+p")?.reason).toContain("palette");
    expect(protectedShortcutForKey("ctrl+v")?.reason).toContain("image/clipboard paste");
    expect(protectedShortcutForKey("alt+v")?.reason).toContain("image/clipboard paste");
    expect(protectedShortcutForKey("ctrl+alt+v")?.reason).toContain("image/clipboard paste");
    expect(mapcheckMessage(keymap, "ctrl+p")).toContain("protected for Pi command/model palette");
    expect(mapcheckMessage(keymap, "ctrl+v")).toContain("protected for image/clipboard paste");
    expect(mapcheckMessage(keymap, "alt+v")).toContain("protected for image/clipboard paste");
    expect(mapcheckMessage(keymap, "ctrl+alt+v")).toContain("protected for image/clipboard paste");
    const { options: ctrlVOptions } = resolveVimOptions({
      piVimMode: {
        keymap: {
          commands: { visualBlock: ["ctrl+v"] },
          allowProtectedOverrides: ["ctrl+v"],
        },
      },
    });
    expect(mapcheckMessage(ctrlVOptions.keymap!, "ctrl+v")).toBe(
      "mapcheck: ctrl+v -> command.visualBlock",
    );
    expect(mapcheckMessage(keymap, "ctrl+r")).toBe("mapcheck: ctrl+r -> command.redo");
    expect(mapcheckMessage(keymap, "<C-r>")).toBe("mapcheck: ctrl+r -> command.redo");
    expect(mapcheckMessage(keymap, "<C-d>")).toBe("mapcheck: ctrl+d -> motion.halfPageDown");
    expect(mapcheckMessage(keymap, "{")).toBe("mapcheck: { -> motion.paragraphBackward");
    expect(mapcheckMessage(keymap, "}")).toBe("mapcheck: } -> motion.paragraphForward");
    expect(mapcheckMessage(keymap, "zz")).toBe("mapcheck: zz is unmapped");
  });

  test("reports configured escape aliases as modal escape bindings", () => {
    const { options } = resolveVimOptions({
      piVimMode: { keymap: { escape: ["<C-j>", "<D-j>"] } },
    });

    expect(actionsMessage(options.keymap!)).toContain("1 escape aliases");
    expect(keymapMessage(options.keymap!, "escape")).toContain("escape.alias ctrl+j,super+j");
    expect(keymapMessage(options.keymap!, "escape")).toContain("Ex command-line");
    expect(mapcheckMessage(options.keymap!, "super+j")).toBe("mapcheck: super+j -> escape.alias");
    expect(keybindingDetailLines({ keymap: options.keymap! }, "ctrl+j").join("\n")).toContain(
      "escape.alias -> ctrl+j,super+j [modal]",
    );
  });

  test("reports canonical prompt transform action bindings only", () => {
    const { options, warnings } = resolveVimOptions({
      piVimMode: {
        keymap: {
          actions: {
            "prompt.transform.reflow": ["gq"],
            "prompt.transform.quote": ["gg"],
          },
        },
      },
    });
    const message = actionsMessage(options.keymap!, "reflow", options.promptTransforms);
    expect(message).toContain("prompt.transform.reflow");
    expect(message).not.toContain("promptTransform");
    expect(
      actionsMessage(options.keymap!, "promptTransform.reflow", options.promptTransforms),
    ).toBe("actions: no match for promptTransform.reflow");
    expect(keymapMessage(options.keymap!, "promptTransform.reflow", options.promptTransforms)).toBe(
      "keymap: no match for promptTransform.reflow",
    );
    expect(
      keymapMessage(options.keymap!, "prompt.transform.reflow", options.promptTransforms),
    ).toContain("gq");
    expect(mapcheckMessage(options.keymap!, "gq")).toBe("mapcheck: gq -> prompt.transform.reflow");
    expect(mapcheckMessage(options.keymap!, "gg", warnings)).toContain("rejected");
  });

  test("reports disabled prompt transforms as disabled registry entries", () => {
    const { options, warnings } = resolveVimOptions({
      piVimMode: {
        promptTransforms: { actions: { reflow: false } },
        keymap: { actions: { "prompt.transform.reflow": ["gq"] } },
      },
    });

    const actions = actionsMessage(options.keymap!, "reflow", options.promptTransforms);
    expect(actions).toContain("prompt.transform.reflow");
    expect(actions).toContain("disabled");
    expect(actions).toContain("width?:integer");
    expect(actions).not.toContain("promptTransform");
    expect(keymapMessage(options.keymap!, "reflow", options.promptTransforms)).toContain(
      "disabled",
    );
    expect(mapcheckMessage(options.keymap!, "gq", warnings)).toContain("prompt.transform.reflow");
    expect(doctorMessage(options, { warnings })).toContain("prompt.transform.reflow");
  });

  test("formats keybinding catalog from effective resolved bindings", () => {
    const { options } = resolveVimOptions({
      piVimMode: {
        keymap: {
          escape: ["<D-j>"],
          commands: { redo: ["U"] },
          actions: { "prompt.transform.reflow": ["gq"] },
        },
      },
    });
    const lines = keybindingCatalogLines({
      keymap: options.keymap!,
      promptTransforms: options.promptTransforms,
      macros: options.macros,
      marks: options.marks,
    }).join("\n");

    expect(lines).toContain("Commands");
    expect(lines).toContain("Motions");
    expect(lines).toContain("Operators");
    expect(lines).toContain("Text objects");
    expect(lines).toContain("Escape aliases");
    expect(lines).toContain("Macros");
    expect(lines).toContain("Marks");
    expect(lines).toContain("Searches");
    expect(lines).toContain("Prompt transforms");
    expect(lines).not.toContain("Effective pi-vimmode keybindings");
    expect(lines).not.toContain("Diagnostic/help metadata");
    expect(lines).toContain("Protected Pi shortcuts");
    expect(lines).toContain("▸ Commands");
    expect(lines).toContain("Key            Mode        Action");
    expect(lines).toContain("U              normal      command.redo");
    expect(lines).toContain("super+j        modal       escape.alias");
    expect(lines).toContain("gq             n/v         prompt.transform.reflow");
    expect(lines).not.toContain("promptTransform");
    expect(lines).not.toContain(" → ");
    expect(lines).not.toContain("vimmode.help metadata-only not bindable");
    expect(lines).toContain("ctrl+p");
    expect(lines).toContain("protected for Pi command/model palette");
    expect(lines).toContain("ctrl+v");
    expect(lines).toContain("alt+v");
    expect(lines).toContain("protected for image/clipboard paste");
  });

  test("catalog reports disabled effective feature families", () => {
    const { options } = resolveVimOptions(undefined, { piVimMode: { preset: "minimal" } });
    const lines = keybindingCatalogLines({
      keymap: options.keymap!,
      promptTransforms: options.promptTransforms,
      macros: options.macros,
      marks: options.marks,
    }).join("\n");

    expect(lines).toContain("▸ Macros (0)\n  disabled");
    expect(lines).toContain("▸ Marks (0)\n  disabled");
    expect(lines).not.toContain("macro.record");
    expect(lines).not.toContain("mark.set");
  });

  test("formats keybinding detail matches and key ownership", () => {
    const { options, warnings } = resolveVimOptions({
      piVimMode: {
        keymap: {
          commands: { redo: ["U"] },
          actions: {
            "prompt.transform.reflow": ["gq"],
            "vimmode.keybindings": ["gk"],
          },
        },
      },
    });
    const context = {
      keymap: options.keymap!,
      promptTransforms: options.promptTransforms,
      macros: options.macros,
      marks: options.marks,
      warnings,
    };

    expect(keybindingDetailLines(context, "redo").join("\n")).toContain("command.redo -> U");
    expect(keybindingDetailLines(context, "wordForward").join("\n")).toContain(
      "motion.wordForward",
    );
    expect(keybindingDetailLines(context, "ctrl+p").join("\n")).toContain(
      "protected for Pi command/model palette",
    );
    expect(keybindingDetailLines(context, "ctrl+v").join("\n")).toContain(
      "protected for image/clipboard paste",
    );
    expect(keybindingDetailLines(context, "alt+v").join("\n")).toContain(
      "protected for image/clipboard paste",
    );
    expect(keybindingDetailLines(context, "ctrl+alt+v").join("\n")).toContain(
      "protected for image/clipboard paste",
    );
    expect(keybindingDetailLines(context, "gq").join("\n")).toContain("prompt.transform.reflow");
    expect(keybindingDetailLines(context, "help").join("\n")).toContain(
      "No keybinding match for help",
    );
    expect(keybindingDetailLines(context, "vimmode.keybindings").join("\n")).toContain(
      "vimmode.keybindings rejected",
    );
    expect(keybindingDetailLines(context, "vimscript").join("\n")).toContain(
      "No keybinding match for vimscript",
    );
  });

  test("doctor summarizes healthy and warning states", () => {
    expect(doctorMessage(DEFAULT_VIM_OPTIONS)).toBe("vimdoctor: ok — customization healthy");
    expect(doctorMessage(DEFAULT_VIM_OPTIONS, { warnings: ["bad config"] })).toBe(
      "vimdoctor: 1 warning: bad config",
    );
  });
});
