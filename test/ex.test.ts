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
    expect(parseExCommand("delete a", context)).toEqual({
      type: "error",
      message: "Unexpected Ex command arguments",
    });
  });
});
