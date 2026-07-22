/** @type {import("pi-vimmode/config").VimConfig} */
export default (vim) => {
  vim.g.mapleader = " ";
  vim.keymap.set("i", "<A-w>", vim.prompt.deleteWordBackward());
  vim.keymap.set("n", "<leader>q", vim.action.prompt.transform.reflow({ width: 88 }), {
    desc: "Reflow paragraph",
  });
  vim.keymap.set("v", "z>", vim.prompt.quote());
  vim.keymap.set("n", "zz", "llll");
  vim.keymap.set("n", "zq", null);
};
