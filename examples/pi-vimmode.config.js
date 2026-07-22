/** @type {import("./npm/node_modules/pi-vimmode/config").VimConfig} */
export default (vim) => {
  vim.preset = "prompt-safe";
  vim.g.mapleader = " ";
  vim.startMode = "normal";
  vim.cursor.normal = "bar";
  vim.ui.status.position = "right";
};
