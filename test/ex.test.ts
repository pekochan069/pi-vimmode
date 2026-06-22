import { describe, expect, test } from "bun:test";

import { parseExCommand, parseExSubstitution } from "../src/ex.ts";

const context = {
  lineCount: 5,
  cursorLine: 1,
};

describe("Ex substitution parser", () => {
  test("accepts empty commands without execution", () => {
    expect(parseExSubstitution("", context)).toEqual({ type: "empty" });
    expect(parseExSubstitution("   ", context)).toEqual({ type: "empty" });
  });

  test("accepts exact s and substitute command names", () => {
    expect(parseExSubstitution("s/old/new/", context)).toMatchObject({
      type: "substitute",
      command: "s",
      range: { startLine: 1, endLine: 1 },
      pattern: "old",
      replacement: "new",
      global: false,
      ignoreCase: false,
    });
    expect(parseExSubstitution("%substitute/old/new/g", context)).toMatchObject({
      type: "substitute",
      command: "substitute",
      range: { startLine: 0, endLine: 4 },
      global: true,
    });
  });

  test("parses regex substitution flag with literal replacement", () => {
    expect(parseExSubstitution("%s/TODO|FIXME/done/gr", context)).toMatchObject({
      type: "substitute",
      pattern: "TODO|FIXME",
      replacement: "done",
      global: true,
      ignoreCase: false,
      matcherMode: "regex",
    });
    expect(parseExSubstitution("s/todo/done/ri", context)).toMatchObject({
      type: "substitute",
      global: false,
      ignoreCase: true,
      matcherMode: "regex",
    });
    expect(parseExSubstitution("s/(old)/&-$1-\\1/r", context)).toMatchObject({
      type: "substitute",
      replacement: "&-$1-\\1",
      matcherMode: "regex",
    });
  });

  test("parses safe substitution flags", () => {
    expect(parseExSubstitution("%s/old/new/gn", context)).toMatchObject({
      type: "substitute",
      global: true,
      countOnly: true,
      noError: false,
    });
    expect(parseExSubstitution("s/todo/done/rie", context)).toMatchObject({
      type: "substitute",
      matcherMode: "regex",
      ignoreCase: true,
      noError: true,
      countOnly: false,
    });
  });

  test("rejects unsupported names and uppercase flags", () => {
    expect(parseExSubstitution("sub/old/new/", context)).toEqual({
      type: "error",
      message: "Unsupported Ex command: sub",
    });
    expect(parseExSubstitution("s/old/new/G", context)).toEqual({
      type: "error",
      message: "Unsupported substitution flag: G",
    });
  });

  test("trims command-line whitespace", () => {
    expect(parseExSubstitution("  %s/old/new/i  ", context)).toMatchObject({
      type: "substitute",
      range: { startLine: 0, endLine: 4 },
      ignoreCase: true,
    });
  });

  test("parses supported ranges", () => {
    expect(parseExSubstitution("3s/a/b/", context)).toMatchObject({
      type: "substitute",
      range: { startLine: 2, endLine: 2 },
    });
    expect(parseExSubstitution(".,$s/a/b/", context)).toMatchObject({
      type: "substitute",
      range: { startLine: 1, endLine: 4 },
    });
    expect(parseExSubstitution("2,4s/a/b/", context)).toMatchObject({
      type: "substitute",
      range: { startLine: 1, endLine: 3 },
    });
  });

  test("uses captured visual range marker only when available", () => {
    expect(
      parseExSubstitution("'<,'>s/a/b/", {
        ...context,
        visualRange: { startLine: 2, endLine: 4 },
      }),
    ).toMatchObject({ type: "substitute", range: { startLine: 2, endLine: 4 } });
    expect(parseExSubstitution("'<,'>s/a/b/", context)).toEqual({
      type: "error",
      message: "Visual range marker requires captured visual range",
    });
  });

  test("rejects invalid ranges", () => {
    expect(parseExSubstitution("999s/a/b/", context)).toEqual({
      type: "error",
      message: "Invalid Ex range",
    });
    expect(parseExSubstitution("5,3s/a/b/", context)).toEqual({
      type: "error",
      message: "Invalid Ex range",
    });
  });

  test("parses delimiters, escapes, empty replacement, and omitted final delimiter", () => {
    expect(parseExSubstitution("%s#old\\#value#new\\\\value#g", context)).toMatchObject({
      type: "substitute",
      pattern: "old#value",
      replacement: "new\\value",
      global: true,
    });
    expect(parseExSubstitution("%s/old//g", context)).toMatchObject({
      type: "substitute",
      replacement: "",
    });
    expect(parseExSubstitution("s/old/new", context)).toMatchObject({
      type: "substitute",
      replacement: "new",
      global: false,
      ignoreCase: false,
    });
    expect(parseExSubstitution("s/old/newg", context)).toMatchObject({
      type: "substitute",
      replacement: "newg",
      global: false,
    });
  });

  test("rejects invalid delimiter and empty pattern", () => {
    expect(parseExSubstitution("s old new ", context)).toEqual({
      type: "error",
      message: "Invalid substitution delimiter",
    });
    expect(parseExSubstitution("s//new/g", context)).toEqual({
      type: "error",
      message: "Substitution pattern cannot be empty",
    });
  });
});

describe("Ex command parser", () => {
  test("parses finite non-substitution command aliases", () => {
    expect(parseExCommand("2,4delete", context)).toMatchObject({
      type: "delete",
      command: "delete",
      range: { startLine: 1, endLine: 3 },
      rangeExplicit: true,
    });
    expect(parseExCommand("%y", context)).toMatchObject({
      type: "yank",
      command: "y",
      range: { startLine: 0, endLine: 4 },
    });
    expect(parseExCommand("put", context)).toMatchObject({
      type: "put",
      command: "put",
      range: { startLine: 1, endLine: 1 },
      rangeExplicit: false,
    });
    expect(parseExCommand("join", context)).toMatchObject({ type: "join", command: "join" });
    expect(parseExCommand("noh", context)).toEqual({ type: "nohlsearch", command: "noh" });
  });

  test("parses repeat substitution aliases", () => {
    expect(parseExCommand("&", context)).toMatchObject({
      type: "repeatSubstitute",
      command: "&",
      range: { startLine: 1, endLine: 1 },
      rangeExplicit: false,
    });
    expect(parseExCommand("&&", context)).toMatchObject({
      type: "repeatSubstitute",
      command: "&&",
      range: { startLine: 1, endLine: 1 },
    });
    expect(parseExCommand("%&", context)).toMatchObject({
      type: "repeatSubstitute",
      command: "&",
      range: { startLine: 0, endLine: 4 },
      rangeExplicit: true,
    });
  });

  test("parses Ex register operands for line commands", () => {
    expect(parseExCommand("delete a", context)).toMatchObject({
      type: "delete",
      register: { kind: "named", slot: "a", append: false },
    });
    expect(parseExCommand("%yank A", context)).toMatchObject({
      type: "yank",
      register: { kind: "named", slot: "a", append: true },
    });
    expect(parseExCommand("put A", context)).toMatchObject({
      type: "put",
      register: { kind: "named", slot: "a", append: true },
    });
    expect(parseExCommand('delete "', context)).toMatchObject({
      type: "delete",
      register: { kind: "unnamed" },
    });
    expect(parseExCommand("%yank +", context)).toMatchObject({
      type: "yank",
      register: { kind: "clipboard", slot: "+" },
    });
    expect(parseExCommand("put *", context)).toMatchObject({
      type: "put",
      register: { kind: "clipboard", slot: "*" },
    });
    expect(parseExCommand("delete _", context)).toMatchObject({
      type: "delete",
      register: { kind: "blackHole" },
    });
    expect(parseExCommand('yank "+', context)).toEqual({
      type: "error",
      message: "Invalid Ex register operand",
    });
  });

  test("parses copy and move destination addresses", () => {
    expect(parseExCommand("2,3copy$", context)).toMatchObject({
      type: "copy",
      range: { startLine: 1, endLine: 2 },
      destination: 4,
    });
    expect(parseExCommand("2t0", context)).toMatchObject({
      type: "copy",
      range: { startLine: 1, endLine: 1 },
      destination: -1,
    });
    expect(parseExCommand("3,4m.", context)).toMatchObject({
      type: "move",
      range: { startLine: 2, endLine: 3 },
      destination: 1,
    });
  });

  test("parses offset and semicolon Ex ranges", () => {
    expect(parseExCommand(".,.+1delete", context)).toMatchObject({
      type: "delete",
      range: { startLine: 1, endLine: 2 },
    });
    expect(parseExCommand("$-1,$join", context)).toMatchObject({
      type: "join",
      range: { startLine: 3, endLine: 4 },
    });
    expect(parseExCommand("3+1yank", context)).toMatchObject({
      type: "yank",
      range: { startLine: 3, endLine: 3 },
    });
    expect(parseExCommand("2;.+2delete", context)).toMatchObject({
      type: "delete",
      range: { startLine: 1, endLine: 3 },
    });
    expect(parseExSubstitution("2;.+1s/foo/bar/g", context)).toMatchObject({
      type: "substitute",
      range: { startLine: 1, endLine: 2 },
    });
  });

  test("parses offset copy and move destinations", () => {
    expect(parseExCommand("2copy$-1", context)).toMatchObject({
      type: "copy",
      range: { startLine: 1, endLine: 1 },
      destination: 3,
    });
    expect(parseExCommand("4move.+1", context)).toMatchObject({
      type: "move",
      range: { startLine: 3, endLine: 3 },
      destination: 2,
    });
  });

  test("parses prompt transform commands with ranges and arguments", () => {
    expect(parseExCommand("quote", context)).toMatchObject({
      type: "transform",
      command: "quote",
      range: { startLine: 1, endLine: 1 },
      transform: { action: "quote" },
    });
    expect(parseExCommand("2,4bulletize", context)).toMatchObject({
      type: "transform",
      command: "bulletize",
      range: { startLine: 1, endLine: 3 },
      rangeExplicit: true,
      transform: { action: "bulletize" },
    });
    expect(
      parseExCommand("'<,'>fence ts", { ...context, visualRange: { startLine: 2, endLine: 4 } }),
    ).toMatchObject({
      type: "transform",
      command: "fence",
      range: { startLine: 2, endLine: 4 },
      transform: { action: "fence", language: "ts" },
    });
    expect(parseExCommand("reflow 72", context)).toMatchObject({
      type: "transform",
      transform: { action: "reflow", width: 72 },
    });
  });

  test("parses dedicated keybindings popup command", () => {
    expect(parseExCommand("keybindings", context)).toEqual({
      type: "keybindings",
      command: "keybindings",
    });
    expect(parseExCommand("keybindings redo", context)).toEqual({
      type: "keybindings",
      command: "keybindings",
      query: "redo",
    });
    expect(parseExCommand("keybindings ctrl+p", context)).toEqual({
      type: "keybindings",
      command: "keybindings",
      query: "ctrl+p",
    });
    for (const command of ["keybinding", "keys", "map", "nmap"]) {
      expect(parseExCommand(command, context)).toEqual({
        type: "error",
        message: `Unsupported Ex command: ${command}`,
      });
    }
  });

  test("parses read-only customization diagnostic commands", () => {
    expect(parseExCommand("vimdoctor", context)).toEqual({
      type: "diagnostic",
      command: "vimdoctor",
    });
    expect(parseExCommand("keymap redo", context)).toEqual({
      type: "diagnostic",
      command: "keymap",
      query: "redo",
    });
    expect(parseExCommand("mapcheck ctrl+p", context)).toEqual({
      type: "diagnostic",
      command: "mapcheck",
      query: "ctrl+p",
    });
    expect(parseExCommand("actions search", context)).toEqual({
      type: "diagnostic",
      command: "actions",
      query: "search",
    });
  });

  test("parses finite runtime help commands", () => {
    expect(parseExCommand("help", context)).toEqual({ type: "runtimeHelp", command: "help" });
    expect(parseExCommand("help search", context)).toEqual({
      type: "runtimeHelp",
      command: "help",
      query: "search",
    });
    expect(parseExCommand("features", context)).toEqual({
      type: "runtimeHelp",
      command: "features",
    });
    expect(parseExCommand("features redo", context)).toEqual({
      type: "runtimeHelp",
      command: "features",
      query: "redo",
    });
    expect(parseExCommand("messages", context)).toEqual({
      type: "runtimeHelp",
      command: "messages",
    });
    expect(parseExCommand("vimmode inspect", context)).toEqual({
      type: "inspect",
      command: "vimmode",
      query: "inspect",
    });
  });

  test("rejects unsupported diagnostic/runtime-help abbreviations and missing required arguments", () => {
    expect(parseExCommand("vimd", context)).toEqual({
      type: "error",
      message: "Unsupported Ex command: vimd",
    });
    expect(parseExCommand("map", context)).toEqual({
      type: "error",
      message: "Unsupported Ex command: map",
    });
    expect(parseExCommand("h", context)).toEqual({
      type: "error",
      message: "Unsupported Ex command: h",
    });
    expect(parseExCommand("feat", context)).toEqual({
      type: "error",
      message: "Unsupported Ex command: feat",
    });
    expect(parseExCommand("mes", context)).toEqual({
      type: "error",
      message: "Unsupported Ex command: mes",
    });
    expect(parseExCommand("mapcheck", context)).toEqual({
      type: "error",
      message: "Missing mapcheck key",
    });
    expect(parseExCommand("vimdoctor noisy", context)).toEqual({
      type: "error",
      message: "Unexpected Ex command arguments",
    });
    expect(parseExCommand("messages noisy", context)).toEqual({
      type: "error",
      message: "Unexpected Ex command arguments",
    });
    expect(parseExCommand("vimmode", context)).toEqual({
      type: "error",
      message: "Unexpected Ex command arguments",
    });
    expect(parseExCommand("vimmode status", context)).toEqual({
      type: "error",
      message: "Unexpected Ex command arguments",
    });
    expect(parseExCommand("vimmode inspect raw", context)).toEqual({
      type: "error",
      message: "Unexpected Ex command arguments",
    });
    expect(parseExCommand("messages clear", context)).toEqual({
      type: "error",
      message: "Unexpected Ex command arguments",
    });
  });

  test("honors configured prompt transform commands", () => {
    expect(
      parseExCommand("qte", {
        ...context,
        promptTransforms: {
          enabled: true,
          actions: {
            quote: true,
            unquote: true,
            bulletize: true,
            fence: true,
            indent: true,
            dedent: true,
            reflow: false,
          },
          commands: {
            quote: ["qte"],
            unquote: ["unquote"],
            bulletize: ["bulletize"],
            fence: ["wrap"],
            indent: ["indent"],
            dedent: ["dedent"],
            reflow: ["reflow"],
          },
        },
      }),
    ).toMatchObject({ type: "transform", transform: { action: "quote" } });
    expect(
      parseExCommand("reflow", {
        ...context,
        promptTransforms: {
          enabled: true,
          actions: {
            quote: true,
            unquote: true,
            bulletize: true,
            fence: true,
            indent: true,
            dedent: true,
            reflow: false,
          },
          commands: {
            quote: ["quote"],
            unquote: ["unquote"],
            bulletize: ["bulletize"],
            fence: ["fence"],
            indent: ["indent"],
            dedent: ["dedent"],
            reflow: ["reflow"],
          },
        },
      }),
    ).toEqual({ type: "error", message: "Unsupported Ex command: reflow" });
  });

  test("parses bare single-address line jumps", () => {
    expect(parseExCommand("3", context)).toMatchObject({
      type: "lineJump",
      line: 2,
      range: { startLine: 2, endLine: 2 },
    });
    expect(parseExCommand(".", context)).toMatchObject({
      type: "lineJump",
      line: 1,
      range: { startLine: 1, endLine: 1 },
    });
    expect(parseExCommand("$", context)).toMatchObject({
      type: "lineJump",
      line: 4,
      range: { startLine: 4, endLine: 4 },
    });
    expect(parseExCommand("2+1", context)).toMatchObject({
      type: "lineJump",
      line: 2,
      range: { startLine: 2, endLine: 2 },
    });
  });

  test("rejects commandless percent, comma, semicolon, and visual ranges", () => {
    expect(parseExCommand("%", context)).toEqual({
      type: "error",
      message: "Unsupported Ex command",
    });
    expect(parseExCommand("2,4", context)).toEqual({
      type: "error",
      message: "Unsupported Ex command",
    });
    expect(parseExCommand("2;.+1", context)).toEqual({
      type: "error",
      message: "Unsupported Ex command",
    });
    expect(
      parseExCommand("'<,'>", { ...context, visualRange: { startLine: 0, endLine: 2 } }),
    ).toEqual({
      type: "error",
      message: "Unsupported Ex command",
    });
  });

  test("rejects out-of-bounds bare single-address line jumps", () => {
    expect(parseExCommand("0", context)).toEqual({
      type: "error",
      message: "Invalid Ex range",
    });
    expect(parseExCommand("999", context)).toEqual({
      type: "error",
      message: "Invalid Ex range",
    });
    expect(parseExCommand("$+1", context)).toEqual({
      type: "error",
      message: "Invalid Ex range",
    });
  });

  test("rejects invalid Ex commands and arguments", () => {
    expect(parseExCommand("0delete", context)).toEqual({
      type: "error",
      message: "Invalid Ex range",
    });
    expect(parseExCommand("2copy", context)).toEqual({
      type: "error",
      message: "Missing Ex destination",
    });
    expect(parseExCommand("2copy999", context)).toEqual({
      type: "error",
      message: "Invalid Ex destination",
    });
    expect(parseExCommand("co$", context)).toEqual({
      type: "error",
      message: "Unsupported Ex command: co",
    });
    expect(parseExCommand("delete 1", context)).toEqual({
      type: "error",
      message: "Invalid Ex register operand",
    });
    expect(parseExCommand('yank "_', context)).toEqual({
      type: "error",
      message: "Invalid Ex register operand",
    });
    expect(parseExCommand("put ab", context)).toEqual({
      type: "error",
      message: "Invalid Ex register operand",
    });
    expect(parseExCommand('delete "a', context)).toEqual({
      type: "error",
      message: "Invalid Ex register operand",
    });
    expect(parseExCommand("join a", context)).toEqual({
      type: "error",
      message: "Unexpected Ex command arguments",
    });
    expect(parseExCommand("reflow wide", context)).toEqual({
      type: "error",
      message: "Invalid reflow width",
    });
    expect(parseExCommand("fence ts extra", context)).toEqual({
      type: "error",
      message: "Invalid fence language",
    });
    expect(parseExCommand("$+1yank", context)).toEqual({
      type: "error",
      message: "Invalid Ex range",
    });
    expect(parseExCommand(".+1-2delete", context)).toEqual({
      type: "error",
      message: "Invalid Ex range",
    });
    expect(parseExCommand("2;delete", context)).toEqual({
      type: "error",
      message: "Invalid Ex range",
    });
    expect(parseExCommand("2t0+1", context)).toEqual({
      type: "error",
      message: "Invalid Ex destination",
    });
  });
});
