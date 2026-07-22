/**
 * @param {import("pi-vimmode/config").VimConfigApi} vim
 */
export default function applyMarkdownPreset(vim) {
  vim.g.mapleader = " ";
  vim.keymap.actionPresets = ["markdown-wrapping"];
  vim.keymap.set("v", "<leader>>", vim.prompt.quote());
}
