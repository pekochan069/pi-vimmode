import { describe, expect, test } from "bun:test";

import { DIAGNOSTIC_ACTIONS } from "../src/diagnostic-actions.ts";
import {
  PROMPT_TRANSFORM_ACTIONS,
  bindablePromptTransformActionIds,
  canonicalPromptTransformActionIdForShortName,
  legacyPromptTransformActionAliasForId,
  normalizePromptTransformActionArgs,
  promptTransformActionForId,
} from "../src/prompt-transform-actions.ts";

describe("prompt transform action registry", () => {
  test("exposes unique canonical bindable action IDs", () => {
    const ids = PROMPT_TRANSFORM_ACTIONS.map((action) => action.id);
    expect(ids).toEqual([
      "prompt.transform.quote",
      "prompt.transform.unquote",
      "prompt.transform.bulletize",
      "prompt.transform.fence",
      "prompt.transform.indent",
      "prompt.transform.dedent",
      "prompt.transform.reflow",
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(bindablePromptTransformActionIds()).toEqual(ids);
  });

  test("registry contains required metadata without dispatch functions", () => {
    for (const entry of PROMPT_TRANSFORM_ACTIONS) {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.category).toBe("prompt-transform");
      expect(entry.modes).toEqual(["normal", "visual", "visualLine", "visualBlock"]);
      expect(entry.targets).toEqual(["prompt-lines"]);
      expect(entry.countBehavior.length).toBeGreaterThan(0);
      expect(entry.visualBehavior.length).toBeGreaterThan(0);
      expect(entry.repeatability).toBe("not-dot-repeatable");
      expect(entry.docsAnchor).toStartWith("#");
      expect("dispatch" in entry).toBe(false);
    }
  });

  test("maps canonical IDs, short transform names, and legacy aliases", () => {
    expect(promptTransformActionForId("prompt.transform.reflow")).toBe("reflow");
    expect(canonicalPromptTransformActionIdForShortName("fence")).toBe("prompt.transform.fence");
    expect(legacyPromptTransformActionAliasForId("prompt.transform.quote")).toBe(
      "promptTransform.quote",
    );
    expect(promptTransformActionForId("vimmode.doctor")).toBeUndefined();
  });

  test("bindable action IDs exclude metadata-only diagnostics", () => {
    const bindableIds = bindablePromptTransformActionIds();
    for (const entry of DIAGNOSTIC_ACTIONS) {
      expect(bindableIds).not.toContain(entry.id);
      expect(promptTransformActionForId(entry.id)).toBeUndefined();
    }
  });
});

describe("prompt transform action arg validation", () => {
  test("accepts valid fence and reflow args from Ex and keymap input", () => {
    expect(
      normalizePromptTransformActionArgs({ source: "ex", action: "fence", rest: " ts" }),
    ).toEqual({
      ok: true,
      transform: { action: "fence", language: "ts" },
    });
    expect(
      normalizePromptTransformActionArgs({
        source: "keymap",
        actionId: "prompt.transform.fence",
        args: { language: "ts" },
      }),
    ).toEqual({ ok: true, transform: { action: "fence", language: "ts" } });
    expect(
      normalizePromptTransformActionArgs({ source: "ex", action: "reflow", rest: " 72" }),
    ).toEqual({
      ok: true,
      transform: { action: "reflow", width: 72 },
    });
    expect(
      normalizePromptTransformActionArgs({
        source: "keymap",
        actionId: "prompt.transform.reflow",
        args: { width: 72 },
      }),
    ).toEqual({ ok: true, transform: { action: "reflow", width: 72 } });
  });

  test("rejects invalid fence and reflow args consistently", () => {
    expect(
      normalizePromptTransformActionArgs({ source: "ex", action: "fence", rest: " ts js" }),
    ).toEqual({
      ok: false,
      message: "Invalid fence language",
    });
    expect(
      normalizePromptTransformActionArgs({
        source: "keymap",
        actionId: "prompt.transform.fence",
        args: { language: "ts js" },
      }),
    ).toEqual({ ok: false, message: "Invalid fence language" });
    expect(
      normalizePromptTransformActionArgs({ source: "ex", action: "reflow", rest: " wide" }),
    ).toEqual({
      ok: false,
      message: "Invalid reflow width",
    });
    expect(
      normalizePromptTransformActionArgs({
        source: "keymap",
        actionId: "prompt.transform.reflow",
        args: { width: 10 },
      }),
    ).toEqual({ ok: false, message: "Invalid reflow width" });
  });

  test("rejects unknown args and no-arg transform args", () => {
    expect(
      normalizePromptTransformActionArgs({
        source: "keymap",
        actionId: "prompt.transform.reflow",
        args: { columns: 72 },
      }),
    ).toEqual({ ok: false, message: "Unknown action arg: columns" });
    expect(
      normalizePromptTransformActionArgs({ source: "ex", action: "quote", rest: " x" }),
    ).toEqual({
      ok: false,
      message: "Unexpected Ex command arguments",
    });
    expect(
      normalizePromptTransformActionArgs({
        source: "keymap",
        actionId: "prompt.transform.quote",
        args: { width: 72 },
      }),
    ).toEqual({ ok: false, message: "Unexpected action args" });
  });
});
