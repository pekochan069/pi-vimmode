import { visibleWidth } from "@earendil-works/pi-tui";
import { expect, test } from "bun:test";

import {
  renderPassiveSlashOverflow,
  renderPassiveSlashRows,
} from "../src/slash-autocomplete-style.ts";

const theme = {
  description: (text: string) => `\x1b[2m${text}\x1b[0m`,
  scrollInfo: (text: string) => `\x1b[2m${text}\x1b[0m`,
  selectedText: (text: string) => `\x1b[36m${text}\x1b[0m`,
};

test("matches unselected slash autocomplete primary and description layout", () => {
  const [row] = renderPassiveSlashRows(
    [{ primary: "m  /model", description: "switch\nmodel" }],
    60,
    theme,
  );
  expect(row).toContain("  m  /model\x1b[2m   switch model\x1b[0m");
  expect(visibleWidth(row!)).toBe(60);
});

test("clamps primary width and hides descriptions at SelectList thresholds", () => {
  const rows = [{ primary: "x  /a-very-long-command-name-that-overflows", description: "details" }];
  expect(renderPassiveSlashRows(rows, 40, theme)[0]).toBe(
    "  x  /a-very-long-command-name-that-ov\x1b[0m  ",
  );
  expect(renderPassiveSlashRows(rows, 41, theme)[0]).not.toContain("\x1b[2m");
  expect(
    renderPassiveSlashRows([{ primary: "m  /model", description: "details" }], 41, theme)[0],
  ).toContain("\x1b[2m");
  expect(
    renderPassiveSlashRows([{ primary: "m  /model", description: "details" }], 30, theme)[0],
  ).toBe("  m  /model".padEnd(30));
});

test("styles primary segments after calculating unstyled layout", () => {
  const [row] = renderPassiveSlashRows(
    [
      {
        primary: "m  /model",
        primarySegments: [{ text: "m", tone: "accent" }, { text: "  " }, { text: "/model" }],
        description: "details",
      },
      {
        primary: "a  +aliases",
        primarySegments: [
          { text: "a", tone: "accent" },
          { text: "  " },
          { text: "+aliases", tone: "muted" },
        ],
      },
    ],
    60,
    theme,
  );
  expect(row).toContain("\x1b[36mm\x1b[0m  /model");
  expect(visibleWidth(row!)).toBe(60);
});

test("truncates descriptions independently and styles overflow information", () => {
  const row = renderPassiveSlashRows(
    [{ primary: "m  /model", description: "a very long command description that must truncate" }],
    50,
    theme,
  )[0]!;
  expect(row).toContain("\x1b[2m");
  expect(visibleWidth(row)).toBe(50);
  expect(visibleWidth(renderPassiveSlashOverflow(7, 20, theme))).toBe(20);
});
