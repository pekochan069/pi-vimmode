import type { VimConfigApi } from "../src/vim-config.d.ts";

declare const vim: VimConfigApi;

// @ts-expect-error unknown leaves are not public config
vim.unknown = true;
// @ts-expect-error startup mode excludes visual modes
vim.startMode = "visual";
// @ts-expect-error mode must be finite VimModeAlias
vim.keymap.set("replace", "x", null);
// @ts-expect-error reflow width must be numeric
vim.prompt.reflow({ width: "wide" });
// @ts-expect-error mapping options are finite
vim.keymap.set("n", "x", null, { recursive: true });

vim.startMode = "normal";
vim.keymap.set("n", "x", vim.action.command.deleteChar(), { desc: "delete" });
