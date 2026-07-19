import { describe, expect, test } from "bun:test";

import {
  deriveActionKeys,
  deriveDefaultKeyBindings,
  deriveLegacyActionToKey,
  deriveLegacyKeyToAction,
  deriveSet,
  KEYMAP_COMMAND_DESCRIPTORS,
  KEYMAP_MARK_DESCRIPTORS,
  KEYMAP_MACRO_DESCRIPTORS,
  KEYMAP_MOTION_DESCRIPTORS,
  KEYMAP_OPERATOR_DESCRIPTORS,
  KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS,
  KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS,
} from "../src/keymap-descriptors.ts";

const actionNames = (values: readonly unknown[]): string[] => values.map(String);

const expectedOperators = [
  "delete",
  "change",
  "yank",
  "lowercase",
  "uppercase",
  "toggleCase",
  "indent",
  "dedent",
];
const expectedMotionOperators = [
  "delete",
  "change",
  "yank",
  "lowercase",
  "uppercase",
  "toggleCase",
];
const expectedMotions = [
  "left",
  "down",
  "up",
  "right",
  "wordForward",
  "wordBackward",
  "wordEnd",
  "wordForwardBig",
  "wordBackwardBig",
  "wordEndBig",
  "wordPreviousEnd",
  "wordPreviousEndBig",
  "lineStart",
  "lineEnd",
  "firstNonBlank",
  "bufferStart",
  "bufferEnd",
  "matchingPair",
  "halfPageDown",
  "halfPageUp",
  "paragraphBackward",
  "paragraphForward",
];
const expectedCommands = [
  "insertBefore",
  "insertAfter",
  "insertLineStart",
  "insertLineEnd",
  "openLineBelow",
  "openLineAbove",
  "visualChar",
  "visualLine",
  "visualBlock",
  "deleteChar",
  "deleteCharBefore",
  "deleteToLineEnd",
  "changeToLineEnd",
  "yankLine",
  "joinLine",
  "pasteAfter",
  "pasteBefore",
  "incrementNumber",
  "decrementNumber",
  "toggleCase",
  "replaceChar",
  "substituteChar",
  "substituteLine",
  "findCharForward",
  "findCharBackward",
  "tillCharForward",
  "tillCharBackward",
  "repeatCharSearch",
  "repeatCharSearchReverse",
  "startSearch",
  "startSearchBackward",
  "repeatSearch",
  "repeatSearchReverse",
  "searchWordForward",
  "searchWordBackward",
  "startExCommand",
  "repeatChange",
  "undo",
  "redo",
  "showKeybindings",
  "reselectVisual",
  "easymotion",
];
const expectedTextObjectTargets = [
  "word",
  "singleQuote",
  "doubleQuote",
  "paren",
  "bracket",
  "brace",
  "paragraph",
  "codeFence",
  "headingSection",
  "listItem",
  "tag",
  "errorBlock",
];

describe("keymap descriptors", () => {
  test("preserve semantic action order for config and diagnostics", () => {
    expect(actionNames(deriveActionKeys(KEYMAP_OPERATOR_DESCRIPTORS))).toEqual(expectedOperators);
    expect(
      actionNames(
        deriveActionKeys(KEYMAP_OPERATOR_DESCRIPTORS).filter(
          (action) =>
            "motionOperator" in KEYMAP_OPERATOR_DESCRIPTORS[action] &&
            Boolean(KEYMAP_OPERATOR_DESCRIPTORS[action].motionOperator),
        ),
      ),
    ).toEqual(expectedMotionOperators);
    expect(actionNames(deriveActionKeys(KEYMAP_MOTION_DESCRIPTORS))).toEqual(expectedMotions);
    expect(actionNames(deriveActionKeys(KEYMAP_COMMAND_DESCRIPTORS))).toEqual(expectedCommands);
    expect(actionNames(deriveActionKeys(KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS))).toEqual([
      "inner",
      "around",
    ]);
    expect(actionNames(deriveActionKeys(KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS))).toEqual(
      expectedTextObjectTargets,
    );
  });

  test("derive default binding records without sharing descriptor arrays", () => {
    const motions = deriveDefaultKeyBindings(KEYMAP_MOTION_DESCRIPTORS);
    expect(motions.wordForward).toEqual(["w"]);
    expect(motions.firstNonBlank).toEqual(["^", "_"]);
    expect(motions.bufferStart).toEqual(["gg"]);
    expect(motions.halfPageDown).toEqual(["ctrl+d"]);
    expect(motions.halfPageUp).toEqual(["ctrl+u"]);
    expect(motions.paragraphBackward).toEqual(["{"]);
    expect(motions.paragraphForward).toEqual(["}"]);

    const targets = deriveDefaultKeyBindings(KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS);
    expect(targets.paragraph).toEqual(["p"]);

    motions.wordForward.push("custom");
    expect(KEYMAP_MOTION_DESCRIPTORS.wordForward.defaults).toEqual(["w"]);
  });

  test("derive validation sets and legacy maps from descriptors", () => {
    expect(deriveSet(KEYMAP_COMMAND_DESCRIPTORS).has("redo")).toBe(true);
    expect(deriveSet(KEYMAP_COMMAND_DESCRIPTORS).has("missing")).toBe(false);

    expect(deriveLegacyKeyToAction(KEYMAP_OPERATOR_DESCRIPTORS)).toEqual({
      d: "delete",
      c: "change",
      y: "yank",
    });
    expect(deriveLegacyActionToKey(KEYMAP_OPERATOR_DESCRIPTORS)).toEqual({
      delete: "d",
      change: "c",
      yank: "y",
    });
    expect(deriveLegacyKeyToAction(KEYMAP_MOTION_DESCRIPTORS)).toMatchObject({
      h: "left",
      ge: "wordPreviousEnd",
      "%": "matchingPair",
    });
    expect(deriveLegacyActionToKey(KEYMAP_MOTION_DESCRIPTORS)).toMatchObject({
      left: "h",
      wordPreviousEnd: "ge",
      firstNonBlank: "^",
    });
  });

  test("macro and mark descriptors derive default prefixes", () => {
    expect(deriveDefaultKeyBindings(KEYMAP_MACRO_DESCRIPTORS)).toEqual({
      record: ["q"],
      play: ["@"],
    });
    expect(deriveDefaultKeyBindings(KEYMAP_MARK_DESCRIPTORS)).toEqual({
      set: ["m"],
      jumpExact: ["`"],
      jumpLine: ["'"],
    });
  });

  test("word search commands default to star and hash", () => {
    const commands = deriveDefaultKeyBindings(KEYMAP_COMMAND_DESCRIPTORS);
    expect(commands.deleteCharBefore).toEqual(["X"]);
    expect(commands.searchWordForward).toEqual(["*"]);
    expect(commands.searchWordBackward).toEqual(["#"]);
  });
});
