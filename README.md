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

- **INSERT**: default mode unless configured otherwise. Text entry, autocomplete, submit, newlines, image paste, external editor, and app shortcuts use Pi's default editor behavior.
- **NORMAL**: Vim command mode. Printable keys are interpreted as supported Vim commands or ignored.
- **VISUAL**: characterwise selection mode. Selected text is highlighted inline while selection operations use an extension-local unnamed register.
- **V-LINE**: linewise visual selection mode. Whole selected lines are highlighted and linewise operations use the unnamed line register.

### Escape behavior

- Insert + inactive autocomplete: `Esc` enters normal mode.
- Insert + active autocomplete: `Esc` delegates to Pi and remains insert mode.
- Normal: `Esc` delegates to Pi so interrupt/abort behavior still works.
- Visual / V-Line: `Esc` cancels selection and returns to normal mode.

## Keymap

### Normal mode

| Key                   | Behavior                                        |
| --------------------- | ----------------------------------------------- |
| `h` / `j` / `k` / `l` | move left / down / up / right                   |
| `0` / `$`             | line start / line end                           |
| `w` / `b`             | word forward / word backward                    |
| `gg` / `G`            | buffer start / buffer end                       |
| `^` / `_`             | first non-blank character on current line       |
| `%`                   | jump to matching `()`, `[]`, or `{}` pair       |
| `i`                   | insert at cursor                                |
| `a`                   | move right, then insert                         |
| `I` / `A`             | line start/end, then insert                     |
| `o` / `O`             | open blank line below/above, then insert        |
| `v`                   | enter characterwise visual mode                 |
| `V`                   | enter visual line mode                          |
| `x`                   | delete character under cursor                   |
| `dd` / `cc` / `yy`    | delete/change/yank current line                 |
| `D` / `C`             | delete/change from cursor through line end      |
| `Y`                   | yank current line into linewise register        |
| `d{motion}`           | delete by `w`, `b`, `0`, `^`, or `$`            |
| `c{motion}`           | change by `w`, `b`, `0`, `^`, or `$`            |
| `y{motion}`           | yank by `w`, `b`, `0`, `^`, or `$`              |
| `J`                   | join current line with next line                |
| `p` / `P`             | paste unnamed register after/before cursor/line |
| `u`                   | delegate to Pi native undo                      |

### Visual mode

| Key                                           | Behavior                                                |
| --------------------------------------------- | ------------------------------------------------------- |
| `h` / `j` / `k` / `l` / `0` / `$` / `w` / `b` | extend characterwise selection                          |
| `V`                                           | switch to visual line mode without resetting the anchor |
| `y`                                           | yank selection and return normal                        |
| `d` / `x`                                     | delete selection and return normal                      |
| `c`                                           | delete selection and enter insert                       |
| `Esc`                                         | cancel selection and return normal                      |

### Visual line mode

| Key                                           | Behavior                                                         |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `h` / `j` / `k` / `l` / `0` / `$` / `w` / `b` | extend the selected line range                                   |
| `v`                                           | switch to characterwise visual mode without resetting the anchor |
| `y`                                           | yank selected lines into a linewise register and return normal   |
| `d` / `x`                                     | delete selected lines into a linewise register and return normal |
| `c`                                           | delete selected lines into a linewise register and enter insert  |
| `Esc`                                         | cancel selection and return normal                               |

## Settings

Add a `piVimMode` object to your Pi global settings or project `.pi/settings.json`.
Project settings override global settings field by field.

```json
{
  "piVimMode": {
    "startMode": "insert",
    "cursor": {
      "insert": "bar",
      "normal": "block",
      "visual": "block",
      "visualLine": "block"
    }
  }
}
```

### `piVimMode.startMode`

Supported values:

- `insert` (default)
- `normal`

Visual modes are not valid startup modes because they need a selection anchor. Invalid values fall back to `insert`.

### `piVimMode.cursor`

Supported cursor styles per mode:

- `block`
- `bar`
- `underline`

Invalid cursor styles fall back per mode, so one bad value does not discard the rest of the config.
Terminal cursor-shape escape support is best-effort; the editor also renders a mode-specific fake cursor where it can do so safely.

## Pi shortcut compatibility

Unknown control/non-printable keys delegate to Pi. In particular:

- `Enter` submits in all modes. Normal/visual/V-Line submit resets Vim transient state and returns to the configured startup mode for the next prompt.
- `Ctrl+C`, `Ctrl+D`, `Ctrl+G`, model/thinking shortcuts, and image paste stay Pi-owned unless explicitly implemented by this extension.
- Unmapped printable keys in normal/visual mode are ignored instead of inserted.

## Registers and undo

- One unnamed register is supported.
- Yank/delete/change update the register.
- Linewise `p` inserts below the current line; linewise `P` inserts above it.
- Charwise `p` inserts after the cursor; charwise `P` inserts before it.
- Empty register paste is a no-op.
- `u` delegates to Pi native undo. Pi's editor records programmatic text changes made through `setText()`.

## Feedback

The editor border/status area shows mode feedback:

- `INSERT`, `NORMAL`, `VISUAL`, and `V-LINE` at normal widths.
- `I`, `N`, `V`, and `VL` at narrow widths.
- Pending `d`/`c`/`y`/`g` and visual selection summaries show when space allows.
- Active visual selections are highlighted inline. Selected empty lines in V-Line mode show a highlighted blank cell when width permits.

## Limitations

- No block visual mode.
- No counts, text objects, search, ex commands, macros, marks, named registers, or system clipboard integration.
- Operator motions are limited to `w`, `b`, `0`, `^`, and `$`; no full Vim grammar.
- `%` supports matching `()`, `[]`, and `{}` pairs under or after the cursor on the current line.
- No full Neovim cursor option parity: blink timing and terminal-specific cursor negotiation are out of scope.
- Terminal cursor-shape hints are best-effort; unsupported terminals may show Pi's default cursor shape in some non-visual states.
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
4. Use `v`, select text, confirm inline highlight, then `y`, `d`, `x`, and `c`.
5. Use `V`, select lines, then `y`, `d`, `x`, and `c`.
6. Configure `piVimMode.startMode` and confirm a new editor starts in that mode.
7. Configure `piVimMode.cursor` and confirm cursor style changes by mode where the terminal supports it.
8. Submit from insert and normal modes.
9. Confirm next prompt returns to the configured startup mode.
10. Confirm normal-mode `Esc` can still interrupt/abort Pi.
