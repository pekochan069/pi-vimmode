# pi-vimmode

Vim-style prompt editing for [Pi](https://github.com/earendil-works/pi-coding-agent).

`pi-vimmode` replaces Pi's main input editor with a `CustomEditor`-based modal editor. It targets practical prompt editing for agent prompts, not full Vim parity.

## Install / load

Install from Git:

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

## Quick start

1. Start Pi with the extension loaded.
2. Type normally in insert mode.
3. Press `Esc` to enter normal mode when autocomplete is inactive.
4. Use supported Vim commands such as `h`, `j`, `k`, `l`, `w`, `b`, `e`, `0`, `$`, `i`, `a`, `x`, `dd`, `cw`, `p`, `/`, `n`, `N`, `v`, `V`, `Ctrl-v`, `:s`, `:d`, `:y`, `:pu`, `:t`, `:m`, `:j`, `:noh`, `q`, `@`, and `@@`.
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

- [`docs/features.md`](docs/features.md): supported modes, motions, edits, operators, text objects, character search, prompt search, visual modes, Ex command-line commands, registers, marks, macros, UI/status rendering, Pi shortcut compatibility, limitations, recovery, and validation examples.
- [`docs/settings.md`](docs/settings.md): every supported `piVimMode` setting, defaults, accepted value shapes, merge behavior, key sequence syntax, protected-key validation, warnings, troubleshooting, and practical config examples.
- [`docs/adr/0002-user-facing-pi-vimmode-docs.md`](docs/adr/0002-user-facing-pi-vimmode-docs.md): documentation source-of-truth decision and maintenance rules.

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
    "cursor": {
      "normal": "block",
      "insert": "bar"
    },
    "keymap": {
      "commands": {
        "startSearch": ["/"]
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

See [`docs/settings.md`](docs/settings.md) for the full default reference and all settings.

## Recover or disable

If the extension blocks editing or configuration goes wrong:

- Start with [`docs/features.md#disable-or-recover`](docs/features.md#disable-or-recover).
- Use `pi list` to inspect installed extensions.
- Use `pi remove` or `pi uninstall` with the installed extension identifier to remove it.
- Use `pi config` or edit Pi config files to remove `piVimMode` overrides.
- Restart Pi after changing extension or config state.

## Architecture

`VimEditor` is the Pi adapter shell. It owns `CustomEditor` integration, snapshots, effect application, rendering bridge, public cursor restoration, and best-effort terminal cursor writes.

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
```

Manual smoke checklist:

1. Load extension in Pi.
2. Type text in insert mode.
3. Press `Esc`, use normal-mode motions and edits.
4. Use `v`, `V`, and `Ctrl-v`; confirm visual highlighting and selection operations.
5. Configure `piVimMode.startMode`, `piVimMode.cursor`, a keymap binding, and UI status items; confirm behavior changes.
6. Confirm insert/normal submit and normal-mode `Esc` still delegate to Pi where expected.
7. Record and replay a macro with `q{slot}`, `@{slot}`, and `@@`.
8. Run `/query`, `n`, `N`, `:%s/old/new/g`, `:2,3copy$`, `:move0`, and `:noh`; confirm prompt-local search/Ex behavior.
