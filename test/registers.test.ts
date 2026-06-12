import { describe, expect, test } from "bun:test";

import {
  applyRegisterWrite,
  registerTargetForKey,
  registerToRead,
  writeRegisters,
} from "../src/modal/registers.ts";

describe("named and special register helpers", () => {
  test("lowercase target writes named register and unnamed register", () => {
    expect(registerTargetForKey("a")).toEqual({ kind: "named", slot: "a", append: false });

    const state = writeRegisters(
      { mode: "normal", pendingRegister: { kind: "named", slot: "a", append: false } },
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
    expect(registerTargetForKey("A")).toEqual({ kind: "named", slot: "a", append: true });

    const charState = writeRegisters(
      {
        mode: "normal",
        namedRegisters: { a: { type: "char", text: "old" } },
        pendingRegister: { kind: "named", slot: "a", append: true },
      },
      { type: "char", text: "new" },
    );
    expect(charState.namedRegisters?.a).toEqual({ type: "char", text: "oldnew" });
    expect(charState.register).toEqual({ type: "char", text: "new" });

    const lineState = writeRegisters(
      {
        mode: "normal",
        namedRegisters: { a: { type: "line", text: "one" } },
        pendingRegister: { kind: "named", slot: "a", append: true },
      },
      { type: "line", text: "two" },
    );
    expect(lineState.namedRegisters?.a).toEqual({ type: "line", text: "one\ntwo" });
    expect(
      registerToRead({
        ...lineState,
        pendingRegister: { kind: "named", slot: "a", append: true },
      }),
    ).toEqual({ type: "line", text: "one\ntwo" });
  });

  test("special targets parse finite supported subset", () => {
    expect(registerTargetForKey('"')).toEqual({ kind: "unnamed" });
    expect(registerTargetForKey("_")).toEqual({ kind: "blackHole" });
    expect(registerTargetForKey("+")).toEqual({ kind: "clipboard", slot: "+" });
    expect(registerTargetForKey("*")).toEqual({ kind: "clipboard", slot: "*" });
    for (const key of ["=", "1", "/", ".", ":", "%"]) {
      expect(registerTargetForKey(key)).toBeUndefined();
    }
  });

  test("explicit unnamed writes only unnamed register", () => {
    const state = writeRegisters(
      {
        mode: "normal",
        pendingRegister: { kind: "unnamed" },
        namedRegisters: { a: { type: "line", text: "keep" } },
      },
      { type: "char", text: "one" },
    );
    expect(state.register).toEqual({ type: "char", text: "one" });
    expect(state.namedRegisters?.a).toEqual({ type: "line", text: "keep" });
    expect(state.pendingRegister).toBeUndefined();
  });

  test("black-hole writes discard without clobbering registers", () => {
    const state = writeRegisters(
      {
        mode: "normal",
        pendingRegister: { kind: "blackHole" },
        register: { type: "char", text: "keep" },
        namedRegisters: { a: { type: "line", text: "named" } },
        clipboardRegisters: { "+": { type: "char", text: "clip" } },
      },
      { type: "line", text: "discard" },
    );
    expect(state.register).toEqual({ type: "char", text: "keep" });
    expect(state.namedRegisters?.a).toEqual({ type: "line", text: "named" });
    expect(state.clipboardRegisters?.["+"]).toEqual({ type: "char", text: "clip" });
    expect(state.pendingRegister).toBeUndefined();
    expect(registerToRead({ ...state, pendingRegister: { kind: "blackHole" } })).toBeUndefined();
  });

  test("clipboard writes update unnamed, mirror, and copy effect", () => {
    const result = applyRegisterWrite(
      { mode: "normal", pendingRegister: { kind: "clipboard", slot: "+" } },
      { type: "line", text: "clip" },
    );
    expect(result.state.register).toEqual({ type: "line", text: "clip" });
    expect(result.state.clipboardRegisters?.["+"]).toEqual({ type: "line", text: "clip" });
    expect(result.effects).toEqual([{ type: "copyClipboard", register: "+", text: "clip" }]);
    expect(
      registerToRead({ ...result.state, pendingRegister: { kind: "clipboard", slot: "+" } }),
    ).toEqual({
      type: "line",
      text: "clip",
    });
  });
});
