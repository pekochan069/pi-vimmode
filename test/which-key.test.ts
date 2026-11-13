import { visibleWidth } from "@earendil-works/pi-tui";
import { expect, test } from "bun:test";

import { DEFAULT_VIM_WHICH_KEY, resolveVimOptions } from "../src/config.ts";
import { whichKeyRows } from "../src/which-key.ts";

const theme = {
  border: (text: string) => `\x1b[35m${text}\x1b[0m`,
  selectList: {
    description: (text: string) => `\x1b[2m${text}\x1b[0m`,
    scrollInfo: (text: string) => `\x1b[2m${text}\x1b[0m`,
    selectedText: (text: string) => `\x1b[36m${text}\x1b[0m`,
  },
};

function configuredOptions() {
  return resolveVimOptions({
    piVimMode: {
      leader: " ",
      startMode: "normal",
      whichKey: { enabled: true, groups: { "<leader>a": "model aliases" } },
      keymap: {
        actions: {
          "pi.command": [
            { key: "<leader>m", args: { command: "/model" }, modes: ["normal"], desc: "model" },
            { key: "<leader>al", args: { command: "/model-list" }, modes: ["normal"] },
            { key: "<leader>at", args: { command: "/model-toggle" }, modes: ["normal"] },
          ],
        },
      },
    },
  }).options;
}

test("which-key is disabled by default", () => {
  expect(DEFAULT_VIM_WHICH_KEY).toEqual({ enabled: false, groups: {} });
});

test("renders a root panel with selected typed input and adjacent group label", () => {
  const options = configuredOptions();
  const rows = whichKeyRows(
    { mode: "normal", pending: " " },
    options.keymap!,
    options.whichKey!,
    80,
    10,
    new Map(),
    theme,
  );
  expect(rows[0]).toContain("WHICH-KEY");
  expect(rows[1]).toContain("\x1b[36m→ \x1b[0m");
  expect(rows.join("\n")).toContain("  \x1b[36ma\x1b[0m  \x1b[36m+model aliases\x1b[0m");
  for (const row of rows) expect(visibleWidth(row)).toBe(80);
});

test("renders the deepest named group title and leaf commands", () => {
  const options = configuredOptions();
  const rows = whichKeyRows(
    { mode: "normal", pending: " a" },
    options.keymap!,
    options.whichKey!,
    80,
    10,
    new Map(),
    theme,
  );
  expect(rows[0]).toContain("WHICH-KEY : MODEL ALIASES");
  expect(rows[1]).toContain("\x1b[36m→ a\x1b[0m");
  expect(rows.join("\n")).toContain("  \x1b[2ma\x1b[0m\x1b[36ml\x1b[0m  /model-list");
  expect(rows.join("\n")).toContain("  \x1b[2ma\x1b[0m\x1b[36mt\x1b[0m  /model-toggle");
});

test("styles menu keys, commands, and groups without changing row width", () => {
  const options = configuredOptions();
  const rows = whichKeyRows(
    { mode: "normal", pending: " " },
    options.keymap!,
    options.whichKey!,
    80,
    10,
    new Map(),
    theme,
  );
  expect(rows.join("\n")).toContain("  \x1b[36mm\x1b[0m  /model");
  expect(rows.join("\n")).toContain("  \x1b[36ma\x1b[0m  \x1b[36m+model aliases\x1b[0m");
  for (const row of rows) expect(visibleWidth(row)).toBe(80);
});

test("shows slash commands with provider descriptions and binding fallbacks", () => {
  const options = configuredOptions();
  const rows = whichKeyRows(
    { mode: "normal", pending: " " },
    options.keymap!,
    options.whichKey!,
    80,
    10,
    new Map([["/model", "provider model"]]),
    theme,
  );
  expect(rows.join("\n")).toContain("  \x1b[36mm\x1b[0m  /model\x1b[2m");
  expect(rows.join("\n")).toContain("provider model\x1b[0m");
});

test("describes prompt commands with a trailing space and commands with arguments", () => {
  const options = resolveVimOptions({
    piVimMode: {
      leader: " ",
      startMode: "normal",
      whichKey: { enabled: true },
      keymap: {
        actions: {
          "pi.commandPrompt": [
            { key: "<leader>v", args: { command: "/less-verbose " }, modes: ["normal"] },
          ],
          "pi.command": [
            { key: "<leader>o", args: { command: "/automode off" }, modes: ["normal"] },
          ],
        },
      },
    },
  }).options;
  const rows = whichKeyRows(
    { mode: "normal", pending: " " },
    options.keymap!,
    options.whichKey!,
    80,
    10,
    new Map([
      ["/less-verbose", "set the session word limit"],
      ["/automode", "control automatic permissions"],
    ]),
    theme,
  );
  const text = rows.join("\n");
  expect(text).toContain("  \x1b[36mv\x1b[0m  /less-verbose\x1b[2m");
  expect(text).toContain("set the session word limit\x1b[0m");
  expect(text).toContain("  \x1b[36mo\x1b[0m  /automode off\x1b[2m");
  expect(text).toContain("control automatic permissions\x1b[0m");
});

test("uses deepest nested named group titles with tokenized keys", () => {
  const options = resolveVimOptions({
    piVimMode: {
      leader: " ",
      startMode: "normal",
      whichKey: { enabled: true, groups: { "<leader>ctrl+xp": "modified aliases" } },
      keymap: {
        actions: {
          "pi.command": [
            { key: "<leader>ctrl+xpa", args: { command: "/a" }, modes: ["normal"] },
            { key: "<leader>ctrl+xpb", args: { command: "/b" }, modes: ["normal"] },
          ],
        },
      },
    },
  }).options;
  const rows = whichKeyRows(
    { mode: "normal", pending: " ctrl+xp" },
    options.keymap!,
    options.whichKey!,
    80,
    10,
    new Map(),
    theme,
  );
  expect(rows[0]).toContain("WHICH-KEY : MODIFIED ALIASES");
  expect(rows.join("\n")).toContain("  \x1b[2mctrl+xp\x1b[0m\x1b[36ma\x1b[0m  /a");
  expect(rows.join("\n")).toContain("  \x1b[2mctrl+xp\x1b[0m\x1b[36mb\x1b[0m  /b");
});

test("includes omitted action modes and unnamed group counts", () => {
  const options = resolveVimOptions({
    piVimMode: {
      leader: " ",
      startMode: "normal",
      whichKey: { enabled: true },
      keymap: {
        actions: {
          "prompt.transform.quote": [{ key: "<leader>q" }],
          "pi.command": [
            { key: "<leader>aa", args: { command: "/a" }, modes: ["normal"] },
            { key: "<leader>ab", args: { command: "/b" }, modes: ["normal"] },
          ],
        },
      },
    },
  }).options;
  const rows = whichKeyRows(
    { mode: "normal", pending: " " },
    options.keymap!,
    options.whichKey!,
    80,
    undefined,
    new Map(),
    theme,
  );
  expect(rows.join("\n")).toContain("prompt.transform.quote");
  expect(rows.join("\n")).toContain("  \x1b[36ma\x1b[0m  \x1b[36m+2 mappings\x1b[0m");
});

test("keeps slash commands visible without descriptions", () => {
  const options = resolveVimOptions({
    piVimMode: {
      leader: " ",
      startMode: "normal",
      whichKey: { enabled: true },
      keymap: { actions: { "pi.command": [{ key: "<leader>m", args: { command: "/model" } }] } },
    },
  }).options;
  expect(
    whichKeyRows({ mode: "normal", pending: " " }, options.keymap!, options.whichKey!, 80),
  ).toContain("  m  /model".padEnd(80));
});

test("uses styled overflow within a complete panel budget", () => {
  const options = resolveVimOptions({
    piVimMode: {
      leader: " ",
      startMode: "normal",
      whichKey: { enabled: true },
      keymap: {
        actions: {
          "pi.command": Array.from({ length: 4 }, (_, index) => ({
            key: `<leader>${String.fromCharCode(97 + index)}`,
            args: { command: `/command-${index}` },
            modes: ["normal"],
          })),
        },
      },
    },
  }).options;
  const rows = whichKeyRows(
    { mode: "normal", pending: " " },
    options.keymap!,
    options.whichKey!,
    80,
    5,
    new Map(),
    theme,
  );
  expect(rows).toHaveLength(5);
  expect(rows.at(-1)).toContain("+2 more");
});

test("suppresses incomplete panels when the row budget is too small", () => {
  const options = configuredOptions();
  expect(
    whichKeyRows({ mode: "normal", pending: " " }, options.keymap!, options.whichKey!, 80, 2),
  ).toEqual([]);
});

test("keeps non-leader, non-normal, and exact pending states hidden", () => {
  const options = configuredOptions();
  expect(
    whichKeyRows({ mode: "normal", pending: "d" }, options.keymap!, options.whichKey!, 80),
  ).toEqual([]);
  expect(
    whichKeyRows({ mode: "visual", pending: " " }, options.keymap!, options.whichKey!, 80),
  ).toEqual([]);
  expect(
    whichKeyRows({ mode: "normal", pending: " m" }, options.keymap!, options.whichKey!, 80),
  ).toEqual([]);
});
