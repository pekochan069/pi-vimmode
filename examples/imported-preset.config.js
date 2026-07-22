import applyMarkdownPreset from "./presets/markdown.js";

/** @type {import("pi-vimmode/config").VimConfig} */
export default (vim) => {
  applyMarkdownPreset(vim);
  vim.startMode = "normal";
};
