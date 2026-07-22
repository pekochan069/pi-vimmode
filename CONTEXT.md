# pi-vimmode Context

pi-vimmode brings Vim-style modal editing to Pi prompt input. This glossary names the prompt-editing concepts that must stay precise across docs, specs, and tests.

## Language

**Prompt buffer**:
The current editable prompt text and cursor space inside Pi input. It is not a file buffer and does not imply persistence beyond the editor session.
_Avoid_: File buffer, document buffer

**Line-local character search**:
A Vim-style jump to a target character on the current line, including repeat in same or opposite direction.
_Avoid_: Search

**Prompt search**:
A Vim-style search across the prompt buffer, including forward/backward search and repeated matches.
_Avoid_: Character search, line search

**Ex command-line mode**:
A Vim-style command entry state for line-oriented commands that act on the prompt buffer.
_Avoid_: Vim commands, colon commands

**Ex substitution**:
An Ex command that replaces prompt-buffer text inside an addressed range using `:s`-style syntax.
_Avoid_: Substitute character, `s` command, prompt search

**Prompt transform action**:
A finite prompt-local transformation such as quoting, bulletizing, fencing, indenting, dedenting, or reflowing prompt-buffer lines. It is not an Ex command, even when an Ex command can invoke the same transformation.
_Avoid_: Prompt transform command, generic Vim action, plugin action

**Action keybinding**:
A configured normal/visual-mode key sequence that invokes a prompt transform action. It is not a command alias and does not imply runtime mapping support.
_Avoid_: Ex command name, `:map`, recursive mapping

**Leader key**:
An optional configured key that replaces a leading `<leader>` token as a reusable mapping prefix. When used by normal or visual mappings, it reserves that prefix across normal and visual keymap grammar; it is unset by default and is not itself an action.
_Avoid_: Leader action, leader map

**Keymap grammar**:
The finite set of modal key sequences and prefix/exact matching rules that decide whether prompt input is complete, pending more keys, or invalid. It is not recursive mapping or Vimscript.
_Avoid_: Runtime mapping, `.vimrc`, keybinding parser

**Visual selection**:
The highlighted prompt-buffer range controlled by visual, visual line, or visual block mode. It may be character-, line-, or block-shaped; Ex command-line mode captures only selected lines from it as a visual range marker.
_Avoid_: Ex range, visual range marker, file selection

**Ex range**:
A set of prompt-buffer lines addressed by an Ex command. It may refer to the current prompt line, all prompt lines, selected visual lines, or numeric prompt line ranges; visual mode supplies selected lines, not selected characters or block cells.
_Avoid_: Visual selection, text object

**Visual range marker**:
The editable Ex range text `'<,'>` that refers to the visual Ex range captured when Ex command-line mode opened from visual mode. It is not a persistent local mark or a previous selection.
_Avoid_: Mark, last visual selection

**Ex substitution pattern**:
The literal text matched by v1 Ex substitution. Regex-capable substitution is a later extension, not the default v1 meaning.
_Avoid_: Regex, Vim regex, prompt search query

**Ex error**:
User-visible feedback that an Ex command could not be parsed or applied. An Ex error never edits the prompt buffer.
_Avoid_: Silent no-op, validation warning

### Cursor lifecycle

**Hardware cursor visibility policy**:
Pi's active preference for whether the terminal's hardware cursor is shown. It is independent from terminal cursor shape.
_Avoid_: Cursor style, cursor shape

**Runtime cursor cleanup**:
pi-vimmode teardown while Pi remains active. It restores Pi's captured hardware cursor visibility policy.
_Avoid_: Shutdown cleanup, exit cleanup

**Terminal-exit cursor cleanup**:
pi-vimmode teardown while Pi is exiting. It leaves final hardware cursor visibility to Pi while resetting pi-vimmode's cursor shape.
_Avoid_: Runtime cleanup, session shutdown cleanup

## Example dialogue

Developer: “Should this hardening change add search?”
Domain expert: “No prompt search. It may verify existing line-local character search if the docs already claim it.”
Developer: “So `f/F/t/T` belongs to line-local character search, while `/`, `?`, `n`, and `N` belong to prompt search?”
Domain expert: “Yes.”

Developer: “Should `:%s/old/new/g` be called a Vim command?”
Domain expert: “Use Ex substitution. It runs from Ex command-line mode, acts on an Ex range, and v1 matches a literal Ex substitution pattern.”
Developer: “If visual mode opens `:'<,'>s/old/new/g`, does `'<,'>` mean local marks?”
Domain expert: “No. That visual range marker only refers to the captured selected lines for this Ex command.”

Developer: “If `gq` reflows the prompt, is `gq` a prompt transform action?”
Domain expert: “No. Reflow is the prompt transform action. `gq` is an action keybinding that invokes it. It is not an Ex command name or a recursive mapping.”
