# pi-vimmode

Vim-style prompt editing for [Pi](https://github.com/earendil-works/pi-coding-agent).

`pi-vimmode` replaces Pi's main input editor with a `CustomEditor`-based modal editor. It targets practical prompt editing, not full Vim parity.

## Install / load

From this directory:

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

## Modes

- **INSERT**: default mode. Text entry, autocomplete, submit, newlines, image paste, external editor, and app shortcuts use Pi's default editor behavior.
- **NORMAL**: Vim command mode. Printable keys are interpreted as supported Vim commands or ignored.
- **VISUAL**: characterwise selection mode. Selection operations use an extension-local unnamed register.

### Escape behavior

- Insert + inactive autocomplete: `Esc` enters normal mode.
- Insert + active autocomplete: `Esc` delegates to Pi and remains insert mode.
- Normal: `Esc` delegates to Pi so interrupt/abort behavior still works.
- Visual: `Esc` cancels selection and returns to normal mode.

## Keymap

### Normal mode

| Key | Behavior |
|-----|----------|
| `h` / `j` / `k` / `l` | move left / down / up / right |
| `0` / `$` | line start / line end |
| `w` / `b` | word forward / word backward |
| `i` | insert at cursor |
| `a` | move right, then insert |
| `I` / `A` | line start/end, then insert |
| `v` | enter visual mode |
| `x` | delete character under cursor |
| `dd` | delete current line into linewise register |
| `yy` | yank current line into linewise register |
| `p` | paste unnamed register |
| `u` | delegate to Pi native undo |

### Visual mode

| Key | Behavior |
|-----|----------|
| `h` / `j` / `k` / `l` / `0` / `$` / `w` / `b` | extend selection |
| `y` | yank selection and return normal |
| `d` / `x` | delete selection and return normal |
| `c` | delete selection and enter insert |
| `Esc` | cancel selection and return normal |

## Pi shortcut compatibility

Unknown control/non-printable keys delegate to Pi. In particular:

- `Enter` submits in all modes. Normal/visual submit resets Vim state to insert for the next prompt.
- `Ctrl+C`, `Ctrl+D`, `Ctrl+G`, model/thinking shortcuts, and image paste stay Pi-owned unless explicitly implemented by this extension.
- Unmapped printable keys in normal/visual mode are ignored instead of inserted.

## Registers and undo

- One unnamed register is supported.
- Yank/delete/change update the register.
- Linewise paste inserts below the current line.
- Charwise paste inserts after the cursor.
- Empty register paste is a no-op.
- `u` delegates to Pi native undo. Pi's editor records programmatic text changes made through `setText()`.

## Feedback

The editor border/status area shows mode feedback:

- `INSERT`, `NORMAL`, `VISUAL` at normal widths.
- `I`, `N`, `V` at narrow widths.
- Pending `d`/`y` and visual selection summaries show when space allows.

## Limitations

- No block visual mode or visual line mode.
- No search, ex commands, macros, marks, named registers, or system clipboard integration.
- Visual selection highlighting across wrapped terminal lines is deferred; v1 shows mode/selection feedback instead.
- Editing uses Pi's cursor coordinates, not full grapheme-cluster Vim semantics. Complex Unicode may not behave exactly like Vim.

## Validate

```sh
bun test
bun run check-types
```

Manual smoke checklist:

1. Load extension in Pi.
2. Type text in insert mode.
3. Press `Esc`, use normal-mode motions and edits.
4. Use `v`, select text, then `y`, `d`, `x`, and `c`.
5. Submit from insert and normal modes.
6. Confirm next prompt starts in insert mode.
7. Confirm normal-mode `Esc` can still interrupt/abort Pi.
