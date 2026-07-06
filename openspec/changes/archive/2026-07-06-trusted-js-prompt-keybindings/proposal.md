# trusted-js-prompt-keybindings

## Why

The first JS config shape exposed pi-vimmode built-ins as string action IDs such as `"prompt.transform.reflow"`. That made user config look like internal registry plumbing, made examples collide with preset keys, and made `vim.keymap.set` behave like replacement config instead of adding keys.

## What

Add a trusted global JS config file at `~/.pi/agent/pi-vimmode.config.js` with a small builder API:

```js
export default (vim) => {
  vim.keymap.set("i", "<A-w>", vim.prompt.deleteWordBackward());
  vim.keymap.set("n", "zq", vim.prompt.reflow({ width: 88 }));
  vim.keymap.set("v", "z>", vim.prompt.quote());
};
```

Built-in actions are accessed through `vim.prompt.*`. Keybindings are strings. Builder mappings add to inherited global JSON/preset bindings. Project JSON still wins last and can clear actions with empty arrays.

## Impact

- Adds `src/config-js.ts`.
- Makes `loadVimOptions` async-capable through existing lifecycle support.
- Adds mode-scoped prompt transform action bindings.
- Updates docs and tests.
