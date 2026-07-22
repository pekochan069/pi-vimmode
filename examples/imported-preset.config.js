import applyMarkdownPreset from "./presets/markdown.js";

/** @type {import("./npm/node_modules/pi-vimmode/config").VimConfig} */
export default (vim) => {
  applyMarkdownPreset(vim);
  vim.startMode = "normal";
};
