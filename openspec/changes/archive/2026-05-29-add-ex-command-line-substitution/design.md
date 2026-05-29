## Context

pi-vimmode already owns modal prompt editing through `handleModalInput`, prompt-buffer edit helpers, semantic keymap resolution, macro token recording, and width-safe render paths for normal, visual, and search-highlighted states. Existing `/` prompt search demonstrates a minimal pending-input flow, but it renders through status/pending display and only supports literal search.

This change adds Ex command-line mode for line-oriented prompt edits, starting with literal substitution. The domain glossary in `CONTEXT.md` names this as Ex command-line mode and Ex substitution, not generic “Vim commands”; ADR 0001 records the dedicated row layout decision.

## Goals / Non-Goals

**Goals:**

- Add `:` entry from normal and visual modes.
- Implement v1 `:s` / `:substitute` literal substitution over Ex ranges.
- Render Ex input, errors, and success counts in a dedicated extra row below the prompt box.
- Preserve insert-mode Pi delegation, existing register behavior, prompt search boundaries, macro replay, and semantic keymap configuration.

**Non-Goals:**

- Regex-capable substitution.
- Full Ex command coverage (`:w`, `:q`, `:g`, `:nohlsearch`, etc.).
- Full command-line editor behavior, command history, or repeat-substitution commands.
- Offset ranges (`.+1`, `$-2`) or semicolon ranges.
- Special replacement tokens such as `&` or backreferences.

## Decisions

1. **Represent Ex input as modal state, not prompt text.**
   - Add pending Ex state alongside pending search/mark/operator state.
   - The command text is separate from the prompt buffer and only mutates prompt text on successful execution.
   - Alternative rejected: reuse insert mode or prompt text for Ex input, which would blur command input with user prompt content.

2. **Use a dedicated Ex render row.**
   - `VimEditor.render()` should render the prompt editor with one fewer viewport row while Ex input/message state is visible, then append a width-safe Ex row.
   - The row shows active command text while typing and transient plain messages after execution.
   - Alternative rejected: reuse status/pending display; long Ex commands would truncate and future readers would wonder why Ex UI is not command-line-like.

3. **Keep v1 command-line editing minimal.**
   - Active Ex input handles printable characters, Backspace, Enter/Return, and Escape.
   - Backspace edits command text/prefilled visual range text; Escape cancels Ex input.
   - From visual mode, Escape returns to the original visual mode with selection intact; Enter returns to normal after command execution or error.
   - Alternative rejected: full command-line cursor editing, deferred to TODO.

4. **Parse explicit Ex ranges with command text as source of truth.**
   - Supported ranges: implicit current line, `%`, `'<,'>` when captured from visual mode, 1-based numeric addresses, `.`, `$`, and comma ranges.
   - Normal-mode count before `:` prefills a concrete clamped numeric range from current line through count addressed lines.
   - If a visual prefilled `'<,'>` marker is deleted, the command falls back to the command text’s range rules; manually typed `'<,'>` without captured visual range is an Ex error.
   - Invalid ranges are Ex errors and never edit the prompt.

5. **Make substitution literal and line-local.**
   - Patterns and replacements are literal text. Pattern matching starts at the beginning of each addressed line.
   - Without `g`, replace the first match per addressed line; with `g`, replace all non-overlapping matches per addressed line.
   - `i` makes literal matching case-insensitive. Flags are lowercase and limited to `g`/`i` in any order.
   - Empty patterns are Ex errors; empty replacements are valid.
   - Replacement text is literal: `&`, `$1`, and `\1` are inserted as typed.
   - Patterns/replacements cannot span lines in v1.

6. **Use a finite delimiter parser.**
   - Accept any printable non-alphanumeric, non-whitespace, non-backslash delimiter.
   - Support delimiter and backslash escapes only.
   - Allow omitted final delimiter only when no flags are present.
   - Trim leading/trailing command-line whitespace only; internal syntax whitespace remains significant.

7. **Keep Ex substitution side effects narrow.**
   - Successful text-changing substitution emits one prompt edit effect and clears visible prompt search highlights.
   - Cursor returns to the original cursor position, clamped after edits.
   - Ex substitution does not write unnamed/named registers and does not update normal-mode dot repeat state.
   - Matching identical replacements count as successful substitutions but should avoid an edit effect if output is unchanged.

8. **Integrate with existing keymap and macro models.**
   - Add a semantic keymap command for Ex entry, default `:`.
   - Record and replay Ex keystrokes through the existing macro input-token path.
   - Unsupported Ex commands and flags produce readable Ex errors.

## Risks / Trade-offs

- **Extra render row can disturb viewport math** → Mitigate by shrinking prompt renderer viewport by one row while Ex row/message is visible and adding width tests for normal, visual, and search-highlight states.
- **Parser edge cases can drift from docs** → Mitigate with focused parser tests for ranges, delimiters, escapes, flags, empty pattern, omitted delimiter, and invalid commands.
- **Visual `'<,'>` can be confused with marks** → Mitigate via glossary/docs and tests proving it only works with captured visual range.
- **Literal substitution may disappoint Vim regex users** → Mitigate by documenting v1 literal semantics and tracking regex support in `TODOS.md`.
- **Macro replay can expose transient-message state bugs** → Mitigate by clearing transient Ex messages on next handled input and replaying commands through the same live input path.
