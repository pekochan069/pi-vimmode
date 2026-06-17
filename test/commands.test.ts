import { describe, expect, test } from "bun:test";

import {
  isMacroSlot,
  isPendingOperatorKey,
  parseNormalCommand,
  resolveMacroCommand,
  resolveNormalCommand,
} from "../src/commands.ts";
import { DEFAULT_VIM_KEYMAP, resolveVimOptions } from "../src/config.ts";

const operatorMotions = [
  "h",
  "j",
  "k",
  "l",
  "w",
  "b",
  "e",
  "W",
  "B",
  "E",
  "ge",
  "gE",
  "0",
  "^",
  "$",
  "G",
  "%",
] as const;

describe("normal command parser", () => {
  test("creates pending state for operators and g prefix", () => {
    expect(parseNormalCommand("d")).toEqual({ type: "pending", operator: "d" });
    expect(parseNormalCommand("c")).toEqual({ type: "pending", operator: "c" });
    expect(parseNormalCommand("y")).toEqual({ type: "pending", operator: "y" });
    expect(parseNormalCommand("g")).toEqual({ type: "pending", operator: "g" });
  });

  test("resolves doubled line commands and gg", () => {
    expect(parseNormalCommand("d", "d")).toEqual({ type: "command", command: "dd" });
    expect(parseNormalCommand("c", "c")).toEqual({ type: "command", command: "cc" });
    expect(parseNormalCommand("y", "y")).toEqual({ type: "command", command: "yy" });
    expect(parseNormalCommand("g", "g")).toEqual({ type: "command", command: "gg" });
  });

  test("resolves shift operators as line-only semantic commands", () => {
    expect(resolveNormalCommand(">", undefined)).toEqual({ type: "pending", pending: ">" });
    expect(resolveNormalCommand("<", undefined)).toEqual({ type: "pending", pending: "<" });
    expect(resolveNormalCommand(">", ">")).toEqual({ type: "lineCommand", operator: "indent" });
    expect(resolveNormalCommand("<", "<")).toEqual({ type: "lineCommand", operator: "dedent" });

    const count = resolveNormalCommand("3", undefined);
    const pendingIndent = resolveNormalCommand(">", count.type === "pending" ? count.pending : "");
    expect(
      resolveNormalCommand(">", pendingIndent.type === "pending" ? pendingIndent.pending : ""),
    ).toEqual({ type: "lineCommand", operator: "indent", count: 3 });

    const dedentCount = resolveNormalCommand("2", undefined);
    const pendingDedent = resolveNormalCommand(
      "<",
      dedentCount.type === "pending" ? dedentCount.pending : "",
    );
    expect(
      resolveNormalCommand("<", pendingDedent.type === "pending" ? pendingDedent.pending : ""),
    ).toEqual({ type: "lineCommand", operator: "dedent", count: 2 });
  });

  test("resolves operator motions", () => {
    for (const operator of ["d", "c", "y"] as const) {
      for (const motion of operatorMotions) {
        expect(parseNormalCommand(motion, operator)).toEqual({
          type: "operatorMotion",
          operator,
          motion,
        });
      }
      const pendingG = resolveNormalCommand("g", operator);
      expect(pendingG.type).toBe("pending");
      expect(
        resolveNormalCommand("g", pendingG.type === "pending" ? pendingG.pending : ""),
      ).toEqual({
        type: "operatorMotion",
        operator: operator === "d" ? "delete" : operator === "c" ? "change" : "yank",
        motion: "bufferStart",
      });
    }
  });

  test("invalid pending key clears state", () => {
    expect(parseNormalCommand("x", "d")).toEqual({ type: "invalid" });
    expect(parseNormalCommand("p", "c")).toEqual({ type: "invalid" });
    expect(parseNormalCommand("d", "y")).toEqual({ type: "invalid" });
    expect(parseNormalCommand("x", "g")).toEqual({ type: "invalid" });
  });

  test("shift operators reject unsupported targets safely", () => {
    expect(resolveNormalCommand("w", ">")).toEqual({ type: "invalid" });

    const indentInner = resolveNormalCommand("i", ">");
    expect(indentInner).toEqual({ type: "invalid" });

    expect(resolveNormalCommand("/", ">")).toEqual({ type: "invalid" });
    expect(resolveNormalCommand("'", ">")).toEqual({ type: "invalid" });
    expect(resolveNormalCommand("w", "<")).toEqual({ type: "invalid" });
  });

  test("non-command key is not parsed", () => {
    expect(parseNormalCommand("x")).toEqual({ type: "none" });
  });

  test("pending key type guard", () => {
    expect(isPendingOperatorKey("d")).toBe(true);
    expect(isPendingOperatorKey("c")).toBe(true);
    expect(isPendingOperatorKey("y")).toBe(true);
    expect(isPendingOperatorKey("g")).toBe(true);
    expect(isPendingOperatorKey("x")).toBe(false);
  });

  test("explicit motion binding wins over default macro record binding", () => {
    const keymap = resolveVimOptions({
      piVimMode: { keymap: { motions: { wordForward: ["q"] } } },
    }).options.keymap;

    expect(resolveNormalCommand("q", undefined, keymap)).toEqual({
      type: "motion",
      motion: "wordForward",
    });
  });

  test("resolves macro prefixes and targets separately from operator state", () => {
    expect(isMacroSlot("a")).toBe(true);
    expect(isMacroSlot("z")).toBe(true);
    expect(isMacroSlot("A")).toBe(false);
    expect(isMacroSlot("1")).toBe(false);
    expect(resolveMacroCommand("q", undefined, false)).toEqual({
      type: "pendingMacro",
      target: "record",
    });
    expect(resolveMacroCommand("a", "record", false)).toEqual({
      type: "startRecording",
      slot: "a",
    });
    expect(resolveMacroCommand("1", "record", false)).toEqual({ type: "invalid" });
    expect(resolveMacroCommand("q", undefined, true)).toEqual({ type: "stopRecording" });
    expect(resolveMacroCommand("@", undefined, false)).toEqual({
      type: "pendingMacro",
      target: "play",
    });
    expect(resolveMacroCommand("a", "play", false)).toEqual({ type: "playMacro", slot: "a" });
    expect(resolveMacroCommand("@", "play", false)).toEqual({ type: "repeatMacro" });
    expect(resolveMacroCommand("w", undefined, false)).toEqual({ type: "none" });
    expect(
      resolveMacroCommand("m", undefined, false, {
        recordKeys: ["m"],
        playKeys: ["r"],
        slots: ["x"],
      }),
    ).toEqual({ type: "pendingMacro", target: "record" });
    expect(
      resolveMacroCommand("x", "record", false, {
        recordKeys: ["m"],
        playKeys: ["r"],
        slots: ["x"],
      }),
    ).toEqual({ type: "startRecording", slot: "x" });
    expect(resolveMacroCommand("q", undefined, false, { enabled: false })).toEqual({
      type: "none",
    });
  });

  test("resolves configured prompt transform action bindings", () => {
    const keymap = resolveVimOptions({
      piVimMode: {
        keymap: {
          actions: { "prompt.transform.reflow": ["gq", { key: "gQ", args: { width: 72 } }] },
        },
      },
    }).options.keymap;
    expect(keymap?.actions.accepted).toHaveLength(2);

    const pending = resolveNormalCommand("g", undefined, keymap);
    expect(pending).toEqual({ type: "pending", pending: "g" });
    expect(
      resolveNormalCommand("q", pending.type === "pending" ? pending.pending : "", keymap),
    ).toEqual({
      type: "action",
      actionId: "prompt.transform.reflow",
      args: { action: "reflow" },
    });

    const count = resolveNormalCommand("3", undefined, keymap);
    const countedPrefix = resolveNormalCommand(
      "g",
      count.type === "pending" ? count.pending : "",
      keymap,
    );
    expect(
      resolveNormalCommand(
        "Q",
        countedPrefix.type === "pending" ? countedPrefix.pending : "",
        keymap,
      ),
    ).toEqual({
      type: "action",
      actionId: "prompt.transform.reflow",
      args: { action: "reflow", width: 72 },
      count: 3,
    });
  });

  test("resolves preset-derived prompt transform action bindings", () => {
    const keymap = resolveVimOptions({
      piVimMode: { keymap: { actionPresets: ["paragraph-editing"] } },
    }).options.keymap;

    const pending = resolveNormalCommand("g", undefined, keymap);
    expect(pending).toEqual({ type: "pending", pending: "g" });
    expect(
      resolveNormalCommand("q", pending.type === "pending" ? pending.pending : "", keymap),
    ).toEqual({
      type: "action",
      actionId: "prompt.transform.reflow",
      args: { action: "reflow" },
    });
  });

  test("action bindings do not resolve as operator targets", () => {
    const keymap = resolveVimOptions({
      piVimMode: { keymap: { actions: { "prompt.transform.reflow": ["gq"] } } },
    }).options.keymap;
    const operatorPrefix = resolveNormalCommand("g", "d", keymap);
    expect(operatorPrefix).toEqual({
      type: "pending",
      pending: "d\u0000motion\u0000g\u0000motion\u0000",
    });
    expect(
      resolveNormalCommand(
        "q",
        operatorPrefix.type === "pending" ? operatorPrefix.pending : "",
        keymap,
      ),
    ).toEqual({
      type: "invalid",
    });
  });

  test("rejected action conflicts preserve legacy command behavior", () => {
    const result = resolveVimOptions({
      piVimMode: { keymap: { actions: { "prompt.transform.quote": ["gg"] } } },
    });
    expect(result.options.keymap?.actions.accepted).toEqual([]);
    expect(resolveNormalCommand("g", undefined, result.options.keymap)).toEqual({
      type: "pending",
      pending: "g",
    });
    expect(resolveNormalCommand("g", "g", result.options.keymap)).toEqual({
      type: "motion",
      motion: "bufferStart",
    });
  });

  test("resolves configured keybindings popup command through semantic parser", () => {
    const keymap = resolveVimOptions({
      piVimMode: { keymap: { commands: { showKeybindings: ["gk"] } } },
    }).options.keymap;

    const pending = resolveNormalCommand("g", undefined, keymap);
    expect(pending).toEqual({ type: "pending", pending: "g" });
    expect(
      resolveNormalCommand("k", pending.type === "pending" ? pending.pending : "", keymap),
    ).toEqual({
      type: "command",
      command: "showKeybindings",
    });
  });

  test("resolves configured semantic operators, motions, and commands", () => {
    const keymap = {
      ...DEFAULT_VIM_KEYMAP,
      operators: { ...DEFAULT_VIM_KEYMAP.operators, delete: ["q"] },
      motions: { ...DEFAULT_VIM_KEYMAP.motions, wordForward: ["e"] },
      commands: {
        ...DEFAULT_VIM_KEYMAP.commands,
        openLineBelow: ["n"],
        toggleCase: ["~"],
        visualBlock: ["ctrl+v"],
        redo: ["ctrl+r"],
      },
    };

    expect(resolveNormalCommand("q", undefined, keymap)).toEqual({
      type: "pending",
      pending: "q",
    });
    expect(resolveNormalCommand("e", "q", keymap)).toEqual({
      type: "operatorMotion",
      operator: "delete",
      motion: "wordForward",
    });
    expect(resolveNormalCommand("n", undefined, keymap)).toEqual({
      type: "command",
      command: "openLineBelow",
    });
    expect(resolveNormalCommand("~", undefined, keymap)).toEqual({
      type: "command",
      command: "toggleCase",
    });
    expect(resolveNormalCommand("ctrl+v", undefined, keymap)).toEqual({
      type: "command",
      command: "visualBlock",
    });
    expect(resolveNormalCommand("ctrl+r", undefined, keymap)).toEqual({
      type: "command",
      command: "redo",
    });
  });

  test("resolves configured shift operator bindings as line-only", () => {
    const keymap = {
      ...DEFAULT_VIM_KEYMAP,
      operators: { ...DEFAULT_VIM_KEYMAP.operators, indent: ["]"], dedent: ["["] },
    };

    expect(resolveNormalCommand("]", undefined, keymap)).toEqual({ type: "pending", pending: "]" });
    expect(resolveNormalCommand("]", "]", keymap)).toEqual({
      type: "lineCommand",
      operator: "indent",
    });
    expect(resolveNormalCommand("[", "[", keymap)).toEqual({
      type: "lineCommand",
      operator: "dedent",
    });
    expect(resolveNormalCommand("w", "]", keymap)).toEqual({ type: "invalid" });
  });

  test("resolves finite multi-key sequences and invalid pending prefixes", () => {
    expect(resolveNormalCommand("g", undefined, DEFAULT_VIM_KEYMAP)).toEqual({
      type: "pending",
      pending: "g",
    });
    expect(resolveNormalCommand("g", "g", DEFAULT_VIM_KEYMAP)).toEqual({
      type: "motion",
      motion: "bufferStart",
    });
    expect(resolveNormalCommand("e", "g", DEFAULT_VIM_KEYMAP)).toEqual({
      type: "motion",
      motion: "wordPreviousEnd",
    });
    expect(resolveNormalCommand("E", "g", DEFAULT_VIM_KEYMAP)).toEqual({
      type: "motion",
      motion: "wordPreviousEndBig",
    });
    expect(resolveNormalCommand("x", "g", DEFAULT_VIM_KEYMAP)).toEqual({ type: "invalid" });
  });

  test("resolves multi-key operators and operator motions", () => {
    const keymap = {
      ...DEFAULT_VIM_KEYMAP,
      operators: { ...DEFAULT_VIM_KEYMAP.operators, delete: ["qq"] },
      motions: { ...DEFAULT_VIM_KEYMAP.motions, wordForward: ["ef"] },
    };

    const pendingOperatorPrefix = resolveNormalCommand("q", undefined, keymap);
    expect(pendingOperatorPrefix).toEqual({ type: "pending", pending: "q" });
    const pendingOperator = resolveNormalCommand("q", "q", keymap);
    expect(pendingOperator).toEqual({ type: "pending", pending: "qq" });

    const pendingMotion = resolveNormalCommand("e", "qq", keymap);
    expect(pendingMotion.type).toBe("pending");
    expect(
      resolveNormalCommand(
        "f",
        pendingMotion.type === "pending" ? pendingMotion.pending : "",
        keymap,
      ),
    ).toEqual({
      type: "operatorMotion",
      operator: "delete",
      motion: "wordForward",
    });

    const pendingRepeat = resolveNormalCommand("q", "qq", keymap);
    expect(pendingRepeat.type).toBe("pending");
    expect(
      resolveNormalCommand(
        "q",
        pendingRepeat.type === "pending" ? pendingRepeat.pending : "",
        keymap,
      ),
    ).toEqual({
      type: "lineCommand",
      operator: "delete",
    });
  });

  test("resolves counts for motions, line commands, and operator motions", () => {
    const count = resolveNormalCommand("3", undefined);
    expect(count.type).toBe("pending");
    const pending = count.type === "pending" ? count.pending : "";
    expect(resolveNormalCommand("w", pending)).toEqual({
      type: "motion",
      motion: "wordForward",
      count: 3,
    });

    const countToggle = resolveNormalCommand("3", undefined);
    expect(
      resolveNormalCommand("~", countToggle.type === "pending" ? countToggle.pending : ""),
    ).toEqual({
      type: "command",
      command: "toggleCase",
      count: 3,
    });

    const countDelete = resolveNormalCommand("2", undefined);
    const deletePending = resolveNormalCommand(
      "d",
      countDelete.type === "pending" ? countDelete.pending : "",
    );
    expect(deletePending.type).toBe("pending");
    expect(
      resolveNormalCommand("d", deletePending.type === "pending" ? deletePending.pending : ""),
    ).toEqual({ type: "lineCommand", operator: "delete", count: 2 });

    const countedOperator = resolveNormalCommand("4", undefined);
    const operatorPending = resolveNormalCommand(
      "d",
      countedOperator.type === "pending" ? countedOperator.pending : "",
    );
    expect(
      resolveNormalCommand("e", operatorPending.type === "pending" ? operatorPending.pending : ""),
    ).toEqual({ type: "operatorMotion", operator: "delete", motion: "wordEnd", count: 4 });

    const countedWord = resolveNormalCommand("2", undefined);
    expect(
      resolveNormalCommand("W", countedWord.type === "pending" ? countedWord.pending : ""),
    ).toEqual({ type: "motion", motion: "wordForwardBig", count: 2 });

    const countedPreviousEnd = resolveNormalCommand("2", undefined);
    const previousPrefix = resolveNormalCommand(
      "g",
      countedPreviousEnd.type === "pending" ? countedPreviousEnd.pending : "",
    );
    expect(
      resolveNormalCommand("e", previousPrefix.type === "pending" ? previousPrefix.pending : ""),
    ).toEqual({ type: "motion", motion: "wordPreviousEnd", count: 2 });

    const countedOperatorPreviousEnd = resolveNormalCommand("2", undefined);
    const operatorPreviousPending = resolveNormalCommand(
      "d",
      countedOperatorPreviousEnd.type === "pending" ? countedOperatorPreviousEnd.pending : "",
    );
    const operatorPreviousPrefix = resolveNormalCommand(
      "g",
      operatorPreviousPending.type === "pending" ? operatorPreviousPending.pending : "",
    );
    expect(
      resolveNormalCommand(
        "e",
        operatorPreviousPrefix.type === "pending" ? operatorPreviousPrefix.pending : "",
      ),
    ).toEqual({
      type: "operatorMotion",
      operator: "delete",
      motion: "wordPreviousEnd",
      count: 2,
    });
  });

  test("resolves prompt search commands and undo redo", () => {
    expect(resolveNormalCommand("u", undefined)).toEqual({ type: "command", command: "undo" });
    expect(resolveNormalCommand("ctrl+r", undefined)).toEqual({ type: "command", command: "redo" });
    expect(resolveNormalCommand(":", undefined)).toEqual({
      type: "command",
      command: "startExCommand",
    });
    expect(resolveNormalCommand("/", undefined)).toEqual({
      type: "command",
      command: "startSearch",
    });
    expect(resolveNormalCommand("?", undefined)).toEqual({
      type: "command",
      command: "startSearchBackward",
    });
    expect(resolveNormalCommand("n", undefined)).toEqual({
      type: "command",
      command: "repeatSearch",
    });
    expect(resolveNormalCommand("N", undefined)).toEqual({
      type: "command",
      command: "repeatSearchReverse",
    });
    expect(resolveNormalCommand("/", "d")).toEqual({
      type: "operatorSearch",
      operator: "delete",
      direction: "forward",
      count: undefined,
    });
    expect(resolveNormalCommand("?", "d")).toEqual({
      type: "operatorSearch",
      operator: "delete",
      direction: "backward",
      count: undefined,
    });
  });

  test("resolves operator character search targets", () => {
    const deletePending = resolveNormalCommand("d", undefined);
    const findPending = resolveNormalCommand(
      "f",
      deletePending.type === "pending" ? deletePending.pending : "",
    );
    expect(findPending.type).toBe("pending");
    expect(
      resolveNormalCommand("x", findPending.type === "pending" ? findPending.pending : ""),
    ).toEqual({
      type: "operatorCharSearch",
      operator: "delete",
      command: "findCharForward",
      char: "x",
    });

    const tillPending = resolveNormalCommand("t", "d");
    expect(tillPending.type).toBe("pending");
    expect(
      resolveNormalCommand(",", tillPending.type === "pending" ? tillPending.pending : ""),
    ).toEqual({
      type: "operatorCharSearch",
      operator: "delete",
      command: "tillCharForward",
      char: ",",
    });

    const changeTill = resolveNormalCommand("t", "c");
    expect(changeTill.type).toBe("pending");
    expect(
      resolveNormalCommand(",", changeTill.type === "pending" ? changeTill.pending : ""),
    ).toEqual({
      type: "operatorCharSearch",
      operator: "change",
      command: "tillCharForward",
      char: ",",
    });

    const changeBackward = resolveNormalCommand("F", "c");
    expect(changeBackward.type).toBe("pending");
    expect(
      resolveNormalCommand(":", changeBackward.type === "pending" ? changeBackward.pending : ""),
    ).toEqual({
      type: "operatorCharSearch",
      operator: "change",
      command: "findCharBackward",
      char: ":",
    });

    const yankTillBackward = resolveNormalCommand("T", "y");
    expect(yankTillBackward.type).toBe("pending");
    expect(
      resolveNormalCommand(
        "[",
        yankTillBackward.type === "pending" ? yankTillBackward.pending : "",
      ),
    ).toEqual({
      type: "operatorCharSearch",
      operator: "yank",
      command: "tillCharBackward",
      char: "[",
    });
  });

  test("resolves counted and configured operator character search targets", () => {
    const countedAfter = resolveNormalCommand("2", "d");
    expect(countedAfter.type).toBe("pending");
    const countedFind = resolveNormalCommand(
      "f",
      countedAfter.type === "pending" ? countedAfter.pending : "",
    );
    expect(countedFind.type).toBe("pending");
    expect(
      resolveNormalCommand(",", countedFind.type === "pending" ? countedFind.pending : ""),
    ).toEqual({
      type: "operatorCharSearch",
      operator: "delete",
      command: "findCharForward",
      char: ",",
      count: 2,
    });

    const countBefore = resolveNormalCommand("2", undefined);
    const deletePending = resolveNormalCommand(
      "d",
      countBefore.type === "pending" ? countBefore.pending : "",
    );
    const targetCount = resolveNormalCommand(
      "3",
      deletePending.type === "pending" ? deletePending.pending : "",
    );
    const findPending = resolveNormalCommand(
      "f",
      targetCount.type === "pending" ? targetCount.pending : "",
    );
    expect(
      resolveNormalCommand(",", findPending.type === "pending" ? findPending.pending : ""),
    ).toEqual({
      type: "operatorCharSearch",
      operator: "delete",
      command: "findCharForward",
      char: ",",
      count: 6,
    });

    const keymap = {
      ...DEFAULT_VIM_KEYMAP,
      operators: { ...DEFAULT_VIM_KEYMAP.operators, change: ["qq"] },
      commands: { ...DEFAULT_VIM_KEYMAP.commands, tillCharForward: ["gf"] },
    };
    const qPrefix = resolveNormalCommand("q", undefined, keymap);
    const change = resolveNormalCommand(
      "q",
      qPrefix.type === "pending" ? qPrefix.pending : "",
      keymap,
    );
    const gPrefix = resolveNormalCommand(
      "g",
      change.type === "pending" ? change.pending : "",
      keymap,
    );
    expect(gPrefix.type).toBe("pending");
    const till = resolveNormalCommand(
      "f",
      gPrefix.type === "pending" ? gPrefix.pending : "",
      keymap,
    );
    expect(till.type).toBe("pending");
    expect(resolveNormalCommand(":", till.type === "pending" ? till.pending : "", keymap)).toEqual({
      type: "operatorCharSearch",
      operator: "change",
      command: "tillCharForward",
      char: ":",
    });

    expect(resolveNormalCommand("x", "d")).toEqual({ type: "invalid" });
  });

  test("resolves operator character search repeats", () => {
    expect(resolveNormalCommand(";", "d")).toEqual({
      type: "operatorCharSearchRepeat",
      operator: "delete",
      reverse: false,
    });
    expect(resolveNormalCommand(",", "c")).toEqual({
      type: "operatorCharSearchRepeat",
      operator: "change",
      reverse: true,
    });

    const counted = resolveNormalCommand("2", "y");
    expect(counted.type).toBe("pending");
    expect(resolveNormalCommand(";", counted.type === "pending" ? counted.pending : "")).toEqual({
      type: "operatorCharSearchRepeat",
      operator: "yank",
      reverse: false,
      count: 2,
    });

    const keymap = {
      ...DEFAULT_VIM_KEYMAP,
      commands: { ...DEFAULT_VIM_KEYMAP.commands, repeatCharSearch: ["rr"] },
    };
    const prefix = resolveNormalCommand("r", "d", keymap);
    expect(prefix.type).toBe("pending");
    expect(
      resolveNormalCommand("r", prefix.type === "pending" ? prefix.pending : "", keymap),
    ).toEqual({
      type: "operatorCharSearchRepeat",
      operator: "delete",
      reverse: false,
    });
  });

  test("resolves char commands and operator text objects", () => {
    const replacePending = resolveNormalCommand("r", undefined);
    expect(replacePending.type).toBe("pending");
    expect(
      resolveNormalCommand("x", replacePending.type === "pending" ? replacePending.pending : ""),
    ).toEqual({ type: "charCommand", command: "replaceChar", char: "x" });

    const findPending = resolveNormalCommand("f", undefined);
    expect(findPending.type).toBe("pending");
    expect(
      resolveNormalCommand(":", findPending.type === "pending" ? findPending.pending : ""),
    ).toEqual({ type: "charCommand", command: "findCharForward", char: ":" });

    for (const key of ["up", "backspace", "ctrl+c"]) {
      expect(
        resolveNormalCommand(key, replacePending.type === "pending" ? replacePending.pending : ""),
      ).toEqual({
        type: "invalid",
      });
      expect(
        resolveNormalCommand(key, findPending.type === "pending" ? findPending.pending : ""),
      ).toEqual({
        type: "invalid",
      });
    }

    const change = resolveNormalCommand("c", undefined);
    const inner = resolveNormalCommand("i", change.type === "pending" ? change.pending : "");
    expect(inner.type).toBe("pending");
    expect(resolveNormalCommand("w", inner.type === "pending" ? inner.pending : "")).toEqual({
      type: "operatorTextObject",
      operator: "change",
      textObject: { kind: "inner", target: "word" },
    });
  });

  test("resolves configured text object kind and target keys", () => {
    const keymap = {
      ...DEFAULT_VIM_KEYMAP,
      textObjects: {
        kinds: { ...DEFAULT_VIM_KEYMAP.textObjects.kinds, inner: ["I"] },
        targets: { ...DEFAULT_VIM_KEYMAP.textObjects.targets, codeFence: ["F"] },
      },
    };
    const change = resolveNormalCommand("c", undefined, keymap);
    const inner = resolveNormalCommand(
      "I",
      change.type === "pending" ? change.pending : "",
      keymap,
    );
    expect(inner.type).toBe("pending");
    expect(
      resolveNormalCommand("F", inner.type === "pending" ? inner.pending : "", keymap),
    ).toEqual({
      type: "operatorTextObject",
      operator: "change",
      textObject: { kind: "inner", target: "codeFence" },
    });
  });

  test("keeps operator motions distinct from text object targets", () => {
    const deletePending = resolveNormalCommand("d", undefined);
    expect(
      resolveNormalCommand("w", deletePending.type === "pending" ? deletePending.pending : ""),
    ).toEqual({ type: "operatorMotion", operator: "delete", motion: "wordForward" });
  });
});
