import { describe, expect, test } from "bun:test";

import { DEFAULT_VIM_OPTIONS, resolveVimOptions } from "../src/config.ts";
import {
  actionsMessage,
  doctorMessage,
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
    expect(keymapMessage(keymap, "redo")).toContain("command.redo ctrl+r");
    expect(keymapMessage(keymap, "missing-action")).toBe("keymap: no match for missing-action");
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
    expect(mapcheckMessage(keymap, "ctrl+p")).toContain("protected for Pi command/model palette");
    expect(mapcheckMessage(keymap, "ctrl+r")).toBe("mapcheck: ctrl+r -> command.redo");
    expect(mapcheckMessage(keymap, "<C-r>")).toBe("mapcheck: ctrl+r -> command.redo");
    expect(mapcheckMessage(keymap, "zz")).toBe("mapcheck: zz is unmapped");
  });

  test("reports canonical prompt transform action bindings and legacy aliases", () => {
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
    expect(message).not.toContain("promptTransform.prompt.transform.reflow");
    expect(
      actionsMessage(options.keymap!, "promptTransform.reflow", options.promptTransforms),
    ).toContain("prompt.transform.reflow");
    expect(
      keymapMessage(options.keymap!, "prompt.transform.reflow", options.promptTransforms),
    ).toContain("gq");
    expect(mapcheckMessage(options.keymap!, "gq")).toBe("mapcheck: gq -> prompt.transform.reflow");
    expect(mapcheckMessage(options.keymap!, "gg", warnings)).toContain("rejected");
  });

  test("doctor summarizes healthy and warning states", () => {
    expect(doctorMessage(DEFAULT_VIM_OPTIONS)).toBe("vimdoctor: ok — customization healthy");
    expect(doctorMessage(DEFAULT_VIM_OPTIONS, { warnings: ["bad config"] })).toBe(
      "vimdoctor: 1 warning: bad config",
    );
  });
});
