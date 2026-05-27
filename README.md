# pi-vimmode

Vim-style prompt editing for [Pi](https://github.com/earendil-works/pi-coding-agent).

`pi-vimmode` replaces Pi's main input editor with a `CustomEditor`-based modal editor. It targets practical prompt editing, not full Vim parity.

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

## Modes

- **INSERT**: default mode unless configured otherwise. Text entry, autocomplete, submit, newlines, image paste, external editor, and app shortcuts use Pi's default editor behavior.
- **NORMAL**: Vim command mode. Printable keys are interpreted as supported Vim commands or ignored.
- **VISUAL**: characterwise selection mode. Selected text is highlighted inline while selection operations use an extension-local unnamed register.
- **V-LINE**: linewise visual selection mode. Whole selected lines are highlighted and linewise operations use the unnamed line register.
- **V-BLOCK**: blockwise visual selection mode. Rectangular cells are highlighted and blockwise operations use newline-joined character registers.

### Escape behavior

- Insert + inactive autocomplete: `Esc` enters normal mode.
- Insert + active autocomplete: `Esc` delegates to Pi and remains insert mode.
- Normal: `Esc` delegates to Pi so interrupt/abort behavior still works.
- Visual / V-Line / V-Block: `Esc` cancels selection and returns to normal mode.

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
| `Ctrl-v`              | enter visual block mode                         |
| `x`                   | delete character under cursor                   |
| `dd` / `cc` / `yy`    | delete/change/yank current line                 |
| `D` / `C`             | delete/change from cursor through line end      |
| `Y`                   | yank current line into linewise register        |
| `d{motion}`           | delete by `w`, `b`, `0`, `^`, or `$`            |
| `c{motion}`           | change by `w`, `b`, `0`, `^`, or `$`            |
| `y{motion}`           | yank by `w`, `b`, `0`, `^`, or `$`              |
| `J`                   | join current line with next line                |
| `p` / `P`             | paste unnamed register after/before cursor/line |
| `q{a-z}`              | start recording an in-memory macro slot         |
| `q`                   | stop recording from normal mode                 |
| `@{a-z}`              | replay a recorded macro slot                    |
| `@@`                  | replay the last successfully played macro       |
| `u`                   | delegate to Pi native undo                      |

### Visual mode

| Key                                           | Behavior                                                 |
| --------------------------------------------- | -------------------------------------------------------- |
| `h` / `j` / `k` / `l` / `0` / `$` / `w` / `b` | extend characterwise selection                           |
| `V`                                           | switch to visual line mode without resetting the anchor  |
| `Ctrl-v`                                      | switch to visual block mode without resetting the anchor |
| `y`                                           | yank selection and return normal                         |
| `d` / `x`                                     | delete selection and return normal                       |
| `c`                                           | delete selection and enter insert                        |
| `Esc`                                         | cancel selection and return normal                       |

### Visual line mode

| Key                                           | Behavior                                                         |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `h` / `j` / `k` / `l` / `0` / `$` / `w` / `b` | extend the selected line range                                   |
| `v`                                           | switch to characterwise visual mode without resetting the anchor |
| `Ctrl-v`                                      | switch to visual block mode without resetting the anchor         |
| `y`                                           | yank selected lines into a linewise register and return normal   |
| `d` / `x`                                     | delete selected lines into a linewise register and return normal |
| `c`                                           | delete selected lines into a linewise register and enter insert  |
| `Esc`                                         | cancel selection and return normal                               |

### Visual block mode

| Key                                           | Behavior                                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `h` / `j` / `k` / `l` / `0` / `$` / `w` / `b` | extend the selected rectangular block                                                              |
| `v`                                           | switch to characterwise visual mode without resetting the anchor                                   |
| `V`                                           | switch to visual line mode without resetting the anchor                                            |
| `I`                                           | collect inserted text, then insert it before the block on each selected line when `Esc` is pressed |
| `A`                                           | collect inserted text, then insert it after the block on each selected line when `Esc` is pressed  |
| `y`                                           | yank selected block slices joined by newlines and return normal                                    |
| `d` / `x`                                     | delete selected block slices into a character register and return normal                           |
| `c`                                           | delete selected block slices into a character register and enter insert                            |
| `Esc`                                         | cancel selection and return normal                                                                 |

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
      "visualLine": "block",
      "visualBlock": "block"
    },
    "keymap": {
      "operators": {
        "delete": ["d"],
        "change": ["c"],
        "yank": ["y"]
      },
      "motions": {
        "left": ["h"],
        "down": ["j"],
        "up": ["k"],
        "right": ["l"],
        "wordForward": ["w"],
        "wordBackward": ["b"],
        "lineStart": ["0"],
        "lineEnd": ["$"],
        "firstNonBlank": ["^", "_"],
        "bufferStart": ["gg"],
        "bufferEnd": ["G"],
        "matchingPair": ["%"]
      },
      "commands": {
        "insertBefore": ["i"],
        "insertAfter": ["a"],
        "openLineBelow": ["o"],
        "openLineAbove": ["O"],
        "pasteAfter": ["p"],
        "pasteBefore": ["P"],
        "joinLine": ["J"],
        "undo": ["u"],
        "visualChar": ["v"],
        "visualLine": ["V"],
        "visualBlock": ["<C-v>"]
      },
      "macros": {
        "record": ["q"],
        "play": ["@"]
      },
      "operatorMotions": {
        "delete": ["wordForward", "wordBackward", "lineStart", "firstNonBlank", "lineEnd"],
        "change": ["wordForward", "wordBackward", "lineStart", "firstNonBlank", "lineEnd"],
        "yank": ["wordForward", "wordBackward", "lineStart", "firstNonBlank", "lineEnd"]
      }
    },
    "macros": {
      "enabled": true,
      "slots": [
        "a", "b", "c", "d", "e", "f", "g", "h",
        "i", "j", "k", "l", "m", "n", "o", "p",
        "q", "r", "s", "t", "u", "v", "w", "x",
        "y", "z"
      ],
      maxReplaySteps": 1000
    },
    "ui": {
      "status": {
        "enabled": true,
        "items": ["mode", "pendingOperator", "selection", "cursorPosition"]
      },
      "mode": {
        "enabled": true,
        "labels": {
          "insert": "INSERT",
          "normal": "NORMAL",
          "visual": "VISUAL",
          "visualLine": "V-LINE",
          "visualBlock": "V-BLOCK"
        },
        "narrowLabels": {
          "insert": "I",
          "normal": "N",
          "visual": "V",
          "visualLine": "VL",
          "visualBlock": "VB"
        }
      },
      "selection": {
        "enabled": true,
        "previewMaxChars": 16
      },
      "cursorPosition": {
        "enabled": false,
        "base": 1,
        "format": "{line}:{column}"
      }
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

### `piVimMode.keymap`

`keymap` maps printable key sequences to supported semantic actions. Invalid fields fall back per field, so one bad mapping does not discard the rest of the keymap.

Supported operator actions:

- `delete`
- `change`
- `yank`

Supported motion actions:

- `left`, `down`, `up`, `right`
- `wordForward`, `wordBackward`
- `lineStart`, `lineEnd`, `firstNonBlank`
- `bufferStart`, `bufferEnd`, `matchingPair`

Supported command actions:

- Insert/open: `insertBefore`, `insertAfter`, `insertLineStart`, `insertLineEnd`, `openLineBelow`, `openLineAbove`
- Visual: `visualChar`, `visualLine`, `visualBlock`

Use Vim/Neovim-style angle notation for modifier keys: `<C-v>` becomes `ctrl+v`, `<A-x>` becomes `alt+x`, and `<S-tab>` becomes `shift+tab`.

`Ctrl-v` always enters/switches visual block mode as a built-in shortcut. Add `commands.visualBlock` to make that binding explicit or provide additional bindings such as `B` / `<A-x>`.

- Edit: `deleteChar`, `deleteToLineEnd`, `changeToLineEnd`, `yankLine`, `joinLine`, `pasteAfter`, `pasteBefore`, `undo`

`operatorMotions` controls which range motions are valid after each operator. Valid operator motions are `wordForward`, `wordBackward`, `lineStart`, `firstNonBlank`, and `lineEnd`; motions such as `right`, `bufferStart`, or `matchingPair` remain normal/visual motions only because they do not yet have operator range semantics. Omitting a motion disables that operator-motion combination.

Multi-key sequences such as `gg` are supported through a finite matcher. Multi-key operators also work: if `delete` is mapped to `zz`, then `zzzz` deletes the current line and `zz{motion}` performs a delete operator-motion. There is no recursive mapping or timeout behavior.

Macro controls are configured under `keymap.macros`:

- `record`: normal-mode prefix keys for starting/stopping recording. Defaults to `q`.
- `play`: normal-mode prefix keys for playback/repeat. Defaults to `@`.

If you remap macro controls, use the configured record key to stop recording and the configured play key twice to repeat the last macro.

### `piVimMode.macros`

`macros` configures macro behavior:

- `enabled`: enable/disable all macro recording and playback. Defaults to `true`.
- `slots`: allowed lowercase `a-z` macro slots. Defaults to all lowercase letters.
- `maxReplaySteps`: maximum input tokens replayed from one macro invocation. Defaults to `1000`.

### `piVimMode.ui`

`ui` configures the Vim status area without changing editing behavior.

Supported status items:

- `mode`: current mode label
- `pendingOperator`: pending operator or key-sequence prefix such as `d…` or `g…`
- `selection`: visual selection summary and preview
- `cursorPosition`: line and column using `cursorPosition.format`

`mode.labels` and `mode.narrowLabels` customize mode names. `selection.previewMaxChars` controls selection preview width. `cursorPosition.base` supports `0` or `1`, and `cursorPosition.format` must include `{line}` and `{column}`.

The UI config is the single source of truth for status display. Vim/Neovim alias options such as `showmode`, `showcmd`, and `ruler` are not supported; configure `ui.status.items`, `ui.mode.enabled`, and `ui.cursorPosition.enabled` directly instead.

The extension does not execute or parse `.vimrc`, Vimscript, or Neovim Lua.

## Pi shortcut compatibility

Unknown control/non-printable keys delegate to Pi. In particular:

- `Enter` submits in all modes. Normal/visual/V-Line/V-Block submit resets Vim transient state and returns to the configured startup mode for the next prompt.
- `Ctrl+C`, `Ctrl+D`, `Ctrl+G`, model/thinking shortcuts, autocomplete controls, external-editor shortcuts, and image paste stay Pi-owned.
- Protected Pi shortcut names are rejected from `piVimMode.keymap` with a warning.
- Unmapped printable keys in normal/visual mode are ignored instead of inserted.

## Registers and undo

- One unnamed register is supported.
- Yank/delete/change update the register.
- Linewise `p` inserts below the current line; linewise `P` inserts above it.
- Charwise `p` inserts after the cursor; charwise `P` inserts before it.
- Empty register paste is a no-op.
- `u` delegates to Pi native undo. Pi's editor records programmatic text changes made through `setText()`.

## Macros

- `q{a-z}` starts recording an in-memory macro slot and replaces any previous macro in that slot by default.
- Normal-mode `q` stops the active recording by default. Insert-mode `q` inserts and records literal text.
- `@{a-z}` replays a recorded macro through the same Vim input path used for live input by default.
- `@@` repeats the last successfully played macro by default.
- Macro record/play keys, allowed slots, enabled state, and replay step cap are configurable.
- Macro slots are separate from the unnamed yank/delete register and are not full named registers.
- Pi-owned delegated shortcuts such as prompt submit/abort, autocomplete control, and playback commands are not recorded.
- Macro playback is non-recursive: playback commands inside replay are ignored.
- Macros are in-memory only and do not persist across sessions.

## Feedback

The editor border/status area shows configurable feedback:

- `INSERT`, `NORMAL`, `VISUAL`, and `V-LINE` at normal widths by default.
- `I`, `N`, `V`, and `VL` at narrow widths by default.
- Pending operators/key prefixes, active macro recording (`REC a`), and visual selection summaries show when enabled and space allows.
- Optional cursor position can show line and column, e.g. `12:4` or `L12:C4`.
- Active visual selections are highlighted inline. Selected empty lines in V-Line mode show a highlighted blank cell when width permits.

## Architecture

`VimEditor` is the Pi adapter shell. It owns `CustomEditor` integration, snapshots, effect application, rendering bridge, public cursor restoration, and best-effort terminal cursor writes.

Modal editing behavior lives under `src/modal/`:

- `engine.ts` owns mode transitions, finite semantic key dispatch, register updates, and supported Vim semantics.
- `types.ts` defines adapter-applied effects such as delegation, edits, macro replay, cursor restoration, invalidation, and terminal cursor hints.
- `view.ts` derives mode labels, status items, visual status text, and cursor position text without needing Pi TUI objects.

The parser in `src/commands.ts` and text transforms in `src/buffer.ts` remain pure helpers. Config maps keys to supported semantic actions; it does not add private Pi APIs or full Vim parity.

## Project docs

- `TODOS.md`: remaining follow-up work and completed architecture deepening notes.
- `docs/plans/`: historical implementation plans for the Vim editor work.
- `docs/solutions/`: reusable learnings for parser, buffer, lifecycle, and visual-mode bugs.
- `openspec/specs/`: durable OpenSpec requirements for supported Vim behavior.

## Limitations

- No counts, text objects, search, ex commands, marks, named registers, leader maps, recursive mappings, persistent macros, or system clipboard integration.
- Operator motions are limited to `wordForward`, `wordBackward`, `lineStart`, `firstNonBlank`, and `lineEnd`; no full Vim grammar.
- `%` supports matching `()`, `[]`, and `{}` pairs under or after the cursor on the current line.
- No `.vimrc`, Vimscript, or Neovim Lua parsing.
- No full Neovim cursor option parity: blink timing and terminal-specific cursor negotiation are out of scope.
- Terminal cursor-shape hints are best-effort; unsupported terminals may show Pi's default cursor shape in some non-visual states.
- Editing uses Pi's cursor coordinates, not full grapheme-cluster Vim semantics. Complex Unicode may not behave exactly like Vim.

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
4. Use `v`, select text, confirm inline highlight, then `y`, `d`, `x`, and `c`.
5. Use `V`, select lines, then `y`, `d`, `x`, and `c`.
6. Configure `piVimMode.startMode` and confirm a new editor starts in that mode.
7. Configure `piVimMode.cursor` and confirm cursor style changes by mode where the terminal supports it.
8. Submit from insert and normal modes.
9. Configure a custom `piVimMode.keymap` operator, motion, and UI status order, then confirm normal and visual mode use the custom mappings.
10. Confirm next prompt returns to the configured startup mode.
11. Record `qa`, type an insert/normal sequence, stop with normal-mode `q`, replay with `@a`, then repeat with `@@`.
12. Confirm normal-mode `Esc` can still interrupt/abort Pi.
