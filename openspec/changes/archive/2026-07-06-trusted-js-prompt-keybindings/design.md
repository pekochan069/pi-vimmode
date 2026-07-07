# Design

## API

Only function default exports are accepted:

```js
export default (vim) => {
  vim.keymap.set(mode, key, vim.prompt.reflow({ width: 88 }));
};
```

`key` is always a string parsed by existing key syntax validation. RHS may be a `vim.prompt.*` builtin command object or a key replay string such as `"llll"` or `":vimdoctor<CR>"`. String RHS values that name internal action IDs are not semantic APIs; replay strings execute through the existing macro replay path and replay-step limit.

## Built-ins

Prompt transforms:

- `vim.prompt.quote()`
- `vim.prompt.unquote()`
- `vim.prompt.bulletize()`
- `vim.prompt.fence({ language })`
- `vim.prompt.indent()`
- `vim.prompt.dedent()`
- `vim.prompt.reflow({ width })`

Insert actions:

- `vim.prompt.openLineBelow()`
- `vim.prompt.openLineAbove()`
- `vim.prompt.deleteWordBackward()`
- `vim.prompt.deleteWordForward()`
- `vim.prompt.deleteLineBackward()`
- `vim.prompt.deleteLineForward()`
- `vim.prompt.moveWordBackward()`
- `vim.prompt.moveWordForward()`
- `vim.prompt.moveLineStart()`
- `vim.prompt.moveLineEnd()`

## Merge semantics

Resolution order:

1. Defaults
2. Global JSON + presets
3. Global JS builder additions
4. Project JSON + presets/actions

JS builder additions append to matching inherited global/preset action or insert bindings instead of replacing them. Project JSON remains authoritative and can replace/clear later.

## Simple replay mappings

String RHS mappings replay the RHS as modal input through the existing macro replay path. Example: `vim.keymap.set("n", "zz", "llll")` moves right four times. Replay obeys macro replay caps and does not recursively expand while `snapshot.isMacroReplaying` is true.

## Safety

JS config is trusted global code and not sandboxed. No project-local JS config is loaded. Invalid JS config produces warnings and falls back without crashing startup.
