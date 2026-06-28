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
- Invalid `piVimMode.ui.workbench.reservedRows` value outside `0` through `5`.
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
- Empty arrays do not override existing/default bindings for classic keymap groups. In `piVimMode.keymap.actions`, an empty array unbinds that action in the current settings scope.
- `piVimMode.keymap.escape` defaults to `[]` and replaces the inherited escape alias list when set.
- Escape aliases are key aliases such as `<D-j>` or `<C-j>`, not raw text chords such as `jk` or `jj`.

Protected Pi shortcuts cannot be mapped:

| Key                                      | Preserved behavior                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `enter`, `return`                        | Submit prompt / execute pending workbench.                                          |
| `escape`, `esc`                          | Cancel or mode transition.                                                          |
| `tab`, `shift+tab`                       | Autocomplete navigation.                                                            |
| `shift+enter`                            | Pi newline/submit variant.                                                          |
| `ctrl+c`, `ctrl+g`                       | Interrupt/cancel and reset Vim state.                                               |
| `ctrl+d`                                 | Vim half-page down in normal/visual modes; Pi EOF/delete remains insert-mode owned. |
| `ctrl+u`                                 | Vim half-page up in normal/visual modes; insert mode remains Pi-owned.              |
| `ctrl+l`                                 | Pi terminal clear/redraw shortcut.                                                  |
| `ctrl+p`, `shift+ctrl+p`, `ctrl+shift+p` | Pi command/model palette shortcuts.                                                 |
| `ctrl+t`                                 | Pi external editor/tool shortcut.                                                   |

Protected or unsupported keys are ignored with a warning that names the protected key and reason. Use `:mapcheck <key>` at runtime for current ownership and binding details. `ctrl+a`, `ctrl+x`, `ctrl+r`, `ctrl+d`, `ctrl+u`, `/`, and `?` are explicitly owned by pi-vimmode in normal mode for numeric adjustment, redo, half-page scroll, and prompt search; insert mode still delegates them to Pi.

Protected keys can be overridden by listing them in `piVimMode.keymap.allowProtectedOverrides` within the same settings layer. See the allow-list section below.

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
- `vim-heavy`: starts in normal mode, keeps visual block unbound so Pi paste shortcuts remain owned by Pi, and shows more status items.

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

### Escape aliases

| Path                      | Default | Effect                                                                                                                       |
| ------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `piVimMode.keymap.escape` | `[]`    | Optional key aliases for leaving insert mode, visual modes, and pending Ex commands, for example `["<D-j>"]` or `["<C-j>"]`. |

Configured escape aliases act like physical `Esc` while insert mode is active and Pi autocomplete is closed, while visual/visual-line/visual-block mode is active, or while a `:` Ex command-line is pending. Example:

```json
{
  "piVimMode": {
    "keymap": {
      "escape": ["<D-j>", "<C-j>"]
    }
  }
}
```

Rules:

- Valid modified-key aliases such as `"<D-j>"`, `"<C-j>"`, or `"<A-j>"` leave insert mode, cancel visual mode, or cancel a pending Ex command without inserting text.
- Raw printable text chords such as `"jk"`, `"jj"`, and `"j"` are rejected so normal typing stays normal.
- Plain Ctrl-J often arrives from terminals as `enter`; it only works as `ctrl+j` when the terminal/input layer sends distinct enhanced keyboard input.
- When autocomplete is open, aliases delegate to Pi and do not close autocomplete or enter normal mode.
- Protected shortcuts such as `enter`, `tab`, `ctrl+c`, and `escape` are rejected.
- These are not Vim mappings: no runtime `:map`, recursive mappings, insert abbreviations, `.vimrc`, Vimscript, or `timeoutlen`.

### Insert mode newline, edit, and movement bindings

| Path                                         | Default | Effect                                                                                                                    |
| -------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `piVimMode.keymap.insert.openLineBelow`      | `[]`    | Insert a blank line below the current line and stay in insert mode. Accepts only modified or protected single-key chords. |
| `piVimMode.keymap.insert.openLineAbove`      | `[]`    | Insert a blank line above the current line and stay in insert mode. Accepts only modified or protected single-key chords. |
| `piVimMode.keymap.insert.deleteWordBackward` | `[]`    | Delete backward to the previous small-word start in insert mode.                                                          |
| `piVimMode.keymap.insert.deleteWordForward`  | `[]`    | Delete forward to the next small-word start in insert mode.                                                               |
| `piVimMode.keymap.insert.deleteLineBackward` | `[]`    | Delete backward to current line start without joining the previous line.                                                  |
| `piVimMode.keymap.insert.deleteLineForward`  | `[]`    | Delete forward to current line end. At EOL, delete exactly one newline without trimming spaces.                           |
| `piVimMode.keymap.insert.moveWordBackward`   | `[]`    | Move backward to the previous small-word start in insert mode.                                                            |
| `piVimMode.keymap.insert.moveWordForward`    | `[]`    | Move forward to the next small-word start in insert mode.                                                                 |
| `piVimMode.keymap.insert.moveLineStart`      | `[]`    | Move to current line start in insert mode.                                                                                |
| `piVimMode.keymap.insert.moveLineEnd`        | `[]`    | Move to current line end in insert mode.                                                                                  |

Example:

```json
{
  "piVimMode": {
    "keymap": {
      "insert": {
        "openLineBelow": ["ctrl+j"],
        "openLineAbove": ["super+k"],
        "deleteWordBackward": ["ctrl+w"],
        "deleteLineBackward": ["ctrl+u"],
        "deleteLineForward": ["ctrl+k"],
        "moveWordBackward": ["alt+b"],
        "moveWordForward": ["alt+f"],
        "moveLineStart": ["ctrl+a"],
        "moveLineEnd": ["ctrl+e"]
      }
    }
  }
}
```

Rules:

- Only modified or protected single-key chords are accepted. Raw printable text such as `"j"` or `"oo"` is rejected so normal typing stays normal.
- Protected keys such as `"enter"` require same-layer `piVimMode.keymap.allowProtectedOverrides` before they are accepted.
- Insert bindings only work in insert mode when Pi autocomplete is inactive. Normal and visual modes use the existing `openLineBelow` / `openLineAbove` commands under `piVimMode.keymap.commands`.
- Insert delete bindings do not write Vim registers, marks, visual state, macro slots, or dot-repeat state.
- Insert movement bindings preserve prompt text, search highlights, and registers.
- Insert word movement and deletion reuse pi-vimmode lowercase small-word semantics where keyword runs, punctuation runs, and whitespace are separate groups.
- `piVimMode.keymap.insert` owns only physical insert edits and movement. Semantic prompt transforms remain under `piVimMode.keymap.actions`.
- Autocomplete-active input keeps Pi ownership and does not run insert bindings.
- These are opt-in: with no `piVimMode.keymap.insert` config, every insert-mode key delegates to Pi default behavior.

### Operators

| Path                                    | Default  | Effect                                                                                               |
| --------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `piVimMode.keymap.operators.delete`     | `["d"]`  | Prefix for delete operator. Doubled operator deletes line when same operator sequence repeats.       |
| `piVimMode.keymap.operators.change`     | `["c"]`  | Prefix for change operator. Deletes range/line and enters insert.                                    |
| `piVimMode.keymap.operators.yank`       | `["y"]`  | Prefix for yank operator. Updates registers without changing text.                                   |
| `piVimMode.keymap.operators.lowercase`  | `["gu"]` | Prefix for lowercase operator. Supports finite motions, text objects, and doubled line form.         |
| `piVimMode.keymap.operators.uppercase`  | `["gU"]` | Prefix for uppercase operator. Supports finite motions, text objects, and doubled line form.         |
| `piVimMode.keymap.operators.toggleCase` | `["g~"]` | Prefix for range toggle-case operator. Supports finite motions, text objects, and doubled line form. |
| `piVimMode.keymap.operators.indent`     | `[">"]`  | Line-only shift operator. Doubled operator indents addressed line(s) by two spaces.                  |
| `piVimMode.keymap.operators.dedent`     | `["<"]`  | Line-only shift operator. Doubled operator dedents addressed line(s).                                |

`lowercase`, `uppercase`, and `toggleCase` do not write registers and do not enter insert mode. Their doubled line forms are `gugu`, `gUgU`, and `g~g~` by default; configured equivalents repeat the configured operator sequence. Mark, prompt-search, and character-search targets are unsupported safe no-ops for case operators.

`indent` and `dedent` are line-only operators. In normal mode, repeat the operator sequence (`>>`, `<<`, or configured equivalents) and optional counts (`3>>`). In visual modes, one operator key shifts all touched lines; a count before the operator changes shift depth (`2>` indents selected lines by two levels). Arbitrary `>{motion}`, `<{motion}`, text-object, prompt-search, and mark-target shift ranges are unsupported safe no-ops.

### Motions

| Path                                          | Default          | Effect                                                                                                      |
| --------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `piVimMode.keymap.motions.left`               | `["h", "left"]`  | Move left. Arrow key `Left` alias included. Count repeats movement.                                         |
| `piVimMode.keymap.motions.down`               | `["j", "down"]`  | Move down. Arrow key `Down` alias included. Count repeats movement.                                         |
| `piVimMode.keymap.motions.up`                 | `["k", "up"]`    | Move up. Arrow key `Up` alias included. Count repeats movement.                                             |
| `piVimMode.keymap.motions.right`              | `["l", "right"]` | Move right. Arrow key `Right` alias included. Count repeats movement.                                       |
| `piVimMode.keymap.motions.wordForward`        | `["w"]`          | Move to next word.                                                                                          |
| `piVimMode.keymap.motions.wordBackward`       | `["b"]`          | Move to previous word.                                                                                      |
| `piVimMode.keymap.motions.wordEnd`            | `["e"]`          | Move to word end.                                                                                           |
| `piVimMode.keymap.motions.wordForwardBig`     | `["W"]`          | Move to next whitespace-delimited WORD.                                                                     |
| `piVimMode.keymap.motions.wordBackwardBig`    | `["B"]`          | Move to previous whitespace-delimited WORD.                                                                 |
| `piVimMode.keymap.motions.wordEndBig`         | `["E"]`          | Move to end of current or next whitespace-delimited WORD.                                                   |
| `piVimMode.keymap.motions.wordPreviousEnd`    | `["ge"]`         | Move to previous word end.                                                                                  |
| `piVimMode.keymap.motions.wordPreviousEndBig` | `["gE"]`         | Move to previous whitespace-delimited WORD end.                                                             |
| `piVimMode.keymap.motions.lineStart`          | `["0"]`          | Move to start of current line.                                                                              |
| `piVimMode.keymap.motions.lineEnd`            | `["$"]`          | Move to end of current line.                                                                                |
| `piVimMode.keymap.motions.firstNonBlank`      | `["^", "_"]`     | Move to first non-blank character on current line.                                                          |
| `piVimMode.keymap.motions.bufferStart`        | `["gg"]`         | Move to prompt start.                                                                                       |
| `piVimMode.keymap.motions.bufferEnd`          | `["G"]`          | Move to prompt end.                                                                                         |
| `piVimMode.keymap.motions.matchingPair`       | `["%"]`          | Jump to matching `()`, `[]`, or `{}` pair under/after cursor on current line.                               |
| `piVimMode.keymap.motions.halfPageDown`       | `["ctrl+d"]`     | Move down by half the visible prompt page; count multiplies the distance.                                   |
| `piVimMode.keymap.motions.halfPageUp`         | `["ctrl+u"]`     | Move up by half the visible prompt page; count multiplies the distance.                                     |
| `piVimMode.keymap.motions.paragraphBackward`  | `["{"]`          | Move to current paragraph start, or previous paragraph start when already there. Blank-line-separated runs. |
| `piVimMode.keymap.motions.paragraphForward`   | `["}"]`          | Move to next paragraph first column, or prompt end when none remain. Blank-line-separated runs.             |

### Commands

| Path                                                | Default      | Effect                                                                                                                                                                   |
| --------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `piVimMode.keymap.commands.insertBefore`            | `["i"]`      | Enter insert mode at cursor.                                                                                                                                             |
| `piVimMode.keymap.commands.insertAfter`             | `["a"]`      | Move right, then enter insert.                                                                                                                                           |
| `piVimMode.keymap.commands.insertLineStart`         | `["I"]`      | Move to line start, then insert. In visual block mode, starts block insert before selected block.                                                                        |
| `piVimMode.keymap.commands.insertLineEnd`           | `["A"]`      | Move to line end, then insert. In visual block mode, starts block append after selected block.                                                                           |
| `piVimMode.keymap.commands.openLineBelow`           | `["o"]`      | Open blank line below and enter insert.                                                                                                                                  |
| `piVimMode.keymap.commands.openLineAbove`           | `["O"]`      | Open blank line above and enter insert.                                                                                                                                  |
| `piVimMode.keymap.commands.visualChar`              | `["v"]`      | Enter/switch visual character mode.                                                                                                                                      |
| `piVimMode.keymap.commands.visualLine`              | `["V"]`      | Enter/switch visual line mode.                                                                                                                                           |
| `piVimMode.keymap.commands.visualBlock`             | `[]`         | Bindings for visual block mode. Default `Ctrl-v` / `Alt-v` / `Ctrl-Alt-v` delegates to Pi image/clipboard paste; bind another key or explicitly allow the protected key. |
| `piVimMode.keymap.commands.deleteChar`              | `["x"]`      | Delete character under cursor. In visual modes, deletes selection.                                                                                                       |
| `piVimMode.keymap.commands.deleteToLineEnd`         | `["D"]`      | Delete from cursor through line end.                                                                                                                                     |
| `piVimMode.keymap.commands.changeToLineEnd`         | `["C"]`      | Delete from cursor through line end and enter insert.                                                                                                                    |
| `piVimMode.keymap.commands.yankLine`                | `["Y"]`      | Yank current line into linewise register.                                                                                                                                |
| `piVimMode.keymap.commands.joinLine`                | `["J"]`      | Join current line with next line.                                                                                                                                        |
| `piVimMode.keymap.commands.pasteAfter`              | `["p"]`      | Paste register after cursor or below current line. In visual line mode, replaces selected lines.                                                                         |
| `piVimMode.keymap.commands.pasteBefore`             | `["P"]`      | Paste register before cursor or above current line.                                                                                                                      |
| `piVimMode.keymap.commands.incrementNumber`         | `["ctrl+a"]` | Increment signed integer under or after cursor. Count changes delta.                                                                                                     |
| `piVimMode.keymap.commands.decrementNumber`         | `["ctrl+x"]` | Decrement signed integer under or after cursor. Count changes delta.                                                                                                     |
| `piVimMode.keymap.commands.toggleCase`              | `["~"]`      | Toggle case under cursor or visual selection. Count toggles current-line span. Visual `u` / `U` lower/uppercase selections.                                              |
| `piVimMode.keymap.commands.replaceChar`             | `["r"]`      | Wait for one printable char, replace character(s) or visual selection.                                                                                                   |
| `piVimMode.keymap.commands.substituteChar`          | `["s"]`      | Delete character(s), then enter insert.                                                                                                                                  |
| `piVimMode.keymap.commands.substituteLine`          | `["S"]`      | Change line(s), then enter insert.                                                                                                                                       |
| `piVimMode.keymap.commands.findCharForward`         | `["f"]`      | Wait for char and find it forward on current line. Also works after delete/change/yank as `f{char}` target.                                                              |
| `piVimMode.keymap.commands.findCharBackward`        | `["F"]`      | Wait for char and find it backward on current line. Also works after delete/change/yank as `F{char}` target.                                                             |
| `piVimMode.keymap.commands.tillCharForward`         | `["t"]`      | Wait for char and move before it on current line. Also works after delete/change/yank as `t{char}` target.                                                               |
| `piVimMode.keymap.commands.tillCharBackward`        | `["T"]`      | Wait for char and move after it on current line. Also works after delete/change/yank as `T{char}` target.                                                                |
| `piVimMode.keymap.commands.repeatCharSearch`        | `[";"]`      | Repeat last character search same direction.                                                                                                                             |
| `piVimMode.keymap.commands.repeatCharSearchReverse` | `[","]`      | Repeat last character search opposite direction.                                                                                                                         |
| `piVimMode.keymap.commands.startSearch`             | `["/"]`      | Start prompt-local forward search. Also works after operator as search motion.                                                                                           |
| `piVimMode.keymap.commands.startSearchBackward`     | `["?"]`      | Start prompt-local backward search. Also works after operator as search motion.                                                                                          |
| `piVimMode.keymap.commands.repeatSearch`            | `["n"]`      | Repeat last prompt search direction.                                                                                                                                     |
| `piVimMode.keymap.commands.repeatSearchReverse`     | `["N"]`      | Repeat prompt search opposite direction.                                                                                                                                 |
| `piVimMode.keymap.commands.searchWordForward`       | `["*"]`      | Normal-mode only: search forward for the keyword word under the cursor; reuses prompt search repeat state.                                                               |
| `piVimMode.keymap.commands.searchWordBackward`      | `["#"]`      | Normal-mode only: search backward for the keyword word under the cursor; reuses prompt search repeat state.                                                              |
| `piVimMode.keymap.commands.startExCommand`          | `[":"]`      | Open Ex command-line row. Count in normal mode pre-fills a line range.                                                                                                   |
| `piVimMode.keymap.commands.repeatChange`            | `["."]`      | Repeat last supported completed normal-mode change.                                                                                                                      |
| `piVimMode.keymap.commands.reselectVisual`          | `["gv"]`     | Re-enter the last valid visual selection from normal mode.                                                                                                               |
| `piVimMode.keymap.commands.undo`                    | `["u"]`      | Delegate to Pi native undo.                                                                                                                                              |
| `piVimMode.keymap.commands.redo`                    | `["ctrl+r"]` | Redo the latest prompt text/cursor state undone by normal-mode undo.                                                                                                     |
| `piVimMode.keymap.commands.showKeybindings`         | `[]`         | Optional normal-mode shortcut that opens the same bounded read-only popup as `:keybindings`.                                                                             |

`halfPageDown` and `halfPageUp` are prompt-local cursor motions in normal and visual modes. Their default `ctrl+d` / `ctrl+u` keys are only allowed for these motion actions; mapping those protected control keys to unrelated actions is rejected with a warning. They are not supported operator motions, so adding them to `piVimMode.keymap.operatorMotions` is ignored with a warning.

`findCharForward`, `findCharBackward`, `tillCharForward`, and `tillCharBackward` are character-argument commands. Their configured semantic key sequences work as normal-mode motions and after motion-capable `delete`, `change`, and `yank` operators. For example, mapping `findCharForward` to `["gf"]` makes `dgf,` delete through the next comma on the current line. Counts after the operator target later/earlier matches (`d2gf,`), and counts before and after the operator multiply for this finite character-search grammar. These command bindings do not make shift operators (`>`/`<`) accept character-search targets.

`showKeybindings` has no default keybinding. Configure it like other semantic normal-mode commands, for example `{ "piVimMode": { "keymap": { "commands": { "showKeybindings": ["gk"] } } } }`. It follows normal keymap validation: protected Pi shortcuts such as `ctrl+p`, `enter`, and `tab` are rejected; exact conflicts and prefix-shadow conflicts with the finite grammar are rejected; valid sibling settings stay intact; multi-key sequences use the same finite pending-prefix matcher as other commands. Insert mode remains Pi-owned, so the same physical key sequence delegates to Pi while inserting text unless pi-vimmode otherwise supports that insert-mode input.

Use this command path for a shortcut to keybinding discovery. Do not configure `vimmode.*` diagnostic/help metadata IDs under `piVimMode.keymap.actions`: `vimmode.keybindings`, `vimmode.keymap`, `vimmode.help`, and other `vimmode.*` IDs are metadata-only, not bindable prompt transform actions.

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

| Path                                                  | Default      | Effect                                                  |
| ----------------------------------------------------- | ------------ | ------------------------------------------------------- |
| `piVimMode.keymap.textObjects.kinds.inner`            | `["i"]`      | Kind key for inner text objects, e.g. `diw`, `cif`.     |
| `piVimMode.keymap.textObjects.kinds.around`           | `["a"]`      | Kind key for around text objects, e.g. `daw`, `yaf`.    |
| `piVimMode.keymap.textObjects.targets.word`           | `["w"]`      | Word text object target.                                |
| `piVimMode.keymap.textObjects.targets.singleQuote`    | `["'"]`      | Single-quoted string target.                            |
| `piVimMode.keymap.textObjects.targets.doubleQuote`    | `["\""]`     | Double-quoted string target.                            |
| `piVimMode.keymap.textObjects.targets.paren`          | `["(", ")"]` | Parenthesized target.                                   |
| `piVimMode.keymap.textObjects.targets.bracket`        | `["[", "]"]` | Bracketed target.                                       |
| `piVimMode.keymap.textObjects.targets.brace`          | `["{", "}"]` | Braced target.                                          |
| `piVimMode.keymap.textObjects.targets.codeFence`      | `["f"]`      | Markdown code fence target.                             |
| `piVimMode.keymap.textObjects.targets.headingSection` | `["h"]`      | Markdown heading section target.                        |
| `piVimMode.keymap.textObjects.targets.listItem`       | `["l"]`      | Markdown list item target.                              |
| `piVimMode.keymap.textObjects.targets.tag`            | `["t"]`      | XML-ish tag block target.                               |
| `piVimMode.keymap.textObjects.targets.errorBlock`     | `["e"]`      | Pasted error/stack-trace block target.                  |
| `piVimMode.keymap.textObjects.targets.paragraph`      | `["p"]`      | Blank-line paragraph target for `ip`/`ap` text objects. |

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
left, down, up, right, wordForward, wordBackward, wordEnd, wordForwardBig, wordBackwardBig, wordEndBig, wordPreviousEnd, wordPreviousEndBig, lineStart, firstNonBlank, lineEnd, bufferStart, bufferEnd, matchingPair, paragraphBackward, paragraphForward
```

| Path                                          | Default                                                          | Effect                                                                         |
| --------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `piVimMode.keymap.operatorMotions.delete`     | all supported motion actions (`left` through `paragraphForward`) | Motions allowed after delete operator. Remove entries to disable combinations. |
| `piVimMode.keymap.operatorMotions.change`     | all supported motion actions (`left` through `paragraphForward`) | Motions allowed after change operator.                                         |
| `piVimMode.keymap.operatorMotions.yank`       | all supported motion actions (`left` through `paragraphForward`) | Motions allowed after yank operator.                                           |
| `piVimMode.keymap.operatorMotions.lowercase`  | all supported motion actions (`left` through `paragraphForward`) | Motions allowed after lowercase operator.                                      |
| `piVimMode.keymap.operatorMotions.uppercase`  | all supported motion actions (`left` through `paragraphForward`) | Motions allowed after uppercase operator.                                      |
| `piVimMode.keymap.operatorMotions.toggleCase` | all supported motion actions (`left` through `paragraphForward`) | Motions allowed after range toggle-case operator.                              |

WORD and previous-end actions can be customized and used in `operatorMotions` like other finite motions. Example: `{ "piVimMode": { "keymap": { "motions": { "wordForwardBig": ["gw"], "wordPreviousEnd": ["g-"] }, "operatorMotions": { "delete": ["wordForwardBig", "wordPreviousEnd"] } } } }` makes `dgw` and `dg-` valid delete targets.

Character-search commands are configured under `piVimMode.keymap.commands`, not `operatorMotions`; they are current-line operator targets for motion-capable `delete`, `change`, and `yank` when their `findCharForward`, `findCharBackward`, `tillCharForward`, `tillCharBackward`, `repeatCharSearch`, or `repeatCharSearchReverse` command bindings resolve. Case operators intentionally do not accept character-search, prompt-search, or mark targets. `operatorMotions` applies only to motion-capable `delete`, `change`, `yank`, `lowercase`, `uppercase`, and `toggleCase`; `operatorMotions.indent` and `operatorMotions.dedent` are rejected with warnings because shift operators are line-only.

Motion configuration boundaries: no subword/camelCase navigation, display-line motions, recursive mappings, Vimscript, `.vimrc`, or full Vim/Neovim parity are added by these settings.

### Protected key allow-list

| Path                                       | Default | Effect                                                                                           |
| ------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------ |
| `piVimMode.keymap.allowProtectedOverrides` | `[]`    | Opt-in array of protected key sequences to allow pi-vimmode to bind instead of delegating to Pi. |

Protected Pi shortcuts such as `ctrl+p`, `ctrl+v`, `alt+v`, `ctrl+alt+v`, `ctrl+t`, and `tab` are rejected from all keymap groups by default. Adding a key to this allow-list within the same settings layer authorizes that key in classic keymap groups, escape aliases, and action keybindings of the same layer.

Example:

```json
{
  "piVimMode": {
    "keymap": {
      "commands": {
        "showKeybindings": ["ctrl+p"]
      },
      "allowProtectedOverrides": ["ctrl+p"]
    }
  }
}
```

Rules:

- The allow-list is scoped to its settings layer. Global allow-list entries do not authorize project-layer bindings without a project-layer allow-list. Add the same key to `allowProtectedOverrides` in the layer where it is bound.
- Entries are normalized the same way as keymap bindings: `"<C-p>"`, `"ctrl+p"`, and `"control+p"` are equivalent.
- Invalid or unparseable entries produce a warning without affecting valid siblings.
- Protected keys not listed remain rejected regardless of the keymap group.
- Overrides are not OS or terminal guarantees. pi-vimmode can only handle keys Pi delivers distinctly. For example, Ctrl+J often arrives as `enter` and cannot be distinguished from the Enter key in many terminal configurations.
- Insert mode still delegates protected shortcuts to Pi unless the key is configured as an escape alias.
- Binding `ctrl+v`, `alt+v`, or `ctrl+alt+v` to `commands.visualBlock` makes normal/visual mode own Vim visual block for that key; leave them unbound when normal-mode image paste should reach Pi.
- To roll back, remove the key from `allowProtectedOverrides`.

### Action keybindings

`piVimMode.keymap.actions` binds finite prompt transform actions to normal/visual key sequences. It is a flat record from canonical action ID to an array of string entries or `{ "key", "args" }` entries. No action keybindings exist by default.

Supported bindable action IDs:

- `prompt.transform.quote`
- `prompt.transform.unquote`
- `prompt.transform.bulletize`
- `prompt.transform.fence`
- `prompt.transform.indent`
- `prompt.transform.dedent`
- `prompt.transform.reflow`

<!-- #prompt-transform-action-quote -->
<!-- #prompt-transform-action-unquote -->
<!-- #prompt-transform-action-bulletize -->
<!-- #prompt-transform-action-fence -->
<!-- #prompt-transform-action-indent -->
<!-- #prompt-transform-action-dedent -->
<!-- #prompt-transform-action-reflow -->

Example:

```json
{
  "piVimMode": {
    "keymap": {
      "actions": {
        "prompt.transform.reflow": ["gq", { "key": "gQ", "args": { "width": 100 } }],
        "prompt.transform.fence": [{ "key": "gT", "args": { "language": "ts" } }],
        "prompt.transform.quote": [{ "key": "g>" }]
      }
    }
  }
}
```

Action keybinding presets are selectable opt-in bundles backed by the same finite recipe metadata. They create no default keybindings and are not defaults, not recursive mappings, not runtime `:map`, not `.vimrc`, no plugin API, not a plugin API, not diagnostic/help action dispatch, and not Vim/Neovim parity. Run `:features keybindings` or `:features action presets` for compact runtime discovery.

`piVimMode.keymap.actionPresets` accepts:

- `paragraph-editing`
- `markdown-wrapping`

Resolution order is defaults, global whole-editor `piVimMode.preset`, global `keymap.actionPresets`, global explicit `keymap.actions`, project whole-editor `piVimMode.preset`, project `keymap.actionPresets`, then project explicit `keymap.actions`. Later presets replace earlier preset bindings for the same action ID. Explicit `piVimMode.keymap.actions` entries override preset-provided entries for the same action ID; an explicit empty action array clears that action from the preset.

<!-- action-keybinding-preset:paragraph-editing -->
<!-- action-keybinding-preset:markdown-wrapping -->

Preset example:

```json
{
  "piVimMode": {
    "keymap": {
      "actionPresets": ["paragraph-editing", "markdown-wrapping"],
      "actions": {
        "prompt.transform.quote": ["zq"],
        "prompt.transform.unquote": []
      }
    }
  }
}
```

In this example, presets provide reflow/fence/quote/unquote bindings, explicit `quote` changes the quote key to `zq`, and explicit empty `unquote` removes the preset-provided unquote binding.

Action keybinding recipes are copy-pasteable opt-in snippets. Recipes and presets share the same canonical action metadata: recipes are pasted under `piVimMode.keymap.actions`, while presets are selected by ID under `piVimMode.keymap.actionPresets`.

<!-- action-keybinding-recipe:paragraph-editing -->

Paragraph editing recipe:

```json
{
  "piVimMode": {
    "keymap": {
      "actions": {
        "prompt.transform.reflow": ["gq"],
        "prompt.transform.quote": ["g>"],
        "prompt.transform.unquote": ["g<"]
      }
    }
  }
}
```

<!-- action-keybinding-recipe:markdown-wrapping -->

Markdown wrapping recipe:

```json
{
  "piVimMode": {
    "keymap": {
      "actions": {
        "prompt.transform.fence": ["gT"],
        "prompt.transform.quote": ["g>"],
        "prompt.transform.unquote": ["g<"]
      }
    }
  }
}
```

Normal mode action keys transform the current line; a count extends the line range, e.g. `3gq` reflows current line plus next two lines. Visual, visual-line, and visual-block action keys transform touched lines once, ignore visual counts, then return to normal mode. Visual-block action transforms are linewise, not rectangular.

Parameterized args:

- `prompt.transform.fence`: optional `{ "language": "ts" }`; language must not contain whitespace.
- `prompt.transform.reflow`: optional `{ "width": 72 }`; width must be an integer from `20` through `240`.
- `quote`, `unquote`, `bulletize`, `indent`, and `dedent` reject args.
- Unknown arg keys reject that binding so typos do not silently fall back to defaults.

Rejected action key entries are ignored with warnings while valid sibling entries stay usable. Rejections include unknown action IDs, invalid args, protected Pi shortcuts, disabled prompt transform actions, duplicate keys across different actions, exact grammar conflicts, and prefix-shadow conflicts. Same-action repeated keys dedupe without warning. Use `:vimdoctor` for retained warnings and `:mapcheck <key>` to inspect accepted or rejected action keys.

`piVimMode.keymap.actions` accepts canonical `prompt.transform.*` IDs only. Non-canonical action IDs are unsupported and do not install keybinding dispatch. `piVimMode.promptTransforms.actions` remains the enable/disable boolean surface for transforms, and `piVimMode.promptTransforms.commands` remains the Ex command-name surface; neither moves into `keymap.actions`.

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
- `keymap.actionPresets` must be an array of supported preset ID strings.
- Each classic keymap binding value must be an array of strings; `keymap.actions` also accepts `{ "key", "args" }` entries.
- Protected shortcuts are ignored with warnings.
- Duplicate bindings inside a classic group warn.
- Duplicate bindings across the resolved classic keymap warn.
- A shorter classic binding shadowed by a longer binding prefix warns, e.g. `g` and `gg`.
- Action binding conflicts reject before dispatch; classic grammar remains owner until explicitly unbound or remapped.

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

These settings enable/disable finite prompt transform Ex commands and configure command names. They are separate from `piVimMode.keymap.actions`: `promptTransforms.actions` are boolean enable flags, and `promptTransforms.commands` are Ex command names such as `:quote` or `:reflow`.

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

### Workbench row reservation

| Path                                  | Default | Accepted values         | Effect                                                                                                            |
| ------------------------------------- | ------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `piVimMode.ui.workbench.reservedRows` | `0`     | integer from `0` to `5` | Reserves width-safe rows below the prompt for `/`, `?`, `:` input, Ex/search messages, and substitution previews. |

Default `0` preserves the existing idle layout: no blank workbench row is reserved until search, Ex input, preview, success, or error feedback is active. Active feedback still reserves one row. Setting `reservedRows` to `1` or more keeps that many rows below the prompt even when idle; active feedback renders in the first reserved row without subtracting extra height. Values below `0`, above `5`, non-integers, and non-numbers warn and fall back to `0` while valid sibling UI settings still apply.

Example stable two-row command area:

```json
{
  "piVimMode": {
    "ui": {
      "workbench": { "reservedRows": 2 }
    }
  }
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
        "wordForwardBig": ["W"],
        "wordBackwardBig": ["B"],
        "wordEndBig": ["E"],
        "wordPreviousEnd": ["ge"],
        "wordPreviousEndBig": ["gE"],
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
        "searchWordForward": ["*"],
        "searchWordBackward": ["#"],
        "startExCommand": [":"],
        "repeatChange": ["."],
        "reselectVisual": ["gv"],
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
          "left",
          "down",
          "up",
          "right",
          "wordForward",
          "wordBackward",
          "wordEnd",
          "wordForwardBig",
          "wordBackwardBig",
          "wordEndBig",
          "wordPreviousEnd",
          "wordPreviousEndBig",
          "lineStart",
          "firstNonBlank",
          "lineEnd",
          "bufferStart",
          "bufferEnd",
          "matchingPair"
        ],
        "change": [
          "left",
          "down",
          "up",
          "right",
          "wordForward",
          "wordBackward",
          "wordEnd",
          "wordForwardBig",
          "wordBackwardBig",
          "wordEndBig",
          "wordPreviousEnd",
          "wordPreviousEndBig",
          "lineStart",
          "firstNonBlank",
          "lineEnd",
          "bufferStart",
          "bufferEnd",
          "matchingPair"
        ],
        "yank": [
          "left",
          "down",
          "up",
          "right",
          "wordForward",
          "wordBackward",
          "wordEnd",
          "wordForwardBig",
          "wordBackwardBig",
          "wordEndBig",
          "wordPreviousEnd",
          "wordPreviousEndBig",
          "lineStart",
          "firstNonBlank",
          "lineEnd",
          "bufferStart",
          "bufferEnd",
          "matchingPair"
        ]
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
      },
      "workbench": {
        "reservedRows": 0
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

### Add visual block binding while keeping image paste shortcuts

```json
{
  "piVimMode": {
    "keymap": {
      "commands": {
        "visualBlock": ["<A-b>"]
      }
    }
  }
}
```

`Ctrl-v`, Windows-style `Alt-v`, and `Ctrl-Alt-v` still delegate to Pi image/clipboard paste. Plain `B` is a default WORD motion, so it is not a safe visual-block example key.

### Opt into Ctrl-v visual block ownership

```json
{
  "piVimMode": {
    "keymap": {
      "commands": {
        "visualBlock": ["<C-v>"]
      },
      "allowProtectedOverrides": ["<C-v>"]
    }
  }
}
```

Use this only when Vim-style visual block on `Ctrl-v` is more important than delegating Pi image paste from normal and visual modes.

### Remap operator and motion

```json
{
  "piVimMode": {
    "keymap": {
      "operators": {
        "delete": ["z"]
      },
      "motions": {
        "wordForward": ["gw"]
      }
    }
  }
}
```

With this config, `zz` deletes a line and `zgw` deletes by the configured `wordForward` motion.

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
- Feature has built-in special handling, e.g. protected Pi paste shortcuts are delegated unless explicitly allow-listed.

### Cursor style does not change

Cursor shape hints are terminal-dependent. `bar` cursor additionally needs Pi TUI hardware cursor visibility, which pi-vimmode manages when the API is available. Some terminals still ignore shape escapes.
