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

## Example dialogue

Developer: “Should this hardening change add search?”
Domain expert: “No prompt search. It may verify existing line-local character search if the docs already claim it.”
Developer: “So `f/F/t/T` belongs to line-local character search, while `/`, `?`, `n`, and `N` belong to prompt search?”
Domain expert: “Yes.”

Developer: “Should `:%s/old/new/g` be called a Vim command?”
Domain expert: “Use Ex substitution. It runs from Ex command-line mode, acts on an Ex range, and v1 matches a literal Ex substitution pattern.”
Developer: “If visual mode opens `:'<,'>s/old/new/g`, does `'<,'>` mean local marks?”
Domain expert: “No. That visual range marker only refers to the captured selected lines for this Ex command.”
