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

## Example dialogue

Developer: “Should this hardening change add search?”
Domain expert: “No prompt search. It may verify existing line-local character search if the docs already claim it.”
Developer: “So `f/F/t/T` belongs to line-local character search, while `/`, `?`, `n`, and `N` belong to prompt search?”
Domain expert: “Yes.”
