import { visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, test } from "bun:test";

import type { ReadOnlyPopup } from "../src/keybinding-discovery-popup.ts";

import { ReadOnlyPopupOverlayComponent } from "../src/keybinding-discovery-overlay.ts";

function popup(lines: readonly string[], scrollOffset = 0): ReadOnlyPopup {
  return {
    title: "Read-only output",
    source: "help",
    docsAnchor: "runtime-help:runtime-help",
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

  test("close controls are local to overlay", () => {
    for (const key of ["\x1b", "\x03", "\x07"]) {
      const { component, closed } = createComponent(popup(["output"]));
      component.handleInput(key);
      expect(closed()).toBe(1);
    }
  });
});
