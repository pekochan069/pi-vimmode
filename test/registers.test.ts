import { describe, expect, test } from "bun:test";

import { registerTargetForKey, registerToRead, writeRegisters } from "../src/modal/registers.ts";

describe("named register helpers", () => {
  test("lowercase target writes named register and unnamed register", () => {
    expect(registerTargetForKey("a")).toEqual({ slot: "a", append: false });

    const state = writeRegisters(
      { mode: "normal", pendingRegister: { slot: "a", append: false } },
      { type: "line", text: "one" },
    );

    expect(state).toEqual({
      mode: "normal",
      register: { type: "line", text: "one" },
      namedRegisters: { a: { type: "line", text: "one" } },
      pendingRegister: undefined,
    });
  });

  test("uppercase target appends and reads lowercase register", () => {
    expect(registerTargetForKey("A")).toEqual({ slot: "a", append: true });
    expect(registerTargetForKey("1")).toBeUndefined();

    const charState = writeRegisters(
      {
        mode: "normal",
        namedRegisters: { a: { type: "char", text: "old" } },
        pendingRegister: { slot: "a", append: true },
      },
      { type: "char", text: "new" },
    );
    expect(charState.namedRegisters?.a).toEqual({ type: "char", text: "oldnew" });
    expect(charState.register).toEqual({ type: "char", text: "new" });

    const lineState = writeRegisters(
      {
        mode: "normal",
        namedRegisters: { a: { type: "line", text: "one" } },
        pendingRegister: { slot: "a", append: true },
      },
      { type: "line", text: "two" },
    );
    expect(lineState.namedRegisters?.a).toEqual({ type: "line", text: "one\ntwo" });
    expect(registerToRead({ ...lineState, pendingRegister: { slot: "a", append: true } })).toEqual({
      type: "line",
      text: "one\ntwo",
    });
  });
});
