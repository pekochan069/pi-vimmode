/** @type {import("./npm/node_modules/pi-vimmode/config").VimConfig} */
export default async (vim) => {
  const preferredWidth = await Promise.resolve(88);
  vim.promptTransforms.enabled = true;
  vim.keymap.set("n", "gq", vim.prompt.reflow({ width: preferredWidth }));
};
