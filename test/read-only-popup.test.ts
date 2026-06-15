import { describe, expect, test } from "bun:test";

import {
  HELP_POPUP_BODY_ROWS,
  popupFromMessage,
  scrollHelpPopup,
  splitPopupMessage,
  type ReadOnlyPopup,
} from "../src/read-only-popup.ts";

function popup(lineCount: number, scrollOffset = 0): ReadOnlyPopup {
  return {
    title: "Read-only output",
    source: "help",
    docsAnchor: "runtime-help:runtime-help",
    scrollOffset,
    lines: Array.from({ length: lineCount }, (_, index) => `row ${index + 1}`),
  };
}

describe("read-only popup helpers", () => {
  test("splits messages into trimmed newline and semicolon-delimited lines", () => {
    expect(splitPopupMessage(" first line\nsecond line; third line ;  ")).toEqual([
      "first line",
      "second line",
      "third line",
    ]);
  });

  test("keeps empty output visible", () => {
    expect(splitPopupMessage("  \n ;   ")).toEqual(["(no output)"]);
    expect(
      popupFromMessage({
        title: ":messages",
        source: "messages",
        docsAnchor: "runtime-help:runtime-help",
        message: "",
      }).lines,
    ).toEqual(["(no output)"]);
  });

  test("builds popup with source metadata and zero initial scroll", () => {
    expect(
      popupFromMessage({
        title: ":help search",
        source: "help",
        query: "search",
        docsAnchor: "runtime-help:runtime-help",
        message: "search help",
      }),
    ).toMatchObject({
      title: ":help search",
      source: "help",
      query: "search",
      docsAnchor: "runtime-help:runtime-help",
      scrollOffset: 0,
      lines: ["search help"],
    });
  });

  test("clamps scroll at top and preserves identity when unchanged", () => {
    const input = popup(HELP_POPUP_BODY_ROWS, 0);

    expect(scrollHelpPopup(input, -1)).toBe(input);
    expect(scrollHelpPopup(input, 1)).toBe(input);
  });

  test("clamps scroll at bottom", () => {
    const input = popup(HELP_POPUP_BODY_ROWS + 3, 2);
    const output = scrollHelpPopup(input, 10);

    expect(output).not.toBe(input);
    expect(output.scrollOffset).toBe(3);
    expect(scrollHelpPopup(output, 1)).toBe(output);
  });

  test("returns new popup when scroll changes", () => {
    const input = popup(HELP_POPUP_BODY_ROWS + 1, 0);
    const output = scrollHelpPopup(input, 1);

    expect(output).not.toBe(input);
    expect(output.scrollOffset).toBe(1);
    expect(input.scrollOffset).toBe(0);
  });
});
