import { describe, expect, test } from "bun:test";

import type { ResolvedVimKeymap } from "../src/types.ts";

import { DEFAULT_VIM_KEYMAP } from "../src/config.ts";
import { grammarBindingsForKeymap, grammarConflictForActionKey } from "../src/keymap-grammar.ts";

function makeKeymap(
  overrides: Partial<{
    operators: Partial<ResolvedVimKeymap["operators"]>;
    motions: Partial<ResolvedVimKeymap["motions"]>;
    commands: Partial<ResolvedVimKeymap["commands"]>;
    macros: Partial<ResolvedVimKeymap["macros"]>;
    marks: Partial<ResolvedVimKeymap["marks"]>;
    textObjects: Partial<ResolvedVimKeymap["textObjects"]>;
  }>,
): ResolvedVimKeymap {
  return {
    ...DEFAULT_VIM_KEYMAP,
    operators: { ...DEFAULT_VIM_KEYMAP.operators, ...overrides.operators },
    motions: { ...DEFAULT_VIM_KEYMAP.motions, ...overrides.motions },
    commands: { ...DEFAULT_VIM_KEYMAP.commands, ...overrides.commands },
    macros: { ...DEFAULT_VIM_KEYMAP.macros, ...overrides.macros },
    marks: { ...DEFAULT_VIM_KEYMAP.marks, ...overrides.marks },
    textObjects: {
      kinds: { ...DEFAULT_VIM_KEYMAP.textObjects.kinds, ...overrides.textObjects?.kinds },
      targets: { ...DEFAULT_VIM_KEYMAP.textObjects.targets, ...overrides.textObjects?.targets },
    },
  };
}

describe("keymap grammar helpers", () => {
  test("enumeration covers operators, motions, commands, macros, marks, and text objects", () => {
    const bindings = grammarBindingsForKeymap(DEFAULT_VIM_KEYMAP);
    expect(bindings.length).toBeGreaterThan(0);
    const labels = new Set(bindings.map((b) => b.label.split(".")[0]));
    expect(labels.has("operators")).toBe(true);
    expect(labels.has("motions")).toBe(true);
    expect(labels.has("commands")).toBe(true);
    expect(labels.has("macros")).toBe(true);
    expect(labels.has("marks")).toBe(true);
    expect(labels.has("textObjects")).toBe(true);
  });

  test("exact conflict is detected", () => {
    const keymap = makeKeymap({
      operators: { delete: ["d"] },
      motions: { down: ["d"] },
    });
    const bindings = grammarBindingsForKeymap(keymap);
    expect(grammarConflictForActionKey("d", bindings)).toContain("conflicts");
  });

  test("action key that is prefix of grammar binding is a prefix-shadow conflict", () => {
    const keymap = makeKeymap({
      operators: { delete: ["dd"] },
    });
    const bindings = grammarBindingsForKeymap(keymap);
    expect(grammarConflictForActionKey("d", bindings)).toContain("prefix-shadow");
  });

  test("grammar binding that is prefix of action key is a prefix-shadow conflict", () => {
    const keymap = makeKeymap({
      operators: { delete: ["d"] },
    });
    const bindings = grammarBindingsForKeymap(keymap);
    expect(grammarConflictForActionKey("dd", bindings)).toContain("prefix-shadow");
  });

  test("action key that prefixes executable bindings is a conflict", () => {
    // g is executable as an action key and would shadow gu/gU operator prefixes.
    const keymap = makeKeymap({
      operators: { lowercase: ["gu"], uppercase: ["gU"] },
    });
    const bindings = grammarBindingsForKeymap(keymap);
    expect(grammarConflictForActionKey("g", bindings)).toContain("prefix-shadow");
  });

  test("enumeration is idempotent and deterministic", () => {
    const a = grammarBindingsForKeymap(DEFAULT_VIM_KEYMAP);
    const b = grammarBindingsForKeymap(DEFAULT_VIM_KEYMAP);
    expect(a).toEqual(b);
  });

  test("action key with + sign is never prefix-checked against single-char grammar", () => {
    // key with + like "shift+x" is never prefix-checked against plain char grammar
    const keymap = makeKeymap({
      operators: { delete: ["d"] },
    });
    const bindings = grammarBindingsForKeymap(keymap);
    expect(grammarConflictForActionKey("shift+x", bindings)).toBeUndefined();
  });
});
