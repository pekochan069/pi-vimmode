# pi-vimmode settings reference

pi-vimmode reads one `piVimMode` object from Pi settings. This document lists every supported setting, default, accepted value, and effect.

Source of truth:

- Defaults and validation: `src/config.ts`
- Types: `src/types.ts`
- Runtime use: `src/lifecycle.ts`, `src/vim-editor.ts`, `src/modal/*`, `src/render.ts`

## Settings files and precedence

pi-vimmode loads settings from:

1. Global settings: `~/.pi/agent/settings.json`
2. Project settings: `.pi/settings.json` in the current project

Project settings apply after global settings. Objects merge field by field. Arrays replace that specific setting when valid. Invalid fields are ignored while valid sibling fields still apply.

Example:

```json
{
  "piVimMode": {
    "startMode": "normal",
    "cursor": {
      "insert": "bar",
      "normal": "block"
    }
  }
}
```

Warnings are non-fatal. When settings produce warnings, Pi status shows `pi-vimmode: vim ⚠`. Run `:vimdoctor` in normal mode to see the retained warning count and first actionable warning for the live editor. Run `:help settings` or `:features settings` for compact runtime reminders, but this file remains the complete settings reference.

Common warning causes:

- Invalid JSON in a settings file.
- `piVimMode` is not an object.
- Unsupported startup mode or cursor style.
- Unknown keymap action name.
- Protected Pi shortcut used in keymap.
- Unsupported operator motion.
- Duplicate or shadowed key bindings.
- Invalid UI/search/macro/mark/feedback field type.
- Legacy `piVimMode.vimOptions` present.

## Key sequence syntax

Keymap entries are arrays of key sequence strings.

Examples:

```json
{
  "piVimMode": {
    "keymap": {
      "motions": {
        "bufferStart": ["gg"]
      },
      "commands": {
        "incrementNumber": ["<C-a>", "ctrl+a"]
      }
    }
  }
}
```

Rules:

- Printable keys can be written directly: `"h"`, `"G"`, `"gg"`, `"$"`.
- Vim-style angle notation is supported:
  - `<C-v>` / `<Ctrl-v>` / `<Control-v>` -> `ctrl+v`
  - `<A-x>` / `<M-x>` / `<Alt-x>` / `<Meta-x>` -> `alt+x`
  - `<S-tab>` / `<Shift-tab>` -> `shift+tab`
  - `<D-x>` / `<Cmd-x>` / `<Super-x>` -> `super+x`
- Prefer lowercase normalized names such as `ctrl+a` for raw modifier strings.
- Empty arrays do not override existing/default bindings.
- Multi-key sequences are finite. There is no recursive mapping or timeout behavior.

Protected Pi shortcuts cannot be mapped:

| Key                                      | Preserved behavior                         |
| ---------------------------------------- | ------------------------------------------ |
| `enter`, `return`                        | Submit prompt / execute pending workbench. |
| `escape`, `esc`                          | Cancel or mode transition.                 |
| `tab`, `shift+tab`                       | Autocomplete navigation.                   |
| `shift+enter`                            | Pi newline/submit variant.                 |
| `ctrl+c`, `ctrl+g`                       | Interrupt/cancel and reset Vim state.      |
| `ctrl+d`                                 | Pi EOF/delete shortcut.                    |
| `ctrl+l`                                 | Pi terminal clear/redraw shortcut.         |
| `ctrl+p`, `shift+ctrl+p`, `ctrl+shift+p` | Pi command/model palette shortcuts.        |
| `ctrl+t`                                 | Pi external editor/tool shortcut.          |

Protected or unsupported keys are ignored with a warning that names the protected key and reason. Use `:mapcheck <key>` at runtime for current ownership and binding details. `ctrl+a`, `ctrl+x`, `ctrl+r`, `/`, and `?` are explicitly owned by pi-vimmode in normal mode for numeric adjustment, redo, and prompt search; insert mode still delegates them to Pi.

## Top-level settings

| Path                   | Default     | Accepted values                             | Effect                                                                                                                                                             |
| ---------------------- | ----------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `piVimMode`            | absent      | object                                      | Root config object. Missing object means all defaults. Non-object produces warning and defaults.                                                                   |
| `piVimMode.preset`     | absent      | `"minimal"`, `"prompt-safe"`, `"vim-heavy"` | Applies a curated baseline before explicit fields in the same settings object. Invalid values warn and are ignored.                                                |
| `piVimMode.startMode`  | `"insert"`  | `"insert"`, `"normal"`                      | Mode used for new editor instances and Vim reset paths that explicitly reset transient modal state. Visual modes are invalid because they need a selection anchor. |
| `piVimMode.vimOptions` | unsupported | none                                        | Legacy alias object. Ignored with warning: use `piVimMode.ui`.                                                                                                     |

### Presets

Presets are field-level baselines. Resolution order is defaults, global preset, global explicit fields, project preset, project explicit fields.

- `minimal`: quieter status, fewer inspectability extras, macro/mark features disabled by default.
- `prompt-safe`: conservative default-style baseline for Pi prompt editing.
- `vim-heavy`: starts in normal mode, enables visual-block keymap entry, and shows more status items.

Example explicit override:

```json
{
  "piVimMode": {
    "preset": "vim-heavy",
    "startMode": "insert",
    "keymap": { "commands": { "visualBlock": ["B"] } }
  }
}
```

Here `vim-heavy` supplies its baseline, then `startMode` and `visualBlock` override those fields.

## Cursor settings

Allowed cursor styles: `"block"`, `"bar"`, `"underline"`.

| Path                           | Default   | Effect                                                                                          |
| ------------------------------ | --------- | ----------------------------------------------------------------------------------------------- |
| `piVimMode.cursor.insert`      | `"bar"`   | Cursor style in insert mode. `bar` also enables Pi TUI hardware cursor visibility while active. |
| `piVimMode.cursor.normal`      | `"block"` | Cursor style in normal mode.                                                                    |
| `piVimMode.cursor.visual`      | `"block"` | Cursor style in visual character mode.                                                          |
| `piVimMode.cursor.visualLine`  | `"block"` | Cursor style in visual line mode.                                                               |
| `piVimMode.cursor.visualBlock` | `"block"` | Cursor style in visual block mode.                                                              |

Invalid cursor styles fall back per mode, so one bad value does not discard the rest of `cursor`.

Terminal cursor support is best effort. pi-vimmode writes DECSCUSR cursor-shape hints, but terminals can ignore them.

## Keymap settings

`piVimMode.keymap` maps key sequences to supported semantic actions. It does not add arbitrary Vim grammar.

### Operators

| Path                                | Default | Effect                                                                                         |
| ----------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `piVimMode.keymap.operators.delete` | `["d"]` | Prefix for delete operator. Doubled operator deletes line when same operator sequence repeats. |
| `piVimMode.keymap.operators.change` | `["c"]` | Prefix for change operator. Deletes range/line and enters insert.                              |
| `piVimMode.keymap.operators.yank`   | `["y"]` | Prefix for yank operator. Updates registers without changing text.                             |
| `piVimMode.keymap.operators.indent` | `[">"]` | Line-only shift operator. Doubled operator indents addressed line(s) by two spaces.            |
| `piVimMode.keymap.operators.dedent` | `["<"]` | Line-only shift operator. Doubled operator dedents addressed line(s).                          |

`indent` and `dedent` are line-only operators. In normal mode, repeat the operator sequence (`>>`, `<<`, or configured equivalents) and optional counts (`3>>`). In visual modes, one operator key shifts all touched lines; a count before the operator changes shift depth (`2>` indents selected lines by two levels). Arbitrary `>{motion}`, `<{motion}`, text-object, prompt-search, and mark-target shift ranges are unsupported safe no-ops.

### Motions

| Path                                     | Default      | Effect                                                                        |
| ---------------------------------------- | ------------ | ----------------------------------------------------------------------------- |
| `piVimMode.keymap.motions.left`          | `["h"]`      | Move left. Count repeats movement.                                            |
| `piVimMode.keymap.motions.down`          | `["j"]`      | Move down. Count repeats movement.                                            |
| `piVimMode.keymap.motions.up`            | `["k"]`      | Move up. Count repeats movement.                                              |
| `piVimMode.keymap.motions.right`         | `["l"]`      | Move right. Count repeats movement.                                           |
| `piVimMode.keymap.motions.wordForward`   | `["w"]`      | Move to next word.                                                            |
| `piVimMode.keymap.motions.wordBackward`  | `["b"]`      | Move to previous word.                                                        |
| `piVimMode.keymap.motions.wordEnd`       | `["e"]`      | Move to word end.                                                             |
| `piVimMode.keymap.motions.lineStart`     | `["0"]`      | Move to start of current line.                                                |
| `piVimMode.keymap.motions.lineEnd`       | `["$"]`      | Move to end of current line.                                                  |
| `piVimMode.keymap.motions.firstNonBlank` | `["^", "_"]` | Move to first non-blank character on current line.                            |
| `piVimMode.keymap.motions.bufferStart`   | `["gg"]`     | Move to prompt start.                                                         |
| `piVimMode.keymap.motions.bufferEnd`     | `["G"]`      | Move to prompt end.                                                           |
| `piVimMode.keymap.motions.matchingPair`  | `["%"]`      | Jump to matching `()`, `[]`, or `{}` pair under/after cursor on current line. |

### Commands

| Path                                                | Default      | Effect                                                                                                 |
| --------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| `piVimMode.keymap.commands.insertBefore`            | `["i"]`      | Enter insert mode at cursor.                                                                           |
| `piVimMode.keymap.commands.insertAfter`             | `["a"]`      | Move right, then enter insert.                                                                         |
| `piVimMode.keymap.commands.insertLineStart`         | `["I"]`      | Move to line start, then insert. In visual block mode, starts block insert before selected block.      |
| `piVimMode.keymap.commands.insertLineEnd`           | `["A"]`      | Move to line end, then insert. In visual block mode, starts block append after selected block.         |
| `piVimMode.keymap.commands.openLineBelow`           | `["o"]`      | Open blank line below and enter insert.                                                                |
| `piVimMode.keymap.commands.openLineAbove`           | `["O"]`      | Open blank line above and enter insert.                                                                |
| `piVimMode.keymap.commands.visualChar`              | `["v"]`      | Enter/switch visual character mode.                                                                    |
| `piVimMode.keymap.commands.visualLine`              | `["V"]`      | Enter/switch visual line mode.                                                                         |
| `piVimMode.keymap.commands.visualBlock`             | `[]`         | Additional bindings for visual block mode. Built-in `Ctrl-v` always enters/switches visual block mode. |
| `piVimMode.keymap.commands.deleteChar`              | `["x"]`      | Delete character under cursor. In visual modes, deletes selection.                                     |
| `piVimMode.keymap.commands.deleteToLineEnd`         | `["D"]`      | Delete from cursor through line end.                                                                   |
| `piVimMode.keymap.commands.changeToLineEnd`         | `["C"]`      | Delete from cursor through line end and enter insert.                                                  |
| `piVimMode.keymap.commands.yankLine`                | `["Y"]`      | Yank current line into linewise register.                                                              |
| `piVimMode.keymap.commands.joinLine`                | `["J"]`      | Join current line with next line.                                                                      |
| `piVimMode.keymap.commands.pasteAfter`              | `["p"]`      | Paste register after cursor or below current line. In visual line mode, replaces selected lines.       |
| `piVimMode.keymap.commands.pasteBefore`             | `["P"]`      | Paste register before cursor or above current line.                                                    |
| `piVimMode.keymap.commands.incrementNumber`         | `["ctrl+a"]` | Increment signed integer under or after cursor. Count changes delta.                                   |
| `piVimMode.keymap.commands.decrementNumber`         | `["ctrl+x"]` | Decrement signed integer under or after cursor. Count changes delta.                                   |
| `piVimMode.keymap.commands.toggleCase`              | `["~"]`      | Toggle case under cursor or visual selection. Count toggles current-line span.                         |
| `piVimMode.keymap.commands.replaceChar`             | `["r"]`      | Wait for one printable char, replace character(s) or visual selection.                                 |
| `piVimMode.keymap.commands.substituteChar`          | `["s"]`      | Delete character(s), then enter insert.                                                                |
| `piVimMode.keymap.commands.substituteLine`          | `["S"]`      | Change line(s), then enter insert.                                                                     |
| `piVimMode.keymap.commands.findCharForward`         | `["f"]`      | Wait for char and find it forward on current line.                                                     |
| `piVimMode.keymap.commands.findCharBackward`        | `["F"]`      | Wait for char and find it backward on current line.                                                    |
| `piVimMode.keymap.commands.tillCharForward`         | `["t"]`      | Wait for char and move before it on current line.                                                      |
| `piVimMode.keymap.commands.tillCharBackward`        | `["T"]`      | Wait for char and move after it on current line.                                                       |
| `piVimMode.keymap.commands.repeatCharSearch`        | `[";"]`      | Repeat last character search same direction.                                                           |
| `piVimMode.keymap.commands.repeatCharSearchReverse` | `[","]`      | Repeat last character search opposite direction.                                                       |
| `piVimMode.keymap.commands.startSearch`             | `["/"]`      | Start prompt-local forward search. Also works after operator as search motion.                         |
| `piVimMode.keymap.commands.startSearchBackward`     | `["?"]`      | Start prompt-local backward search. Also works after operator as search motion.                        |
| `piVimMode.keymap.commands.repeatSearch`            | `["n"]`      | Repeat last prompt search direction.                                                                   |
| `piVimMode.keymap.commands.repeatSearchReverse`     | `["N"]`      | Repeat prompt search opposite direction.                                                               |
| `piVimMode.keymap.commands.startExCommand`          | `[":"]`      | Open Ex command-line row. Count in normal mode pre-fills a line range.                                 |
| `piVimMode.keymap.commands.repeatChange`            | `["."]`      | Repeat last supported completed normal-mode change.                                                    |
| `piVimMode.keymap.commands.undo`                    | `["u"]`      | Delegate to Pi native undo.                                                                            |
| `piVimMode.keymap.commands.redo`                    | `["ctrl+r"]` | Redo the latest prompt text/cursor state undone by normal-mode undo.                                   |

### Macro keymap

| Path                             | Default | Effect                                                                             |
| -------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `piVimMode.keymap.macros.record` | `["q"]` | Prefix to start/stop macro recording. `q{slot}` starts; `q` stops while recording. |
| `piVimMode.keymap.macros.play`   | `["@"]` | Prefix to play macro. `@{slot}` plays; `@@` repeats last played macro.             |

### Mark keymap

| Path                               | Default | Effect                                                                               |
| ---------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| `piVimMode.keymap.marks.set`       | `["m"]` | Prefix to set local mark, e.g. `ma`.                                                 |
| `piVimMode.keymap.marks.jumpExact` | `["`"]` | Prefix for exact mark jump, e.g. `` `a ``. Works in normal/operator/visual contexts. |
| `piVimMode.keymap.marks.jumpLine`  | `["'"]` | Prefix for line mark jump, e.g. `'a`. Works in normal/operator/visual contexts.      |

### Text object keymap

Text object keys are only read after an operator and a text-object kind key. Defaults preserve Vim-style `iw`, `aw`, plus prompt-native objects.

| Path                                                  | Default      | Effect                                               |
| ----------------------------------------------------- | ------------ | ---------------------------------------------------- |
| `piVimMode.keymap.textObjects.kinds.inner`            | `["i"]`      | Kind key for inner text objects, e.g. `diw`, `cif`.  |
| `piVimMode.keymap.textObjects.kinds.around`           | `["a"]`      | Kind key for around text objects, e.g. `daw`, `yaf`. |
| `piVimMode.keymap.textObjects.targets.word`           | `["w"]`      | Word text object target.                             |
| `piVimMode.keymap.textObjects.targets.singleQuote`    | `["'"]`      | Single-quoted string target.                         |
| `piVimMode.keymap.textObjects.targets.doubleQuote`    | `["\""]`     | Double-quoted string target.                         |
| `piVimMode.keymap.textObjects.targets.paren`          | `["(", ")"]` | Parenthesized target.                                |
| `piVimMode.keymap.textObjects.targets.bracket`        | `["[", "]"]` | Bracketed target.                                    |
| `piVimMode.keymap.textObjects.targets.brace`          | `["{", "}"]` | Braced target.                                       |
| `piVimMode.keymap.textObjects.targets.codeFence`      | `["f"]`      | Markdown code fence target.                          |
| `piVimMode.keymap.textObjects.targets.headingSection` | `["h"]`      | Markdown heading section target.                     |
| `piVimMode.keymap.textObjects.targets.listItem`       | `["l"]`      | Markdown list item target.                           |
| `piVimMode.keymap.textObjects.targets.tag`            | `["t"]`      | XML-ish tag block target.                            |
| `piVimMode.keymap.textObjects.targets.errorBlock`     | `["e"]`      | Pasted error/stack-trace block target.               |

Example:

```json
{
  "piVimMode": {
    "keymap": {
      "textObjects": {
        "kinds": { "inner": ["I"], "around": ["A"] },
        "targets": { "codeFence": ["F"], "tag": ["X"] }
      }
    }
  }
}
```

### Operator motion allow-list

These settings decide which semantic motions are valid after each operator. Accepted motion action names:

```text
wordForward, wordBackward, wordEnd, lineStart, firstNonBlank, lineEnd
```

| Path                                      | Default                                                                               | Effect                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `piVimMode.keymap.operatorMotions.delete` | `['wordForward', 'wordBackward', 'wordEnd', 'lineStart', 'firstNonBlank', 'lineEnd']` | Motions allowed after delete operator. Remove entries to disable combinations. |
| `piVimMode.keymap.operatorMotions.change` | `['wordForward', 'wordBackward', 'wordEnd', 'lineStart', 'firstNonBlank', 'lineEnd']` | Motions allowed after change operator.                                         |
| `piVimMode.keymap.operatorMotions.yank`   | `['wordForward', 'wordBackward', 'wordEnd', 'lineStart', 'firstNonBlank', 'lineEnd']` | Motions allowed after yank operator.                                           |

Motions such as `right`, `bufferStart`, and `matchingPair` are valid normal/visual motions but invalid operator motions until range semantics exist. `operatorMotions` applies only to motion-capable `delete`, `change`, and `yank`; `operatorMotions.indent` and `operatorMotions.dedent` are rejected with warnings because shift operators are line-only.

### Keymap validation

Example shift operator remap:

```json
{
  "piVimMode": {
    "keymap": {
      "operators": {
        "indent": ["]"],
        "dedent": ["["]
      }
    }
  }
}
```

With this config, `]]` indents the current line in normal mode, `[[` dedents it, and visual `]` / `[` shifts selected lines.

- Unknown action names warn and are ignored.
- Each binding value must be an array of strings.
- Protected shortcuts are ignored with warnings.
- Duplicate bindings inside a group warn.
- Duplicate bindings across the resolved keymap warn.
- A shorter binding shadowed by a longer binding prefix warns, e.g. `g` and `gg`.

## Macro behavior settings

| Path                              | Default             | Accepted values                          | Effect                                                                                       |
| --------------------------------- | ------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `piVimMode.macros.enabled`        | `true`              | boolean                                  | Enables/disables macro recording and playback. When false, macro keymap controls do nothing. |
| `piVimMode.macros.slots`          | all lowercase `a-z` | array of lowercase single-letter strings | Allowed macro slots. Invalid slots warn; duplicates are deduplicated.                        |
| `piVimMode.macros.maxReplaySteps` | `1000`              | positive integer                         | Maximum input tokens replayed by one macro invocation. Prevents runaway replay.              |

Macros are in-memory only. They do not persist across sessions.

## Mark behavior settings

| Path                      | Default             | Accepted values                          | Effect                                                                     |
| ------------------------- | ------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| `piVimMode.marks.enabled` | `true`              | boolean                                  | Enables/disables all mark set and jump controls.                           |
| `piVimMode.marks.slots`   | all lowercase `a-z` | array of lowercase single-letter strings | Allowed local mark slots. Invalid slots warn; duplicates are deduplicated. |

Marks are in-memory only. They do not persist across sessions.

## Search settings

These settings control search highlighting, not search motion semantics.

| Path                                | Default | Accepted values      | Effect                                                                                                |
| ----------------------------------- | ------- | -------------------- | ----------------------------------------------------------------------------------------------------- |
| `piVimMode.search.highlight`        | `true`  | boolean              | Enables visible highlights after successful `/`, `n`, or `N`. Search movement still works when false. |
| `piVimMode.search.highlightCurrent` | `true`  | boolean              | Uses distinct style for current match.                                                                |
| `piVimMode.search.clearOnCancel`    | `true`  | boolean              | Clears visible highlights when pending `/` search is cancelled with `Esc`.                            |
| `piVimMode.search.clearOnInsert`    | `true`  | boolean              | Clears visible highlights when entering insert mode. Does not erase repeat-search state.              |
| `piVimMode.search.maxHighlights`    | `200`   | non-negative integer | Maximum non-current match ranges rendered. `0` disables non-current ranges.                           |

Search is literal by default and prompt-local. `?` starts backward search, empty `/` or `?` recalls the previous successful query, and `Up` / `Down` navigate in-memory history while a search is pending. Prefix a pending query with `\r` for bounded regex search. Vim highlight groups, offsets, and cross-prompt history are not supported. `:noh` / `:nohlsearch` clear current prompt search highlights without changing text or registers.

## Feedback settings

Optional feedback keeps default modal editing quiet while helping users understand confusing no-ops.

| Path                      | Default | Accepted values     | Effect                                                                                                           |
| ------------------------- | ------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `piVimMode.feedback.noop` | `"off"` | `"off"`, `"status"` | `"status"` shows one transient info row for selected no-ops such as unmapped normal keys or protected shortcuts. |

Invalid feedback values warn and fall back to `"off"` without discarding valid sibling settings.

Example:

```json
{
  "piVimMode": {
    "feedback": { "noop": "status" }
  }
}
```

## Prompt-native structure settings

These settings enable/disable prompt-native structure text objects after parsing. Disabled structures become safe no-ops; classic word/quote/bracket text objects still work.

| Path                                                | Default | Effect                                 |
| --------------------------------------------------- | ------- | -------------------------------------- |
| `piVimMode.promptStructures.enabled`                | `true`  | Enables all prompt-native structures.  |
| `piVimMode.promptStructures.targets.codeFence`      | `true`  | Enables code fence text object target. |
| `piVimMode.promptStructures.targets.headingSection` | `true`  | Enables heading section target.        |
| `piVimMode.promptStructures.targets.listItem`       | `true`  | Enables list item target.              |
| `piVimMode.promptStructures.targets.tag`            | `true`  | Enables XML-ish tag target.            |
| `piVimMode.promptStructures.targets.errorBlock`     | `true`  | Enables pasted error block target.     |

## Prompt transform settings

These settings enable/disable finite prompt transform Ex commands and configure command names.

| Path                                           | Default     | Effect                                 |
| ---------------------------------------------- | ----------- | -------------------------------------- |
| `piVimMode.promptTransforms.enabled`           | `true`      | Enables all prompt transform commands. |
| `piVimMode.promptTransforms.actions.quote`     | `true`      | Enables quote transform.               |
| `piVimMode.promptTransforms.actions.unquote`   | `true`      | Enables unquote transform.             |
| `piVimMode.promptTransforms.actions.bulletize` | `true`      | Enables bulletize transform.           |
| `piVimMode.promptTransforms.actions.fence`     | `true`      | Enables fence transform.               |
| `piVimMode.promptTransforms.actions.indent`    | `true`      | Enables indent transform.              |
| `piVimMode.promptTransforms.actions.dedent`    | `true`      | Enables dedent transform.              |
| `piVimMode.promptTransforms.actions.reflow`    | `true`      | Enables reflow transform.              |
| `piVimMode.promptTransforms.commands.quote`    | `["quote"]` | Ex command names that run quote.       |
| `piVimMode.promptTransforms.commands.fence`    | `["fence"]` | Ex command names that run fence.       |

Command-name arrays exist for every transform action: `quote`, `unquote`, `bulletize`, `fence`, `indent`, `dedent`, `reflow`.

Example:

```json
{
  "piVimMode": {
    "promptStructures": { "targets": { "tag": false } },
    "promptTransforms": {
      "actions": { "reflow": false },
      "commands": { "quote": ["qte"], "fence": ["wrap"] }
    }
  }
}
```

## UI settings

`piVimMode.ui` is the only supported status/UI config surface. Vim/Neovim aliases such as `showmode`, `showcmd`, and `ruler` are not supported.

### Status

| Path                          | Default                                                      | Accepted values                                                   | Effect                                                                |
| ----------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| `piVimMode.ui.status.enabled` | `true`                                                       | boolean                                                           | Enables/disables all status text in the editor border.                |
| `piVimMode.ui.status.items`   | `["mode", "pendingOperator", "selection", "cursorPosition"]` | array of `mode`, `pendingOperator`, `selection`, `cursorPosition` | Ordered status items to render. Empty/invalid arrays do not override. |

Status item meanings:

| Item              | Shows                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mode`            | Mode label when enabled. Active macro recording shows `REC {slot}` whenever status is enabled, next to mode when present and prepended otherwise. |
| `pendingOperator` | Pending prefixes with an ellipsis, such as `d…`, `g…`, `/query…`, `m…`, or `:command…`.                                                           |
| `selection`       | Visual selection summary and preview when enabled.                                                                                                |
| `cursorPosition`  | Cursor position when `ui.cursorPosition.enabled` is true.                                                                                         |

### Mode labels

| Path                                         | Default     | Accepted values  | Effect                                                     |
| -------------------------------------------- | ----------- | ---------------- | ---------------------------------------------------------- |
| `piVimMode.ui.mode.enabled`                  | `true`      | boolean          | Shows/hides mode label when `mode` status item is present. |
| `piVimMode.ui.mode.labels.insert`            | `"INSERT"`  | non-empty string | Full-width insert label.                                   |
| `piVimMode.ui.mode.labels.normal`            | `"NORMAL"`  | non-empty string | Full-width normal label.                                   |
| `piVimMode.ui.mode.labels.visual`            | `"VISUAL"`  | non-empty string | Full-width visual char label.                              |
| `piVimMode.ui.mode.labels.visualLine`        | `"V-LINE"`  | non-empty string | Full-width visual line label.                              |
| `piVimMode.ui.mode.labels.visualBlock`       | `"V-BLOCK"` | non-empty string | Full-width visual block label.                             |
| `piVimMode.ui.mode.narrowLabels.insert`      | `"I"`       | non-empty string | Narrow insert label.                                       |
| `piVimMode.ui.mode.narrowLabels.normal`      | `"N"`       | non-empty string | Narrow normal label.                                       |
| `piVimMode.ui.mode.narrowLabels.visual`      | `"V"`       | non-empty string | Narrow visual char label.                                  |
| `piVimMode.ui.mode.narrowLabels.visualLine`  | `"VL"`      | non-empty string | Narrow visual line label.                                  |
| `piVimMode.ui.mode.narrowLabels.visualBlock` | `"VB"`      | non-empty string | Narrow visual block label.                                 |

Narrow labels are used when the prompt width is too small for the full label.

### Selection status

| Path                                     | Default | Accepted values      | Effect                                                                                               |
| ---------------------------------------- | ------- | -------------------- | ---------------------------------------------------------------------------------------------------- |
| `piVimMode.ui.selection.enabled`         | `true`  | boolean              | Shows/hides visual selection summary and preview in status. Does not affect inline visual highlight. |
| `piVimMode.ui.selection.previewMaxChars` | `16`    | non-negative integer | Max visible characters in status selection preview before truncation.                                |

### Cursor position status

| Path                                  | Default             | Accepted values                                | Effect                                                                                            |
| ------------------------------------- | ------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `piVimMode.ui.cursorPosition.enabled` | `true`              | boolean                                        | Enables cursor position status when `cursorPosition` item is present.                             |
| `piVimMode.ui.cursorPosition.base`    | `1`                 | `0` or `1`                                     | Display base for line and column. `1` matches common editor UI; `0` matches internal coordinates. |
| `piVimMode.ui.cursorPosition.format`  | `"{line}:{column}"` | string containing both `{line}` and `{column}` | Format template for cursor position. Both placeholders are required.                              |

Example cursor formats:

```json
{
  "format": "{line}:{column}"
}
```

```json
{
  "format": "L{line}:C{column}"
}
```

## Full default reference

This is the resolved default shape. Comments are not valid JSON; this block omits comments so it can be copied.

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
        "wordEnd": ["e"],
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
        "insertLineStart": ["I"],
        "insertLineEnd": ["A"],
        "openLineBelow": ["o"],
        "openLineAbove": ["O"],
        "visualChar": ["v"],
        "visualLine": ["V"],
        "visualBlock": [],
        "deleteChar": ["x"],
        "deleteToLineEnd": ["D"],
        "changeToLineEnd": ["C"],
        "yankLine": ["Y"],
        "joinLine": ["J"],
        "pasteAfter": ["p"],
        "pasteBefore": ["P"],
        "incrementNumber": ["ctrl+a"],
        "decrementNumber": ["ctrl+x"],
        "toggleCase": ["~"],
        "replaceChar": ["r"],
        "substituteChar": ["s"],
        "substituteLine": ["S"],
        "findCharForward": ["f"],
        "findCharBackward": ["F"],
        "tillCharForward": ["t"],
        "tillCharBackward": ["T"],
        "repeatCharSearch": [";"],
        "repeatCharSearchReverse": [","],
        "startSearch": ["/"],
        "startSearchBackward": ["?"],
        "repeatSearch": ["n"],
        "repeatSearchReverse": ["N"],
        "startExCommand": [":"],
        "repeatChange": ["."],
        "undo": ["u"],
        "redo": ["ctrl+r"]
      },
      "macros": {
        "record": ["q"],
        "play": ["@"]
      },
      "marks": {
        "set": ["m"],
        "jumpExact": ["`"],
        "jumpLine": ["'"]
      },
      "operatorMotions": {
        "delete": [
          "wordForward",
          "wordBackward",
          "wordEnd",
          "lineStart",
          "firstNonBlank",
          "lineEnd"
        ],
        "change": [
          "wordForward",
          "wordBackward",
          "wordEnd",
          "lineStart",
          "firstNonBlank",
          "lineEnd"
        ],
        "yank": ["wordForward", "wordBackward", "wordEnd", "lineStart", "firstNonBlank", "lineEnd"]
      }
    },
    "macros": {
      "enabled": true,
      "slots": [
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
        "k",
        "l",
        "m",
        "n",
        "o",
        "p",
        "q",
        "r",
        "s",
        "t",
        "u",
        "v",
        "w",
        "x",
        "y",
        "z"
      ],
      "maxReplaySteps": 1000
    },
    "marks": {
      "enabled": true,
      "slots": [
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
        "k",
        "l",
        "m",
        "n",
        "o",
        "p",
        "q",
        "r",
        "s",
        "t",
        "u",
        "v",
        "w",
        "x",
        "y",
        "z"
      ]
    },
    "search": {
      "highlight": true,
      "highlightCurrent": true,
      "clearOnCancel": true,
      "clearOnInsert": true,
      "maxHighlights": 200
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
        "enabled": true,
        "base": 1,
        "format": "{line}:{column}"
      }
    }
  }
}
```

## Practical examples

### Minimal normal-mode startup

```json
{
  "piVimMode": {
    "startMode": "normal"
  }
}
```

### Project override for one cursor style

Global settings can keep broad defaults. Project settings can override one field:

```json
{
  "piVimMode": {
    "cursor": {
      "insert": "underline"
    }
  }
}
```

### Add visual block binding without losing built-in Ctrl-v

```json
{
  "piVimMode": {
    "keymap": {
      "commands": {
        "visualBlock": ["B", "<A-v>"]
      }
    }
  }
}
```

Built-in `Ctrl-v` still works.

### Remap operator and motion

```json
{
  "piVimMode": {
    "keymap": {
      "operators": {
        "delete": ["z"]
      },
      "motions": {
        "wordForward": ["W"]
      }
    }
  }
}
```

With this config, `zz` deletes a line and `zW` deletes by the configured `wordForward` motion.

### Disable one operator-motion combination

```json
{
  "piVimMode": {
    "keymap": {
      "operatorMotions": {
        "delete": ["wordForward", "lineEnd"],
        "change": [
          "wordForward",
          "wordBackward",
          "wordEnd",
          "lineStart",
          "firstNonBlank",
          "lineEnd"
        ],
        "yank": ["wordForward", "wordBackward", "wordEnd", "lineStart", "firstNonBlank", "lineEnd"]
      }
    }
  }
}
```

Now delete only accepts `d{wordForward}` and `d{lineEnd}` among finite operator motions.

### Status with cursor position

```json
{
  "piVimMode": {
    "ui": {
      "status": {
        "enabled": true,
        "items": ["mode", "pendingOperator", "selection", "cursorPosition"]
      },
      "cursorPosition": {
        "enabled": true,
        "base": 1,
        "format": "L{line}:C{column}"
      }
    }
  }
}
```

### Custom mode labels

```json
{
  "piVimMode": {
    "ui": {
      "mode": {
        "labels": {
          "normal": "COMMAND",
          "insert": "TYPE"
        },
        "narrowLabels": {
          "normal": "C",
          "insert": "T"
        }
      }
    }
  }
}
```

### Search highlight tuning

```json
{
  "piVimMode": {
    "search": {
      "highlight": true,
      "highlightCurrent": true,
      "clearOnCancel": true,
      "clearOnInsert": false,
      "maxHighlights": 50
    }
  }
}
```

### Disable macros

```json
{
  "piVimMode": {
    "macros": {
      "enabled": false
    }
  }
}
```

### Restrict macro and mark slots

```json
{
  "piVimMode": {
    "macros": {
      "slots": ["a", "b", "c"],
      "maxReplaySteps": 100
    },
    "marks": {
      "slots": ["a", "b", "c"]
    }
  }
}
```

## Troubleshooting

### Status shows `vim ⚠`

`vim ⚠` is currently a summary-only status indicator; pi-vimmode does not expose the exact warning text in the prompt UI. To isolate the failing setting, check project settings first, then global settings:

1. Review `.pi/settings.json` in the current project.
2. Review `~/.pi/agent/settings.json` for global `piVimMode` values.
3. Temporarily remove or narrow one `piVimMode` block at a time and start a new Pi session.

Common fixes:

- Ensure JSON is valid.
- Ensure `piVimMode` is an object.
- Use `"normal"` or `"insert"` for `startMode`.
- Use `"block"`, `"bar"`, or `"underline"` for cursor styles.
- Use action names exactly as documented.
- Do not map protected Pi shortcuts.
- Use `piVimMode.ui`, not `piVimMode.vimOptions`.

### Binding does nothing

Possible causes:

- Binding targets unsupported action name.
- Binding uses protected key.
- Binding is shadowed by longer prefix.
- Operator motion is not in `operatorMotions` allow-list.
- Feature has built-in special handling, e.g. visual block `Ctrl-v`.

### Cursor style does not change

Cursor shape hints are terminal-dependent. `bar` cursor additionally needs Pi TUI hardware cursor visibility, which pi-vimmode manages when the API is available. Some terminals still ignore shape escapes.
