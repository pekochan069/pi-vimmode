# pi-vimmode

Vim-style prompt editing for [Pi](https://pi.dev/).

`pi-vimmode` replaces Pi's main input editor with a `CustomEditor`-based modal editor. It targets practical prompt editing for agent prompts, not full Vim parity.

## Breaking changes

### v0.7.0

- `Ctrl-v` no longer enters visual block mode by default. `Ctrl-v`, Windows `Alt-v`, and `Ctrl-Alt-v` are delegated to Pi for image/clipboard paste in normal and visual modes unless explicitly rebound.
- Visual block mode now has an empty default keybinding. Configure `piVimMode.keymap.commands.visualBlock` with a non-protected key such as `<A-b>`, or explicitly allow and bind `<C-v>` if Vim-style visual block is more important than Pi image paste in your workflow.

```json
{
  "piVimMode": {
    "keymap": {
      "commands": { "visualBlock": ["<A-b>"] }
    }
  }
}
```

To intentionally reclaim `Ctrl-v` for visual block:

```json
{
  "piVimMode": {
    "keymap": {
      "commands": { "visualBlock": ["<C-v>"] },
      "allowProtectedOverrides": ["<C-v>"]
    }
  }
}
```

## Install / load

Install from npm:

```sh
pi install npm:pi-vimmode
```

or Install from Git to install latest version:

```sh
pi install git:https://github.com/pekochan069/pi-vimmode
```

For local development from this checkout:

```sh
bun install
```

Pi discovers the extension through `package.json`:

```json
{
  "pi": {
    "extensions": ["./index.ts"]
  }
}
```

For local testing, load this package as a Pi extension using Pi's normal extension loading flow.

### Compatibility with extensions that modifies editor

Pi currently exposes a single custom-editor factory which makes last extension could overrides previous editor factories.\
Currently, `pi-vimmode` is implemented with `CustomEditor` which cannot decorate an arbitrary editor instances provided by other extensions.
This means editor extensions that maintain per-instance state, such as history or additional editor behavior, may lose that state when their factory is replaced.

Until pi supports composable order independant editor extension api, you should load pi-vimmode in front of other extensions that set editor component, like `@zigai/pi-prompt-history`.
Load `pi-vimmode` before other extensions in `settings.json`:

```json
{
  "packages": ["pi-vimmode", "another-editor-extension"]
}
```

See issue #16 for more information.

## Quick start

1. Start Pi with the extension loaded.
2. Type normally in insert mode.
3. Press `Esc` to enter normal mode when autocomplete is inactive.
4. Use supported Vim commands such as `h`, `j`, `k`, `l`, `w`, `b`, `e`, `0`, `$`, `i`, `a`, `x`, `dd`, `cw`, `p`, `/`, `n`, `N`, `v`, `V`, configured visual block, `:s`, `:d`, `:y`, `:pu`, `:t`, `:m`, `:j`, `:noh`, `q`, `@`, and `@@`.
5. Press `i`, `a`, `I`, `A`, `o`, `O`, `C`, `s`, or `S` to return to insert mode after edits; use operator forms such as `cw`, `cc`, or `c$` when changing by motion.

Default modes:

- **INSERT**: Pi-like text entry. Autocomplete, submit, newlines, image paste, external editor, and app shortcuts use Pi's default behavior.
- **NORMAL**: supported Vim command mode. Unsupported printable keys are ignored.
- **VISUAL**: characterwise selection.
- **V-LINE**: linewise selection.
- **V-BLOCK**: rectangular block selection.

`Esc` in normal mode delegates to Pi so interrupt/abort behavior still works. `Esc` in visual modes cancels the selection and returns to normal mode.

## Documentation

Canonical user-facing docs live under `docs/`:

- [`docs/features.md`](https://github.com/pekochan069/pi-vimmode/blob/main/docs/features.md): supported modes, motions, edits, operators, prompt-native text objects, prompt transforms, character search, prompt search, visual modes, Ex command-line commands, registers, marks, macros, UI/status rendering, Pi shortcut compatibility, limitations, recovery, and validation examples.
- [`docs/settings.md`](https://github.com/pekochan069/pi-vimmode/blob/main/docs/settings.md): every supported `piVimMode` setting, defaults, accepted value shapes, merge behavior, key sequence syntax, protected-key validation, warnings, troubleshooting, and practical config examples.
- [`docs/adr/0002-user-facing-pi-vimmode-docs.md`](https://github.com/pekochan069/pi-vimmode/blob/main/docs/adr/0002-user-facing-pi-vimmode-docs.md): documentation source-of-truth decision and maintenance rules.

README is the quickstart and index. Keep detailed behavior and settings reference in the canonical docs above.

## Common configuration

Minimal startup override:

```json
{
  "piVimMode": {
    "startMode": "normal"
  }
}
```

Example keymap/UI override:

```json
{
  "piVimMode": {
    "leader": " ",
    "cursor": {
      "normal": "block",
      "insert": "bar"
    },
    "keymap": {
      "commands": {
        "startSearch": ["/"],
        "showKeybindings": ["<leader>k"]
      }
    },
    "ui": {
      "status": {
        "items": ["mode", "pending", "search", "macro", "cursorPosition", "warnings"]
      }
    }
  }
}
```

### EasyMotion

When you trigger character search (e.g. `f`, `t`, `F`, `T`), matching characters on the current line are replaced with colored label characters. Press the label to jump to that character, which restores the original. The label color is configurable under `piVimMode.easymotion.labelColor`:

```json
{
  "piVimMode": {
    "easymotion": {
      "labelColor": "\u001b[31m"
    }
  }
}
```

Common ANSI color codes: `\u001b[31m` (red), `\u001b[32m` (green), `\u001b[33m` (yellow), `\u001b[34m` (blue), `\u001b[35m` (magenta), `\u001b[36m` (cyan), `\u001b[37m` (white). Default is red (`\u001b[31m`).

Trusted global JS keybindings live at `~/.pi/agent/pi-vimmode.config.js` and run as local code with Pi process privileges:

```js
/** @type {import("./npm/node_modules/pi-vimmode/config").VimConfig} */
export default (vim) => {
  vim.g.mapleader = " ";
  vim.keymap.set("i", "<A-w>", vim.prompt.deleteWordBackward());
  vim.keymap.set("n", "<leader>q", vim.prompt.reflow({ width: 88 }));
  vim.keymap.set("n", "ZD", ":vimdoctor<CR>");
};
```

Run `/vimmode reload` after editing JS config. See [`docs/settings.md`](https://github.com/pekochan069/pi-vimmode/blob/main/docs/settings.md) for the full default reference, JS config boundaries, and all settings.

## Recover or disable

If the extension blocks editing or configuration goes wrong:

- Run `/vimmode off` to restore Pi's previous editor for the current extension runtime.
- Run `/vimmode on` or `/vimmode` to enable the Vim editor again.
- Start with [`docs/features.md#disable-or-recover`](https://github.com/pekochan069/pi-vimmode/blob/main/docs/features.md#disable-or-recover).
- Use `pi list` to inspect installed extensions.
- Use `pi remove` or `pi uninstall` with the installed extension identifier to remove it.
- Use `pi config` or edit Pi config files to remove `piVimMode` overrides.
- Restart Pi after changing extension or config state.

## Architecture

`VimEditor` is the Pi adapter shell. It owns `CustomEditor` integration, snapshots, effect application, rendering bridge, public cursor restoration, and best-effort terminal cursor writes. Insert-mode `bar` hardware cursors stay visible while Pi agent work is active; non-bar cursors are suppressed during busy output.

Modal editing behavior lives under `src/modal/`:

- `engine.ts` owns mode transitions, finite semantic key dispatch, register updates, and supported Vim semantics.
- `types.ts` defines adapter-applied effects such as delegation, edits, macro replay, cursor restoration, invalidation, and terminal cursor hints.
- `view.ts` derives mode labels, status items, visual status text, and cursor position text without needing Pi TUI objects.

The parser in `src/commands.ts` and text transforms in `src/buffer.ts` remain pure helpers. Config maps keys to supported semantic actions; it does not add private Pi APIs, recursive mappings, `.vimrc`, Vimscript, or Neovim Lua support.

## Project docs

- `docs/features.md`: canonical feature guide.
- `docs/settings.md`: canonical settings reference.
- `docs/adr/`: documentation and architecture decisions.
- `docs/plans/`: implementation plans for Vim editor work.
- `docs/solutions/`: reusable learnings for parser, buffer, lifecycle, and visual-mode bugs.
- `openspec/specs/`: durable OpenSpec requirements for supported Vim behavior.

## Validate

```sh
bun test
bun run check-types
bun run lint
bun run format:check
bun run build
bun run verify-package
bun pm pack --dry-run
```

Before publishing, inspect dry-run package contents and confirm extension entrypoint plus runtime source/build output are included, not docs only.

Manual smoke checklist:

1. Load extension in Pi.
2. Type text in insert mode.
3. Press `Esc`, use normal-mode motions and edits.
4. Use `v`, `V`, and a configured visual-block binding such as `<A-b>`; confirm visual highlighting and selection operations.
5. Configure `piVimMode.startMode`, `piVimMode.cursor`, a keymap binding, and UI status items; confirm behavior changes.
6. Confirm insert/normal submit and normal-mode `Esc` still delegate to Pi where expected.
7. Record and replay a macro with `q{slot}`, `@{slot}`, and `@@`.
8. Run `/query`, `n`, `N`, `:%s/old/new/g`, `:2,3copy$`, `:move0`, and `:noh`; confirm prompt-local search/Ex behavior.
