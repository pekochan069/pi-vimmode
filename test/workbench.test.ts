import { describe, expect, test } from "bun:test";

import type { ExWorkbench, SearchWorkbench } from "../src/modal/workbench.ts";

import {
  appendWorkbenchText,
  backspaceWorkbenchText,
  navigateWorkbenchHistory,
  workbenchDisplayText,
} from "../src/modal/workbench.ts";

const searchEntry = (text = ""): SearchWorkbench => ({
  kind: "search",
  prefix: "/",
  text,
  direction: "forward",
});

const exEntry = (text = ""): ExWorkbench => ({
  kind: "ex",
  prefix: ":",
  text,
  sourceMode: "normal",
  preview: { command: "s/foo/bar/", matches: 1, message: "1 substitution" },
});

describe("workbench helper", () => {
  test("displays prefix with pending text", () => {
    expect(workbenchDisplayText(searchEntry("todo"))).toBe("/todo");
    expect(workbenchDisplayText({ ...searchEntry("todo"), prefix: "?" })).toBe("?todo");
    expect(workbenchDisplayText(exEntry("s/foo/bar/"))).toBe(":s/foo/bar/");
  });

  test("append and backspace edit text and clear preview/history navigation", () => {
    const appended = appendWorkbenchText({ ...exEntry("s/foo/bar/"), historyIndex: 0 }, "g");
    expect(appended.text).toBe("s/foo/bar/g");
    expect(appended.historyIndex).toBeUndefined();
    expect(appended.preview).toBeUndefined();

    const backed = backspaceWorkbenchText(appended);
    expect(backed.text).toBe("s/foo/bar/");
    expect(backed.preview).toBeUndefined();

    expect(backspaceWorkbenchText(searchEntry(""))).toEqual(searchEntry(""));
  });

  test("history previous and next restore entries and original draft", () => {
    const history = ["one", "two"];
    const draft = searchEntry("thr");

    const previous = navigateWorkbenchHistory(draft, history, "previous");
    expect(previous.text).toBe("two");
    expect(previous.historyIndex).toBe(1);
    expect(previous.historyDraft).toBe("thr");

    const older = navigateWorkbenchHistory(previous, history, "previous");
    expect(older.text).toBe("one");
    expect(older.historyIndex).toBe(0);
    expect(older.historyDraft).toBe("thr");

    const newer = navigateWorkbenchHistory(older, history, "next");
    expect(newer.text).toBe("two");
    expect(newer.historyIndex).toBe(1);

    const restored = navigateWorkbenchHistory(newer, history, "next");
    expect(restored.text).toBe("thr");
    expect(restored.historyIndex).toBeUndefined();
    expect(restored.historyDraft).toBeUndefined();
  });

  test("history navigation is bounded and clears preview", () => {
    const history = ["one"];
    const pending = exEntry("draft");

    const previous = navigateWorkbenchHistory(pending, history, "previous");
    expect(previous.text).toBe("one");
    expect(previous.preview).toBeUndefined();

    const stillPrevious = navigateWorkbenchHistory(previous, history, "previous");
    expect(stillPrevious.text).toBe("one");
    expect(stillPrevious.historyIndex).toBe(0);

    const empty = navigateWorkbenchHistory(searchEntry("draft"), [], "previous");
    expect(empty).toEqual(searchEntry("draft"));
  });
});
