# pi-vimmode feature guide

pi-vimmode replaces Pi's main prompt editor with a Vim-style modal editor. It targets fast prompt editing inside Pi, not full Vim or Neovim parity.

Use this guide for behavior. Use [`settings.md`](https://github.com/pekochan069/pi-vimmode/blob/main/docs/settings.md) for every `piVimMode` setting and default.

## Activation and lifecycle

Pi discovers this extension through `package.json` and installs `VimEditor` as the active `CustomEditor`.

Runtime behavior:

- Installs automatically on `session_start`, `resources_discover`, and `agent_end`.
- Re-runs installation on the next tick for startup/resource timing reliability.
- Registers `/vimmode [on|off|toggle|status]` to temporarily enable/disable the modal editor without uninstalling the extension.
- Loads settings from global and project Pi settings whenever it installs.
- Shows status key `pi-vimmode` as `vim` when settings parse cleanly.
- Shows `vim ⚠` when settings load with warnings.
- Shows `vim off` when disabled through `/vimmode off`.
- Suppresses hardware cursor visibility while Pi agent work is active and resets terminal cursor hints on `session_shutdown` or `/vimmode off`.

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

- Run `/vimmode off` to restore Pi's previous editor for the current extension runtime.
- Run `/vimmode on` or `/vimmode` to enable the Vim editor again.
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

## Quick reference

pi-vimmode has a finite prompt-local surface. This quickref classifies what is supported; it is not a Vim/Neovim quickref clone.

| Category                             | Examples                                                               | Classification                                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Modal motions/edits                  | `h`, `j`, `w`, `dd`, `ciw`, `/query`, `n`                              | Prompt editing actions; configurable only through supported semantic keymap fields.             |
| Ex line commands                     | `:delete`, `:yank a`, `:put`, `:copy`, `:move`, `:join`, `:s/old/new/` | Finite prompt-buffer commands; no Vimscript or file/window/shell commands.                      |
| Prompt transforms                    | `:quote`, `:fence ts`, `:reflow 72`                                    | Finite linewise prompt transforms controlled by `piVimMode.promptTransforms.*`.                 |
| Keybindable prompt transform actions | `prompt.transform.reflow`, `prompt.transform.quote`                    | Canonical `prompt.transform.*` IDs accepted by `piVimMode.keymap.actions`.                      |
| Customization diagnostics            | `:vimdoctor`, `:actions`, `:keymap`, `:mapcheck`                       | Read-only metadata/help actions shown in popup output; searchable as `vimmode.*`, not bindable. |
| Runtime help/inspectability          | `:help`, `:features`, `:messages`, `:vimmode inspect`                  | Read-only source-backed help and prompt-local state/message summaries shown in popup output.    |
| Pi shortcut compatibility            | `Enter`, `Ctrl-C`, `Ctrl-G`, `Ctrl-P`, `Tab`                           | Pi-owned or protected shortcuts; use `:mapcheck <key>` to inspect ownership.                    |

<!-- diagnostic-actions:vimmode.doctor -->
<!-- diagnostic-actions:vimmode.actions -->
<!-- diagnostic-actions:vimmode.keymap -->
<!-- diagnostic-actions:vimmode.mapcheck -->
<!-- diagnostic-actions:vimmode.help -->
<!-- diagnostic-actions:vimmode.features -->
<!-- diagnostic-actions:vimmode.messages -->
<!-- diagnostic-actions:vimmode.inspect -->

Diagnostic/help metadata IDs are for discovery only: `vimmode.doctor`, `vimmode.actions`, `vimmode.keymap`, `vimmode.mapcheck`, `vimmode.help`, `vimmode.features`, `vimmode.messages`, and `vimmode.inspect` are not accepted by `piVimMode.keymap.actions` and cannot dispatch from user keybindings. Use canonical `prompt.transform.*` IDs for prompt transform keybindings. Legacy `promptTransform.*` names remain diagnostics-only search aliases for one transition release and are rejected in config with a warning naming the canonical ID.

Non-goals: no public plugin action API, diagnostic action keybinding dispatch, runtime `:map`, runtime `:action`, Vimscript, Neovim Lua, full Vim help tags, help pager, or broad quickref parity.

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
| `Ctrl-r`            | redo most recent prompt edit undone by normal-mode `u`                  |

Counts work for supported edits:

```text
3x    delete 3 characters
2dd   delete 2 lines
3>>   indent 3 lines from cursor line
2<<   dedent 2 lines from cursor line
5~    toggle case across 5 characters on current line
10<C-a> increment number by 10
```

Dot-repeat is intentionally finite. It repeats supported recorded normal-mode changes such as `x`, `D`, `C`, `Ctrl-a`, `Ctrl-x`, `~`, `r`, `s`, `S`, `dd`, `cc`, `>>`, `<<`, operator motions, and text-object changes. It does not replay arbitrary insert-mode text, macros, Ex substitutions, visual-mode edits, joins, or pastes.

Redo is intentionally prompt-local and linear. `Ctrl-r` restores the latest text/cursor state undone by normal-mode `u`, remains a safe no-op when no redo state exists, survives cursor movement, and clears when a new text edit creates a different branch. pi-vimmode does not implement Vim's undo tree, redo counts, `:redo`, `g-`, or `g+`.

## Operators and operator motions

Supported operators:

- `d` delete
- `c` change, then enter insert
- `y` yank
- `>` indent line-only shift
- `<` dedent line-only shift

Line-only shift examples:

```text
>>   indent current line by two spaces
<<   dedent current line by one tab, two spaces, or one space
3>>  indent current line and next two lines
2<<  dedent current line and next line
```

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

Operator motions are smaller than Vim's full grammar. Motions such as `h`, `l`, `gg`, `G`, and `%` remain normal/visual motions unless future buffer range semantics are added. Shift operators are line-only in normal mode: arbitrary `>{motion}`, `<{motion}`, `>iw`, `>/query`, and mark-based shift ranges are unsupported safe no-ops. In visual modes, counts before `>` or `<` change shift depth, so `2>` indents selected/touched lines by two levels.

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
| `if` / `af`               | inner/around Markdown code fence            |
| `ih` / `ah`               | inner/around Markdown heading section       |
| `il` / `al`               | inner/around Markdown list item             |
| `it` / `at`               | inner/around XML-ish tag                    |
| `ie` / `ae`               | inner/around pasted error block             |

Examples:

```text
diw   delete current word
ci"   change text inside nearest double quotes on current line
da)   delete parenthesized expression including delimiters
ya{   yank braced block including braces
daf   delete whole Markdown code fence
cih   change body of current Markdown heading section
yal   yank current Markdown list item
```

Limitations:

- Word objects use whitespace boundaries.
- Quote objects search current line.
- Bracket objects balance delimiters in prompt text, but do not implement Vim's full syntax awareness.
- Prompt-native objects use conservative line-oriented scanning, not full Markdown/XML parsing.
- XML-ish tags support matching `<name ...>` / `</name>` pairs and ignore self-closing tags.
- Error block detection is heuristic and stops at blank or unrelated prose lines.

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

<!-- runtime-help:search -->

## Prompt search

`/` starts literal forward search in current prompt. `?` starts literal backward search. Type query text, then press `Enter`. `n` repeats last search direction and `N` searches opposite direction. Matches wrap around the prompt.

Examples:

```text
/error⏎     move to next literal error
?error⏎     move to previous literal error
/⏎          recall previous successful query, search forward
?⏎          recall previous successful query, search backward
n           repeat same direction
N           repeat opposite direction
d/error⏎   delete through next literal error match
y?TODO⏎    yank through previous literal TODO match
/\rTODO|FIXME⏎  bounded regex search
```

Search workbench behavior:

- `/` and `?` render a width-safe workbench row below the prompt and shrink the prompt viewport by one row while pending.
- `Up` / `Down` navigate prompt-local in-memory search history for the current editor instance.
- Successful searches enter history; misses, invalid regex, and rejected bounded regex patterns do not.
- Empty `/` or `?` recalls the last successful query and matcher mode.
- Search is literal by default. Prefix a pending query with `\r` to opt into bounded JavaScript regex matching.
- Regex search bounds: pattern length 256, prompt text length 50,000 UTF-16 code units, and match-count cap 10,000. Invalid, too-large, or zero-length regex matches are rejected without prompt mutation.

Visual search moves the active cursor while preserving the visual anchor.

Search highlighting:

- Successful `/`, `?`, `n`, and `N` can highlight matches.
- Current match can use distinct styling.
- Highlight rendering is capped by `piVimMode.search.maxHighlights`.
- Precedence is: cursor, visual selection, current search match, other search matches, plain text.
- Search highlight can clear on cancelled search or insert-mode transition depending on settings.

Limitations:

- No search offsets, Vim magic modes, Vim highlight groups, or search across previous prompts.
- Regex mode is bounded mitigation, not a sandboxed regex engine.

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
- `>` / `<` indents or dedents every touched line and returns normal.
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
- `y`, `d`, `x`, `c`, `r{char}`, `~`, `>` / `<`, mark jumps, named register targeting, and `:` work linewise.
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
- `>` / `<` indents or dedents every line touched by the block, regardless of selected columns.
- `I` starts block insert before block on each selected line; typed text is applied when `Esc` is pressed.
- `A` starts block append after block on each selected line; typed text is applied when `Esc` is pressed.
- `:` opens Ex command-line with visual line range marker `'<,'>` prefilled.

Example:

```text
Ctrl-v jj I- Esc
```

Adds `-` before the selected block column on three lines.

<!-- runtime-help:ex -->

## Ex command-line

Normal-mode `:` opens a dedicated Ex row below the prompt. Visual `:` opens the same row with `'<,'>` prefilled and keeps the original selection highlighted while editing the command.

Supported commands:

```vim
:s/old/new/
:%s/old/new/g
:2,4s#old/path#new/path#g
:.,$substitute/old/new/i
:2;.+1s/old/new/g
:'<,'>s/old/new/g
:delete      " alias :d
:yank        " alias :y
:put         " alias :pu
:2,4copy$-1  " alias :t
:3,4move0    " alias :m
:join        " alias :j
:nohlsearch " alias :noh
:quote
:unquote
:bulletize
:fence ts
:indent
:dedent
:reflow 72
:vimdoctor
:keymap redo
:mapcheck ctrl+p
:actions search
:help search
:features nohlsearch
:messages
```

Supported ranges:

- omitted range: current line
- `%`: whole prompt
- `'<,'>`: captured visual range
- numeric line address, e.g. `2`
- `.`: current line
- `$`: last line
- single signed offset on a single-line address, e.g. `.+1`, `$-2`, `3+2`, `3-1`
- comma range, e.g. `2,4`, `.,$`, `$-1,$`
- semicolon range, e.g. `2;.+2`; first address becomes the base for resolving the second address, so `.` in the second address means line 2 here
- normal-mode count before `:`, e.g. `3:` pre-fills a concrete clamped range

Supported destination addresses for `:copy`/`:t` and `:move`/`:m`:

- `0`: before the first prompt line
- numeric line address, e.g. `4`: after that line
- `.`: after current line
- `$`: after last line
- single signed offset on numeric, `.`, or `$` destinations, e.g. `$-1`, `.+1`, `3-1`

Supported substitution flags:

- `g`: replace every non-overlapping match per line
- `i`: case-insensitive match
- `r`: opt into bounded JavaScript regex pattern matching
- `n`: count matches only, report the count, and leave prompt text unchanged
- `e`: suppress the no-match error and report `0 substitutions` instead

Important semantics:

- Pattern matching is literal by default. Add `r` to use bounded regex, e.g. `:%s/TODO|FIXME/done/gr`.
- Replacement text is always literal. `&`, `$1`, and `\1` insert literally, even in regex mode.
- Empty replacement is valid.
- Empty pattern is an error.
- Delimiter can be any printable non-alphanumeric, non-whitespace, non-backslash character.
- `:delete` removes addressed lines and writes the deleted linewise text to the unnamed register.
- `:yank` copies addressed lines to the unnamed register without editing prompt text.
- `:put` inserts unnamed register text as prompt-buffer lines after the addressed range.
- `:delete a` and `:yank a` also write lowercase named register `a` while updating the unnamed register.
- `:delete A` and `:yank A` append to lowercase named register `a` while the unnamed register receives only the latest addressed text.
- `:put a` and `:put A` read lowercase named register `a`; uppercase put reads only and does not append.
- `:copy` duplicates addressed lines after the destination address; destination `0` inserts before line 1.
- `:move` moves addressed lines after the destination address and rejects destinations inside the moved range.
- Destination `0` is only the before-first-line sentinel; offset forms like `0+1` are unsupported.
- `:join` with no explicit range joins current line with next line; explicit ranges join all addressed lines with normalized boundary whitespace.
- `:quote` prefixes addressed lines with Markdown quote syntax `> `.
- `:unquote` removes one leading Markdown quote marker from each addressed quoted line.
- `:bulletize` converts each nonblank addressed line to a Markdown bullet while preserving indentation.
- `:fence [language]` wraps addressed lines in a Markdown code fence with optional language tag.
- `:indent` adds two spaces to each addressed line.
- `:dedent` removes at most one tab, two spaces, or one leading space from each addressed line without deleting content.
- `:reflow [width]` rewraps prose paragraphs to the given width or 80 columns; fenced code, error blocks, blank lines, and bullet lines are preserved.
- `:nohlsearch` clears visible prompt search highlights but keeps repeat-search state for `n`/`N`.
- `:vimdoctor` opens a read-only popup with live customization health, warning count, and first actionable settings warning behind `vim ⚠`.
- `:keymap [query]` opens a read-only popup with effective resolved semantic keymap entries, e.g. `:keymap redo`.
- `:mapcheck <key>` opens a read-only popup explaining mapped, unmapped, protected, or warning-related key ownership, e.g. `:mapcheck ctrl+p`.
- `:actions [query]` opens a read-only popup listing/searching finite supported actions without adding arbitrary Vim grammar.
- `:help [topic]` opens a read-only popup with source-backed runtime help for finite pi-vimmode topics, e.g. `:help search` or `:help ex`.
- `:features [query]` opens a read-only popup listing/searching supported feature areas, commands, actions, limits, and effective runtime state, e.g. `:features nohlsearch` or `:features redo`.
- `:messages` opens a read-only popup with a bounded prompt-local summary of retained recent runtime messages without opening a pager.
- `Esc` cancels command-line input. Normal Ex returns to normal mode; visual Ex restores the original visual mode, anchor, cursor, and highlight.
- `Left` / `Right` / `Home` / `End`, forward delete, `Alt-Left`, `Alt-Right`, and `Ctrl-W` edit the pending Ex command text without editing prompt text.
- `Up` / `Down` navigate prompt-local in-memory Ex history for successful commands in the current editor instance and move the command cursor to the end of the recalled command.
- Enter on an empty command closes the Ex row without a message.
- Substitution is two-phase: first `Enter` highlights matched target text and reports a match count without editing, second unchanged `Enter` applies, `Esc` cancels.
- `:&`, `:&&`, and range-qualified forms such as `:%&` repeat the last successfully applied substitution through the same preview/apply flow.
- Editing or history navigation clears a pending substitution match preview.
- Unsupported command, range, destination, delimiter, argument, flag, register operand, invalid regex, too-large regex input, or zero-length regex match produces transient Ex error text.
- Unsupported range syntax includes repeated offsets such as `.+1-2`, repeated range separators, expression ranges, search addresses, mark addresses, `+cmd` suffixes, and broader Vimscript grammar.
- Successful mutating/editing commands show transient count text such as `2 substitutions`, `1 line deleted`, `3 lines moved`, or `2 lines transformed`.
- Valid read-only help/diagnostic commands open a bounded popup: `:help`, `:help <topic>`, `:features`, `:features <query>`, `:actions`, `:actions <query>`, `:keymap`, `:keymap <action>`, `:mapcheck <key>`, `:messages`, `:vimmode inspect`, and `:vimdoctor`.
- Popup-backed commands do not edit prompt text, registers, marks, search state, visual state, macros, or dot-repeat.
- Mutating command success/error feedback, parser errors, invalid command feedback, substitution preview/apply messages, `:noh`, prompt transforms, and optional no-op feedback stay in the compact Ex/workbench row.
- Compact success/error/info messages stay in the Ex row until the next handled input.
- `Ctrl-C` and `Ctrl-G` reset Vim transient state and delegate to Pi.
- Text-changing Ex commands clear visible prompt search highlights.
- Ex commands do not update dot-repeat. Only documented register operands on `:delete`, `:yank`, and `:put` touch named registers.

Transform examples:

```vim
:'<,'>quote
:2,4bulletize
:'<,'>fence ts
:reflow 72
```

Prompt transform actions can also be bound to normal/visual keys through `piVimMode.keymap.actions` using canonical `prompt.transform.*` IDs:

```json
{
  "piVimMode": {
    "keymap": {
      "actions": {
        "prompt.transform.reflow": ["gq", { "key": "gQ", "args": { "width": 100 } }],
        "prompt.transform.fence": ["gT"],
        "prompt.transform.quote": ["g>"],
        "prompt.transform.unquote": ["g<"]
      }
    }
  }
}
```

Action keybinding presets are opt-in bundles selected with `piVimMode.keymap.actionPresets`; recipes are copy-paste snippets for `piVimMode.keymap.actions`. Both are backed by the same finite canonical action metadata. They are not defaults, not recursive mappings, not runtime `:map`, not `.vimrc`, not plugin API, not diagnostic/help action dispatch, and not Vim/Neovim parity. Run `:features keybindings` or `:features action presets` to discover recommended presets and recipes at runtime.

<!-- runtime-help:keybinding-discovery-popup -->

### Read-only Ex popup and keybinding discovery

Valid read-only Ex help and diagnostic commands open a dedicated bounded read-only overlay popup, similar to Pi picker-style overlay UIs. Popup-backed commands include `:help`, `:help <topic>`, `:features`, `:features <query>`, `:features keybindings`, `:actions`, `:actions <query>`, `:keymap`, `:keymap <action>`, `:mapcheck <key>`, `:messages`, `:vimmode inspect`, and `:vimdoctor`.

`:features keybindings` is the keybinding discovery entry point. The popup summarizes runtime help topics, feature discovery results, action keybinding recipes and presets, canonical `prompt.transform.*` action IDs, accepted configured bindings from `piVimMode.keymap.actions`, the `piVimMode.keymap.actionPresets` surface, customization diagnostics, message-history summaries, inspectability summaries, and hints for `:actions <query>`, `:keymap <action>`, and `:mapcheck <key>`. Detailed setting shapes, defaults, and validation rules remain in [`settings.md`](https://github.com/pekochan069/pi-vimmode/blob/main/docs/settings.md).

When popup content overflows the bounded body, scroll inside the overlay with `j`/`k` or arrow-down/arrow-up to reach hidden rows. The popup scroll position is local overlay state only; it does not edit the prompt, move the prompt cursor, or append `:messages` history. Popup content, popup scroll, popup dismissal, and the output of `:messages` itself are not retained as runtime message history.

Dismiss the popup with `Esc`, `Ctrl-C`, or `Ctrl-G`. Mutating Ex commands, parser errors, edit-flow success/errors, prompt transforms, `:noh`, substitution preview/apply feedback, and optional no-op feedback keep compact inline/workbench behavior rather than opening the read-only popup.

Popup non-goals: no Vim help tags, no command palette, no runtime `:map`, no runtime `:action`, no recursive mappings, no plugin API, no diagnostic/help action keybinding dispatch, no default action keybindings, no persistent logs, and no unbounded output log.

<!-- action-keybinding-preset:paragraph-editing -->
<!-- action-keybinding-preset:markdown-wrapping -->

Preset IDs: `paragraph-editing`, `markdown-wrapping`.

Preset example:

```json
{
  "piVimMode": {
    "keymap": {
      "actionPresets": ["paragraph-editing", "markdown-wrapping"]
    }
  }
}
```

Explicit `piVimMode.keymap.actions` entries override preset-provided entries for the same action ID; explicit empty action arrays clear preset-provided entries.

<!-- action-keybinding-recipe:paragraph-editing -->

Paragraph editing recipe: `prompt.transform.reflow` on `gq`, `prompt.transform.quote` on `g>`, and `prompt.transform.unquote` on `g<`.

<!-- action-keybinding-recipe:markdown-wrapping -->

Markdown wrapping recipe: `prompt.transform.fence` on `gT` with no default language specifier, plus `prompt.transform.quote` on `g>` and `prompt.transform.unquote` on `g<`.

Examples:

```vim
g>    " quote current line
3gq   " reflow current line plus next two lines
gT    " fence current line with no language specifier
vjjg> " quote touched visual lines, then return to normal mode
```

Action keybindings call the same prompt transform behavior as Ex commands, but changed action edits are silent and do not update dot-repeat in this milestone. Visual actions use touched lines; visual-block action transforms are linewise, not rectangular. `piVimMode.promptTransforms.commands` remains the Ex command-name config surface. `piVimMode.promptTransforms.actions` remains the transform enable-flag surface. `piVimMode.keymap.actions` is only for key bindings.

Canonical config IDs are required: `prompt.transform.quote`, `prompt.transform.unquote`, `prompt.transform.bulletize`, `prompt.transform.fence`, `prompt.transform.indent`, `prompt.transform.dedent`, and `prompt.transform.reflow`. Legacy `promptTransform.*` aliases remain searchable in diagnostics for one transition release, but are rejected in config with a warning that names the canonical ID.

Regex substitution bounds: pattern length 256, addressed prompt text length 50,000 UTF-16 code units, and match-count cap 10,000.

Limitations: no confirmation flag (`c`), print/list flags (`p`, `#`, `l`), special Ex registers, quoted Ex register operands such as `:delete \"a`, `:global`, shell/file/window/buffer commands, replacement backrefs, Vimscript evaluation, `.vimrc`, recursive mappings, Neovim Lua, full Vim help tags, a help pager, full interactive command palette, runtime `:map`, runtime `:action`, plugin API, quickref parity, or rectangular visual-block prompt transform actions. Transform command names are configurable through settings but do not add arbitrary Ex grammar.

<!-- runtime-help:runtime-help -->
<!-- runtime-help:customization-diagnostics -->
<!-- runtime-help:prompt-transforms -->

### Runtime help and diagnostics

Runtime help is finite, popup-backed, source-backed, and prompt-local. It reports supported pi-vimmode behavior and limits; it does not read Vim help files or imply Vimscript/Neovim parity.

Examples:

```vim
:help             " entry points
:help search      " prompt search behavior and limits
:help ex          " finite Ex command-line behavior and limits
:features         " feature category summary
:features redo    " supported action and current binding
:features ctrl+p  " protected Pi shortcut ownership
:vimmode inspect  " current prompt-local editor state summary
:messages         " retained recent runtime message summary
```

`:actions` remains action-focused, `:keymap` remains binding-focused, `:mapcheck` explains one key or sequence, and `:vimdoctor` reports retained settings warnings behind `vim ⚠`. Use `:features` for broader feature/limit discovery. Diagnostic/help metadata IDs use the `vimmode.*` namespace for search and docs classification only; they are metadata-only, not bindable, and do not create a plugin action API.

`:vimmode inspect` is read-only and bounded. It summarizes mode, cursor, pending workbench state, selection kind/anchor, register slots/types/lengths, mark slots/positions, macro slots/token counts, search/Ex history counts, retained warning count, and render-layer activity. It does not dump full prompt text, full register contents, raw macro token streams, Vimscript state, or Neovim/runtime internals.

Runtime messages are in-memory for the current editor, bounded to 20 retained entries, and shown by `:messages` in the read-only popup. Popup display, popup scroll/dismissal, and `:messages` output itself do not add retained history entries. There is no message pager, persistent log, `:messages clear`, or full Vim `:messages` parity.

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

<!-- runtime-help:marks -->

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

<!-- runtime-help:macros -->

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
- Pending `/`, `?`, and `:` workbench input plus search/Ex errors, info diagnostics, optional no-op feedback, and substitution match previews render in a dedicated row below the prompt and shrink prompt viewport by one row by default.
- `piVimMode.ui.workbench.reservedRows` can reserve 0-5 width-safe workbench rows; active feedback uses the first reserved row and blank reserved rows keep the prompt viewport height stable.
- Pending workbench input also appears in status with an ellipsis when the pending-status item is enabled.
- Long prompt content wraps and scrolls around cursor with `↑ more` / `↓ more` indicators.
- Cursor styles support `block`, `bar`, and `underline` by mode.
- Terminal cursor-shape hints use best-effort DECSCUSR escapes.
- `bar` cursor enables Pi TUI hardware cursor visibility while interactive, suppresses it while Pi agent work is active, and restores original visibility on reset.

Limitations:

- Search and cursor colors are fixed ANSI styles for now.
- Cursor behavior does not implement full Neovim cursor option parity such as blink timing.
- Unsupported terminals may ignore cursor-shape hints.
- Editing uses Pi cursor coordinates, not full grapheme-cluster Vim semantics. Complex Unicode can differ from Vim.

## Pi shortcut compatibility

Pi remains owner of app-level shortcuts.

- `Enter` submits from base prompt-editing modes when no `/` search or `:` Ex command-line is pending. Pending search uses Enter to complete the search; pending Ex uses Enter to execute the command.
- `Ctrl-C`, `Ctrl-D`, `Ctrl-G`, model/thinking shortcuts, autocomplete controls, external editor shortcuts, and image paste stay Pi-owned.
- Protected Pi shortcut names are rejected from `piVimMode.keymap` with warnings that include the protected key reason. Use `:mapcheck <key>` for runtime ownership details.
- `Ctrl-a`, `Ctrl-x`, and `Ctrl-r` are owned by pi-vimmode only in normal mode for numeric adjustment and redo.

<!-- runtime-help:settings -->

## Configuration features

Most keys map to semantic actions through `piVimMode.keymap`; settings do not add arbitrary Vim grammar.

Examples of configurable features:

- startup mode
- cursor style per mode
- presets (`minimal`, `prompt-safe`, `vim-heavy`) that apply before explicit fields
- semantic key bindings for supported actions
- text object kind/target keys
- allowed operator motions
- status item order
- mode labels and narrow labels
- visual preview width
- cursor position format/base
- macro enablement, slots, replay cap
- mark enablement and slots
- search highlight behavior
- prompt-native structure enablement per target
- prompt transform enablement and command names
- optional no-op feedback (`piVimMode.feedback.noop`) for selected confusing ignored inputs

See [`settings.md`](https://github.com/pekochan069/pi-vimmode/blob/main/docs/settings.md) for complete settings reference.

## Architecture source map

Useful files when verifying feature behavior:

- `src/lifecycle.ts`: extension activation, settings refresh, status, shutdown cursor reset.
- `src/config.ts`: settings defaults, parser, validation, merge precedence, warnings.
- `src/types.ts`: public option and behavior types.
- `src/commands.ts`: finite semantic key parser, counts, text objects, macro control parser.
- `src/buffer.ts`: pure prompt-buffer navigation, edit, search, visual, mark, register, and substitution operations.
- `src/ex.ts`: finite Ex command-line parser.
- `src/runtime-help.ts`: finite runtime help/feature registry and compact help output.
- `src/keybinding-discovery-popup.ts`: source-backed multi-line keybinding discovery popup content.
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
