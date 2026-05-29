# pi-vimmode feature guide

pi-vimmode replaces Pi's main prompt editor with a Vim-style modal editor. It targets fast prompt editing inside Pi, not full Vim or Neovim parity.

Use this guide for behavior. Use [`settings.md`](./settings.md) for every `piVimMode` setting and default.

## Activation and lifecycle

Pi discovers this extension through `package.json` and installs `VimEditor` as the active `CustomEditor`.

Runtime behavior:

- Installs automatically on `session_start`, `resources_discover`, and `agent_end`.
- Re-runs installation on the next tick for startup/resource timing reliability.
- Loads settings from global and project Pi settings whenever it installs.
- Shows status key `pi-vimmode` as `vim` when settings parse cleanly.
- Shows `vim ⚠` when settings load with warnings.
- Resets terminal cursor hints on `session_shutdown`.

Example install from Git:

```sh
pi install git:https://github.com/pekochan069/pi-vimmode
```

Local development:

```sh
bun install
bun test
```

## Disable or recover

Because pi-vimmode replaces Pi's main prompt editor, keep the recovery path handy when trying it in a new terminal.

- Run `pi list` to confirm the installed extension source.
- Run `pi remove <source>` or `pi uninstall <source>` to remove it from Pi settings.
- For the Git install shown above, run `pi remove git:https://github.com/pekochan069/pi-vimmode`.
- Restart Pi or start a new session so extension discovery reloads without pi-vimmode.
- Run `pi config` if you want to enable/disable package resources through Pi's TUI instead of hand-editing settings.
- If the terminal cursor shape looks stuck, close and reopen the terminal. pi-vimmode resets tracked cursor styles on `session_shutdown`, but terminal support is best effort.

## Modes

| Mode         | Label     | Purpose                                                                                                                                      |
| ------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Insert       | `INSERT`  | Normal Pi text entry. Printable input inserts text. Pi autocomplete, submit, image paste, external editor, and app shortcuts stay available. |
| Normal       | `NORMAL`  | Vim command mode. Printable keys run supported Vim actions or are ignored.                                                                   |
| Visual char  | `VISUAL`  | Characterwise selection. Selection is highlighted inline.                                                                                    |
| Visual line  | `V-LINE`  | Linewise selection. Whole selected lines are highlighted.                                                                                    |
| Visual block | `V-BLOCK` | Rectangular selection. Selected cells are highlighted.                                                                                       |

Startup mode is `insert` by default. Configure `piVimMode.startMode` to start new prompts in `normal` instead.

### Escape and reset behavior

- Insert + inactive autocomplete: `Esc` enters normal mode.
- Insert + active autocomplete: `Esc` delegates to Pi so autocomplete can close.
- Normal: `Esc` delegates to Pi so interrupt/abort behavior still works.
- Visual modes: `Esc` cancels selection and returns to normal mode.
- In normal/visual prompt editing, `Enter`, `Ctrl-C`, and `Ctrl-G` reset Vim transient state, return to configured startup mode, and delegate to Pi.
- While `/` search or `:` Ex command-line is pending, `Enter` completes or executes that pending operation instead; `Ctrl-C` and `Ctrl-G` reset/delegate.
- In insert mode, non-`Esc` keys delegate to Pi.
- Unknown control/non-printable keys delegate to Pi. Unmapped printable keys in normal/visual mode are ignored.

Example:

```text
Type prompt text in insert mode
Esc          -> normal mode
0wciwidea    -> move, change inner word, type replacement
Esc          -> normal mode again
Enter        -> submit through Pi
```

## Normal mode motions

| Key                   | Action                                  | Notes                                                            |
| --------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| `h` / `j` / `k` / `l` | left / down / up / right                | Counts repeat adapter movement, e.g. `5l`.                       |
| `0` / `$`             | line start / line end                   | Current prompt line.                                             |
| `^` / `_`             | first non-blank on line                 | Both map to same action.                                         |
| `w` / `b` / `e`       | word forward / word backward / word end | Prompt-local word movement.                                      |
| `gg` / `G`            | prompt start / prompt end               | `G` moves to end of last line.                                   |
| `%`                   | matching pair                           | Supports `()`, `[]`, `{}` under or after cursor on current line. |
| `f{char}` / `F{char}` | find char forward/backward              | Current line only.                                               |
| `t{char}` / `T{char}` | move until before/after char            | Current line only.                                               |
| `;` / `,`             | repeat char search                      | Same/opposite direction.                                         |

Counts work for supported motions: `3w`, `2e`, `4j`, `2fx`.

Example:

```text
one two three
^   cursor on o
3w  moves to start of third word or as far as prompt allows
%   jumps between matching brackets when cursor is on or before bracket on same line
```

## Normal mode edits

| Key                 | Action                                                                  |
| ------------------- | ----------------------------------------------------------------------- |
| `i`                 | enter insert at cursor                                                  |
| `a`                 | move right, then insert                                                 |
| `I` / `A`           | move to line start/end, then insert                                     |
| `o` / `O`           | open blank line below/above, then insert                                |
| `x`                 | delete character under cursor                                           |
| `dd` / `cc` / `yy`  | delete/change/yank current line                                         |
| `D` / `C`           | delete/change from cursor through line end                              |
| `Y`                 | yank current line                                                       |
| `J`                 | join current line with next line using one separating space when needed |
| `p` / `P`           | paste after/before cursor or below/above line                           |
| `Ctrl-a` / `Ctrl-x` | increment/decrement signed integer under or after cursor                |
| `~`                 | toggle case under cursor; count toggles span within current line        |
| `r{char}`           | replace character(s) and stay normal                                    |
| `s` / `S`           | substitute character/current line and enter insert                      |
| `.`                 | repeat last supported completed change                                  |
| `u`                 | delegate to Pi native undo                                              |

Counts work for supported edits:

```text
3x    delete 3 characters
2dd   delete 2 lines
5~    toggle case across 5 characters on current line
10<C-a> increment number by 10
```

Dot-repeat is intentionally finite. It repeats supported recorded normal-mode changes such as `x`, `D`, `C`, `Ctrl-a`, `Ctrl-x`, `~`, `r`, `s`, `S`, `dd`, `cc`, operator motions, and text-object changes. It does not replay arbitrary insert-mode text, macros, Ex substitutions, visual-mode edits, joins, or pastes.

## Operators and operator motions

Supported operators:

- `d` delete
- `c` change, then enter insert
- `y` yank

Supported operator motions:

- `w`, `b`, `e`
- `0`, `^`, `$`
- mark jumps: `` `{mark}`` and `'{mark}`
- prompt search: `/query<Enter>`
- text objects listed below

Examples:

```text
dw        delete to next word start
y$        yank through line end
c^        change back to first non-blank
3dw       delete three word motions
d/foo⏎    delete from cursor through next literal foo match
```

Operator motions are smaller than Vim's full grammar. Motions such as `h`, `l`, `gg`, `G`, and `%` remain normal/visual motions unless future buffer range semantics are added.

## Text objects

Text objects work after `d`, `c`, or `y`.

| Object                    | Meaning                                     |
| ------------------------- | ------------------------------------------- |
| `iw` / `aw`               | inner/around whitespace-delimited word      |
| `i'` / `a'`               | inside/around single quotes on current line |
| `i"` / `a"`               | inside/around double quotes on current line |
| `i(` / `a(` / `i)` / `a)` | inside/around parentheses                   |
| `i[` / `a[` / `i]` / `a]` | inside/around brackets                      |
| `i{` / `a{` / `i}` / `a}` | inside/around braces                        |

Examples:

```text
diw   delete current word
ci"   change text inside nearest double quotes on current line
da)   delete parenthesized expression including delimiters
ya{   yank braced block including braces
```

Limitations:

- Word objects use whitespace boundaries.
- Quote objects search current line.
- Bracket objects balance delimiters in prompt text, but do not implement Vim's full syntax awareness.

## Character search

`f`, `F`, `t`, and `T` search within the current line only.

Example:

```text
abc_def_ghi
^ cursor on a
f_  -> first underscore
;   -> next underscore
,   -> previous underscore
T_  -> character after previous underscore
```

Search misses are safe no-ops.

## Prompt search

`/` starts literal forward search in current prompt. Type query text, then press `Enter`. `n` repeats last search direction and `N` searches opposite direction. Matches wrap around the prompt.

Examples:

```text
/error⏎    move to next literal error
n          next error
N          previous error
d/error⏎  delete through next literal error match
y/TODO⏎   yank through next literal TODO match
```

Visual search moves the active cursor while preserving the visual anchor.

Search highlighting:

- Successful `/`, `n`, and `N` can highlight matches.
- Current match can use distinct styling.
- Highlight rendering is capped by `piVimMode.search.maxHighlights`.
- Precedence is: cursor, visual selection, current search match, other search matches, plain text.
- Search highlight can clear on cancelled search or insert-mode transition depending on settings.

Limitations:

- Search is literal, not regex.
- `?` backward search command is not supported.
- No search history, offsets, Vim highlight groups, `:nohlsearch`, or search across previous prompts.

## Visual char mode

Enter with `v` from normal mode.

Supported actions:

- Motions extend selection: `h`, `j`, `k`, `l`, `0`, `$`, `^`, `_`, `w`, `b`, `e`, `gg`, `G`, `%`, search, and mark jumps.
- `V` switches to visual line mode without resetting anchor.
- `Ctrl-v` switches to visual block mode without resetting anchor.
- `y` yanks selection and returns normal.
- `d` / `x` deletes selection and returns normal.
- `c` deletes selection and enters insert.
- `r{char}` replaces selected characters and returns normal.
- `~` toggles selected character case and returns normal.
- `:` opens Ex command-line with `'<,'>` prefilled.
- `"{a-z}` / `"{A-Z}` targets next yank/delete/change with named register.

Example:

```text
vwwy     select roughly two words, yank, return normal
v/foo⏎d  extend to next foo, delete selection
```

## Visual line mode

Enter with `V` from normal mode.

Supported actions:

- Motions extend selected line range.
- `v` switches to visual char mode without resetting anchor.
- `Ctrl-v` switches to visual block mode without resetting anchor.
- `y`, `d`, `x`, `c`, `r{char}`, `~`, mark jumps, named register targeting, and `:` work linewise.
- Linewise `p` in visual line mode replaces selected lines with the register content.

Example:

```text
Vj"ay   select two lines and yank into register a
Vjp     replace selected lines with unnamed register
```

## Visual block mode

Enter with built-in `Ctrl-v` from normal/visual mode. `piVimMode.keymap.commands.visualBlock` can add more bindings; default setting is empty because `Ctrl-v` is handled directly.

Supported actions:

- Motions extend rectangular block.
- `v` switches to visual char mode without resetting anchor.
- `V` switches to visual line mode without resetting anchor.
- `y` yanks selected slices joined by newlines.
- `d` / `x` delete selected slices.
- `c` deletes selected slices and enters insert.
- `r{char}` replaces selected cells.
- `~` toggles selected cell case.
- `I` starts block insert before block on each selected line; typed text is applied when `Esc` is pressed.
- `A` starts block append after block on each selected line; typed text is applied when `Esc` is pressed.
- `:` opens Ex command-line with visual line range marker `'<,'>` prefilled.

Example:

```text
Ctrl-v jj I- Esc
```

Adds `-` before the selected block column on three lines.

## Ex command-line and substitution

Normal-mode `:` opens a dedicated Ex row below the prompt. Visual `:` opens the same row with `'<,'>` prefilled and keeps the original selection highlighted while editing the command.

Supported commands:

```vim
:s/old/new/
:%s/old/new/g
:2,4s#old/path#new/path#g
:.,$substitute/old/new/i
:'<,'>s/old/new/g
```

Supported ranges:

- omitted range: current line
- `%`: whole prompt
- `'<,'>`: captured visual range
- numeric line address, e.g. `2`
- `.`: current line
- `$`: last line
- comma range, e.g. `2,4`, `.,$`
- normal-mode count before `:`, e.g. `3:` pre-fills a concrete clamped range

Supported flags:

- `g`: replace every non-overlapping literal match per line
- `i`: case-insensitive literal match

Important semantics:

- Pattern and replacement are literal strings, not regex.
- `&`, `$1`, and `\1` in replacements insert literally.
- Empty replacement is valid.
- Empty pattern is an error.
- Delimiter can be any printable non-alphanumeric, non-whitespace, non-backslash character.
- `Esc` cancels command-line input. Normal Ex returns to normal mode; visual Ex restores the original visual mode, anchor, cursor, and highlight.
- Enter on an empty command closes the Ex row without a message.
- Unsupported command, range, delimiter, or flag produces transient Ex error text.
- Successful substitution shows transient count text such as `2 substitutions`.
- Success/error messages stay in the Ex row until the next handled input.
- `Ctrl-C` and `Ctrl-G` reset Vim transient state and delegate to Pi.
- Substitution clears visible prompt search highlights when it changes text.
- Substitution does not write registers and does not update dot-repeat.

Limitations: no regex substitution, command history, repeat substitution, `:nohlsearch`, offsets, semicolon ranges, confirmation flag, or non-substitution Ex commands.

## Registers

pi-vimmode supports one unnamed register and named edit registers `a-z`, all in memory for the current editor session.

Behavior:

- Yank/delete/change update unnamed register.
- `"{a-z}` targets next supported yank/delete/change/paste with named register.
- `"{A-Z}` appends yank/delete/change text to lowercase named register.
- Uppercase paste reads lowercase register.
- Linewise registers paste below with `p` and above with `P`.
- Charwise registers paste after with `p` and before with `P`.
- Empty or missing register paste is a no-op.

Examples:

```text
"ayy   yank current line into register a and unnamed register
"ap    paste register a
"Ayy   append current line to register a
"bdw   delete word into register b
```

Limitations: no numbered registers, special registers, expression registers, black-hole register, or system clipboard register.

## Marks

Local marks `a-z` are stored in memory for the current editor session.

Behavior:

- `m{slot}` stores current cursor position.
- `` `{slot}`` jumps to exact stored line/column.
- `'{slot}` jumps to first non-blank column on stored line.
- Visual mark jumps preserve selection anchor and move active cursor/corner.
- Operators accept mark jumps as motions:
  - ``d`a`` deletes characterwise to exact mark.
  - `d'a` deletes linewise to marked line.
- Missing marks and invalid slots are safe no-ops.
- Stale marks are clamped to current prompt text.

Examples:

```text
ma      set mark a
`a      jump to exact mark a
'a      jump to marked line first non-blank
d'a     delete line range through mark a
```

Limitations: no global marks, special marks, automatic marks, mark list, persistence, or full Vim mark adjustment after edits.

## Macros

Macros record and replay pi-vimmode input tokens in memory.

Behavior:

- `q{a-z}` starts recording a macro slot and replaces previous contents.
- Normal-mode `q` stops recording.
- Insert-mode `q` inserts and records literal `q`.
- `@{a-z}` plays a macro slot.
- `@@` repeats last successfully played macro.
- Ex command-line input, command text, `Enter`, and `Esc` are recorded and replayed.
- Playback is non-recursive; playback commands inside replay are ignored.
- Reset/submit keys (`Enter`, `Ctrl-C`, `Ctrl-G`), insert autocomplete-closing `Esc`, and delegated non-insert inputs are not recorded; insert-mode delegated keys outside those exceptions are recorded.
- Replay input count is capped by `piVimMode.macros.maxReplaySteps`.

Example:

```text
qa          start recording macro a
iTODO: Esc  insert text, return normal
q           stop recording
@a          replay macro a
@@          replay macro a again
```

Limitations: macros are in-memory only and separate from edit registers.

## UI, status, and cursor rendering

The editor renders a bordered prompt area and configurable status border.

Default status items:

- mode label: `INSERT`, `NORMAL`, `VISUAL`, `V-LINE`, `V-BLOCK`
- pending operator or prefix, e.g. `d…`, `g…`, `/query…`, `m…`, `:command…`
- visual selection summary and preview

Optional status item:

- cursor position, e.g. `12:4` or custom `L12:C4`

Rendering behavior:

- Narrow widths use narrow labels: `I`, `N`, `V`, `VL`, `VB`.
- Active macro recording shows `REC {slot}`.
- Visual selections are highlighted inline.
- Selected empty lines in visual line mode render a highlighted blank cell when width permits.
- Ex input and Ex messages render in a dedicated row below the prompt and shrink prompt viewport by one row.
- Pending Ex input also appears in status with an ellipsis when the pending-status item is enabled.
- Long prompt content wraps and scrolls around cursor with `↑ more` / `↓ more` indicators.
- Cursor styles support `block`, `bar`, and `underline` by mode.
- Terminal cursor-shape hints use best-effort DECSCUSR escapes.
- `bar` cursor enables Pi TUI hardware cursor visibility while active and restores original visibility on reset.

Limitations:

- Search and cursor colors are fixed ANSI styles for now.
- Cursor behavior does not implement full Neovim cursor option parity such as blink timing.
- Unsupported terminals may ignore cursor-shape hints.
- Editing uses Pi cursor coordinates, not full grapheme-cluster Vim semantics. Complex Unicode can differ from Vim.

## Pi shortcut compatibility

Pi remains owner of app-level shortcuts.

- `Enter` submits from base prompt-editing modes when no `/` search or `:` Ex command-line is pending. Pending search uses Enter to complete the search; pending Ex uses Enter to execute the command.
- `Ctrl-C`, `Ctrl-D`, `Ctrl-G`, model/thinking shortcuts, autocomplete controls, external editor shortcuts, and image paste stay Pi-owned.
- Protected Pi shortcut names are rejected from `piVimMode.keymap` with warnings.
- `Ctrl-a` and `Ctrl-x` are owned by pi-vimmode only in normal mode for numeric adjustment.

## Configuration features

Most keys map to semantic actions through `piVimMode.keymap`; settings do not add arbitrary Vim grammar.

Examples of configurable features:

- startup mode
- cursor style per mode
- semantic key bindings for supported actions
- allowed operator motions
- status item order
- mode labels and narrow labels
- visual preview width
- cursor position format/base
- macro enablement, slots, replay cap
- mark enablement and slots
- search highlight behavior

See [`settings.md`](./settings.md) for complete settings reference.

## Architecture source map

Useful files when verifying feature behavior:

- `src/lifecycle.ts`: extension activation, settings refresh, status, shutdown cursor reset.
- `src/config.ts`: settings defaults, parser, validation, merge precedence, warnings.
- `src/types.ts`: public option and behavior types.
- `src/commands.ts`: finite semantic key parser, counts, text objects, macro control parser.
- `src/buffer.ts`: pure prompt-buffer navigation, edit, search, visual, mark, register, and substitution operations.
- `src/ex.ts`: finite Ex substitution parser.
- `src/modal/engine.ts`: modal state machine and Vim semantics.
- `src/modal/view.ts`: mode/status/selection display derivation.
- `src/render.ts`: prompt rendering, visual/search/cursor composition.
- `src/vim-editor.ts`: Pi `CustomEditor` adapter and modal effect interpreter.

## Validate behavior

Automated checks:

```sh
bun test
bun run check-types
bun run lint
bun run format:check
```

Manual smoke checklist:

1. Load extension in Pi and confirm `pi-vimmode` status shows `vim`.
2. Type in insert mode, press `Esc`, move with normal motions.
3. Use `v`, `V`, and `Ctrl-v`; confirm highlighting and yank/delete/change behavior.
4. Use `/query`, `n`, and `N`; confirm literal wraparound search and highlighting.
5. Use `:%s/old/new/g` and visual `:'<,'>s/old/new/`; confirm Ex row messages.
6. Use named registers, marks, and macros.
7. Submit from normal mode and start a new prompt; confirm configured startup mode behavior.
