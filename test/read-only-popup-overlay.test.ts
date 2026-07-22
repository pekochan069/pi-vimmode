import { visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, test } from "bun:test";

import type { ReadOnlyPopup } from "../src/read-only-popup.ts";

import { ReadOnlyPopupOverlayComponent } from "../src/keybinding-discovery-overlay.ts";

function popup(lines: readonly string[], scrollOffset = 0): ReadOnlyPopup {
  return {
    title: "Read-only output",
    source: "help",
    scrollOffset,
    lines,
  };
}

function createComponent(input: ReadOnlyPopup) {
  const renders: number[] = [];
  let closed = 0;
  const component = new ReadOnlyPopupOverlayComponent(
    { requestRender: () => renders.push(1) } as any,
    input,
    {},
    () => closed++,
  );
  return { component, renders, closed: () => closed };
}

describe("read-only popup overlay", () => {
  test("renders bounded rows width-safely with empty-state content", () => {
    const { component } = createComponent(popup(["messages: none retained"]));
    const rows = component.render(40);

    expect(rows.join("\n")).toContain("Read-only output");
    expect(rows.join("\n")).toContain("1-1/1");
    expect(rows.join("\n")).toContain("messages: none retained");
    expect(rows.join("\n")).toContain("j/k ↑/↓ scroll");
    expect(rows.length).toBe(7);
    for (const row of rows) expect(visibleWidth(row)).toBeLessThanOrEqual(40);
  });

  test("caps height and reports hidden rows", () => {
    const { component } = createComponent(
      popup(Array.from({ length: 14 }, (_, index) => `row ${index + 1}`)),
    );
    const rows = component.render(64);
    const text = rows.join("\n");

    expect(text).toContain("1-10/14");
    expect(text).toContain("↓4");
    expect(text).toContain("row 10");
    expect(text).not.toContain("row 11");
    expect(rows.length).toBe(16);
  });

  test("scroll controls reveal hidden rows and clamp at bounds", () => {
    const { component, renders } = createComponent(
      popup(Array.from({ length: 12 }, (_, index) => `row ${index + 1}`)),
    );

    component.handleInput("j");
    expect(component.render(64).join("\n")).toContain("2-11/12 ↑1 ↓1");
    component.handleInput("\x1b[B");
    component.handleInput("\x1b[B");
    expect(component.render(64).join("\n")).toContain("3-12/12 ↑2");
    component.handleInput("k");
    expect(component.render(64).join("\n")).toContain("2-11/12 ↑1 ↓1");
    component.handleInput("\x1b[A");
    component.handleInput("\x1b[A");
    expect(component.render(64).join("\n")).toContain("1-10/12 ↓2");
    expect(renders.length).toBeGreaterThanOrEqual(4);
  });

  test("renders Markdown semantically, wraps prose, and preserves code indentation", () => {
    const input = popup([]);
    input.source = "changelog";
    input.markdown = [
      "## Added",
      "",
      "- Long **bold** prose with [`link`](https://example.com) that wraps across rows.",
      "",
      "```js",
      "  const value = 1;",
      "```",
    ].join("\n");
    const { component } = createComponent(input);
    const rows = component.render(48);
    const text = rows.join("\n");

    expect(text).toContain("Added");
    expect(text).toContain("• Long bold prose");
    expect(text).toContain("link");
    expect(text).toContain("(https://example.com)");
    expect(text).toContain("  const value = 1;");
    expect(text).not.toContain("```js");
    expect(text).toContain("1-7/7");
    for (const row of rows) expect(visibleWidth(row)).toBeLessThanOrEqual(48);
  });

  test("counts wrapped Markdown rows for scrolling", () => {
    const input = popup([]);
    input.source = "changelog";
    input.markdown = Array.from(
      { length: 6 },
      () => "Long prose that wraps onto another rendered row.",
    ).join("\n");
    const { component } = createComponent(input);

    expect(component.render(40).join("\n")).toContain("1-10/12 ↓2");
    component.handleInput("j");
    expect(component.render(40).join("\n")).toContain("2-11/12 ↑1 ↓1");
  });

  test("close controls are local to overlay", () => {
    for (const key of ["\x1b", "\x03", "\x07"]) {
      const { component, closed } = createComponent(popup(["output"]));
      component.handleInput(key);
      expect(closed()).toBe(1);
    }
  });
});
