# prompt-buffer-operations Specification

## Purpose

TBD - created by archiving change deepen-buffer-ts-prompt-buffer-module. Update Purpose after archive.

## Requirements

### Requirement: Prompt buffer exposes operation-level navigation

The prompt buffer module SHALL expose navigation operations that resolve cursor targets for supported prompt motions without requiring callers to compose low-level line, offset, or clamp helpers.

#### Scenario: Navigate to structural buffer targets

- **WHEN** caller requests a supported structural navigation target such as buffer start, buffer end, first non-blank column, word motion, line boundary, or matching pair
- **THEN** the prompt buffer module returns the normalized cursor position for that target

#### Scenario: Navigation handles invalid or missing targets safely

- **WHEN** caller requests navigation from an out-of-bounds cursor or a matching pair that does not exist
- **THEN** the prompt buffer module clamps the cursor and returns a safe no-op or undefined target according to the operation contract

### Requirement: Prompt buffer owns visual operation mechanics

The prompt buffer module SHALL expose visual selection operations that compute selected text, summaries, delete/change results, yank registers, and linewise behavior from anchor and active positions.

#### Scenario: Characterwise visual operation executes

- **WHEN** caller performs a supported characterwise visual yank, delete, or change operation with anchor and active positions
- **THEN** the prompt buffer module returns the selected register or edit result with cursor placement matching existing visual semantics

#### Scenario: Linewise visual operation executes

- **WHEN** caller performs a supported visual line yank, delete, or change operation with anchor and active positions
- **THEN** the prompt buffer module operates on whole selected lines and returns linewise register or edit result semantics

### Requirement: Prompt buffer owns linewise operations

The prompt buffer module SHALL expose linewise prompt edit operations for current-line delete, change, yank, open above, open below, and join.

#### Scenario: Current line operation executes

- **WHEN** caller requests a supported current-line operation at a cursor position
- **THEN** the prompt buffer module returns the appropriate edit result or line register while preserving editable empty-prompt behavior

#### Scenario: Join line operation handles last line

- **WHEN** caller requests join on the last line of the prompt
- **THEN** the prompt buffer module returns a no-op result without corrupting prompt text or cursor state

### Requirement: Prompt buffer owns operator-motion operations

The prompt buffer module SHALL expose operator-motion operations for supported delete, change, and yank commands without requiring callers to manually compute text ranges.

#### Scenario: Delete or change by motion executes

- **WHEN** caller requests delete or change with a supported motion from a cursor position
- **THEN** the prompt buffer module computes the affected range and returns an edit result with matching register and cursor semantics

#### Scenario: Yank by motion executes

- **WHEN** caller requests yank with a supported motion from a cursor position
- **THEN** the prompt buffer module computes the affected range and returns the matching characterwise register without mutating prompt text

### Requirement: Prompt buffer owns paste operations

The prompt buffer module SHALL expose paste operations for characterwise and linewise registers both before and after the cursor or current line.

#### Scenario: Character register paste executes

- **WHEN** caller pastes a characterwise register before or after the cursor
- **THEN** the prompt buffer module inserts the text at the correct prompt offset and returns the resulting cursor position

#### Scenario: Line register paste executes

- **WHEN** caller pastes a linewise register before or after the current line
- **THEN** the prompt buffer module inserts whole lines at the correct line boundary and returns the resulting cursor position

#### Scenario: Empty register paste is safe

- **WHEN** caller pastes an empty or missing register
- **THEN** the prompt buffer module returns a no-op edit result

### Requirement: Prompt buffer operation behavior is covered by focused tests

The implementation SHALL validate prompt buffer operation behavior with focused unit tests covering navigation, visual operations, linewise operations, operator-motion operations, and paste.

#### Scenario: Buffer operation tests run

- **WHEN** the project validation suite runs
- **THEN** buffer operation tests cover the operation-level APIs without depending on Pi runtime objects

### Requirement: Prompt buffer operations accept typed resolved ranges

The prompt buffer module SHALL expose operation-level APIs that consume typed resolved line, character, block, and destination ranges without requiring callers to manually compose low-level range normalization or clamp helpers.

#### Scenario: Linewise operation consumes line range

- **WHEN** caller requests a supported Ex line operation with a typed resolved line range
- **THEN** the prompt buffer module performs the operation using existing linewise semantics for text edits, registers, cursor placement, and safe no-op/error results

#### Scenario: Characterwise operation consumes character range

- **WHEN** caller requests a supported delete, change, or yank operation with a typed resolved character range
- **THEN** the prompt buffer module performs the operation using existing characterwise register and cursor semantics

#### Scenario: Visual block operation consumes block range

- **WHEN** caller requests a supported visual-block operation with a typed resolved block range
- **THEN** the prompt buffer module preserves existing block selection and edit semantics instead of coercing the target to whole lines

#### Scenario: Destination operation consumes destination target

- **WHEN** caller requests a supported copy, move, paste, or put-style operation with a typed destination target
- **THEN** the prompt buffer module applies the operation relative to that destination while preserving existing before-first-line behavior where supported

### Requirement: Prompt buffer range operations preserve existing side effects

The prompt buffer module SHALL preserve existing prompt-buffer edit semantics when operations are driven by typed range results.

#### Scenario: Registers remain command-specific

- **WHEN** typed range operations drive Ex delete, Ex yank, modal yank, modal delete, or visual operations
- **THEN** unnamed and named register updates match the existing command-specific behavior

#### Scenario: Cursor placement remains operation-specific

- **WHEN** typed range operations change prompt text
- **THEN** cursor placement follows the existing prompt-buffer operation contract for that command rather than a generic range resolver default

#### Scenario: Invalid typed range is safe

- **WHEN** caller supplies a typed range result that represents an invalid, missing, reversed, or out-of-bounds target
- **THEN** the prompt buffer module returns a safe no-op or error result according to the operation contract and does not corrupt prompt text

### Requirement: Prompt buffer range behavior is covered by focused tests

The implementation SHALL validate typed range integration with focused tests that do not depend on Pi runtime objects.

#### Scenario: Range operation tests run

- **WHEN** the project validation suite runs
- **THEN** tests cover line range operations, character range operations, block range operations, destination operations, invalid typed range safety, and preservation of existing operation-level APIs

#### Scenario: Modal and adapter tests stay integration-focused

- **WHEN** modal or `VimEditor` tests exercise behavior backed by typed ranges
- **THEN** those tests assert user-visible editor state and Pi adapter effects rather than duplicating low-level range arithmetic

### Requirement: Prompt buffer owns operator character-search operations

The prompt buffer module SHALL expose operation-level APIs that resolve and apply line-local character-search operator targets without requiring modal callers to compose raw offsets or inclusive selection ranges.

#### Scenario: Delete by find-forward character search

- **WHEN** caller requests a delete operation from a cursor through the next matching character on the current line
- **THEN** the prompt buffer removes the range including the matched character, returns the removed text as a character register, and places the cursor at the range start

#### Scenario: Delete by till-forward character search

- **WHEN** caller requests a delete operation from a cursor until before the next matching character on the current line
- **THEN** the prompt buffer removes the non-empty range before the matched character, returns the removed text as a character register, and preserves the matched character in prompt text

#### Scenario: Yank by backward character search

- **WHEN** caller requests a yank operation using a backward find or till character-search target on the current line
- **THEN** the prompt buffer returns the addressed characterwise register without mutating prompt text

#### Scenario: Change by character search preserves edit semantics

- **WHEN** caller requests a change operation using a valid character-search target
- **THEN** the prompt buffer returns the same edit result semantics as delete for the addressed range so the modal layer can enter insert mode without recomputing range math

#### Scenario: Missing character target is safe

- **WHEN** caller requests an operator character-search operation and the target character does not exist in the requested direction on the current line
- **THEN** the prompt buffer returns a safe no-op edit result or no register and does not corrupt prompt text

#### Scenario: Empty till range is safe

- **WHEN** caller requests a till-forward or till-backward operator range whose resolved range would be empty
- **THEN** the prompt buffer returns a safe no-op edit result or no register instead of deleting or yanking the cursor character

#### Scenario: Character-search operations remain line-local

- **WHEN** a matching character exists only on another prompt line
- **THEN** the prompt buffer treats the target as missing for operator character-search operations

### Requirement: Prompt buffer exposes WORD and previous-end navigation

The prompt buffer module SHALL expose pure prompt-local navigation helpers for WORD and previous-end word targets without requiring modal callers to compose raw offsets, line starts, or clamp behavior.

#### Scenario: WORD navigation resolves whitespace-delimited targets

- **WHEN** caller requests WORD-forward, WORD-backward, or WORD-end navigation from a normalized or out-of-bounds cursor
- **THEN** the prompt buffer clamps the cursor, resolves a whitespace-delimited WORD target within the current prompt, and returns the normalized cursor position

#### Scenario: Previous-end navigation resolves backward targets

- **WHEN** caller requests previous word-end or previous WORD-end navigation from a cursor after an earlier word or WORD token
- **THEN** the prompt buffer returns the end position of the addressed previous token using the requested boundary class

#### Scenario: Missing previous-end target is safe

- **WHEN** caller requests previous word-end or previous WORD-end navigation from the first token or prompt start
- **THEN** the prompt buffer returns a safe no-op target or undefined target according to the operation contract and does not corrupt prompt text

#### Scenario: Counted navigation repeats safely

- **WHEN** caller requests a counted WORD or previous-end navigation target
- **THEN** the prompt buffer repeats target resolution up to the count and stops at the prompt boundary when no further target exists

### Requirement: Prompt buffer owns operator ranges for WORD and previous-end motions

The prompt buffer module SHALL resolve delete, change, and yank ranges for WORD and previous-end motions without requiring modal callers to manually compute character offsets or inclusivity.

#### Scenario: Delete by WORD motion executes

- **WHEN** caller requests delete from a cursor through an available `W`, `B`, or `E` target
- **THEN** the prompt buffer removes the addressed characterwise range, returns the removed text as an unnamed character register, and places the cursor according to existing delete-by-motion semantics

#### Scenario: Yank by previous-end motion executes

- **WHEN** caller requests yank from a cursor through an available `ge` or `gE` target
- **THEN** the prompt buffer returns the addressed characterwise register without mutating prompt text

#### Scenario: Change by previous-end motion preserves edit semantics

- **WHEN** caller requests change using a valid previous-end target
- **THEN** the prompt buffer returns the same edit result semantics as delete for the addressed range so the modal layer can enter insert mode without recomputing range math

#### Scenario: Missing WORD operator target is safe

- **WHEN** caller requests an operator range for a WORD or previous-end motion and no valid non-empty range exists
- **THEN** the prompt buffer returns a safe no-op edit result or no register and does not corrupt prompt text

### Requirement: Prompt buffer word helpers preserve small-word and WORD semantics

The prompt buffer SHALL preserve existing small-word and WORD navigation and operator-range behavior when word-motion helper logic is shared internally.

#### Scenario: Small-word navigation preserves punctuation boundaries

- **WHEN** caller requests lowercase word navigation over punctuation-heavy prompt text such as `foo/bar baz qux`, `--flag value`, or `/tmp/a-b next`
- **THEN** the prompt buffer treats keyword runs and punctuation runs as separate small-word targets for `w`, `e`, `b`, and `ge`

#### Scenario: WORD navigation preserves whitespace boundaries

- **WHEN** caller requests uppercase WORD navigation over punctuation-heavy prompt text such as `foo/bar baz qux`, `--flag value`, or `/tmp/a-b next`
- **THEN** the prompt buffer treats each contiguous non-whitespace span as one WORD target for `W`, `E`, `B`, and `gE`

#### Scenario: Counted previous-end navigation preserves boundaries

- **WHEN** caller requests counted `ge` or `gE` navigation from within or after prompt tokens
- **THEN** the prompt buffer repeats previous-end target resolution using the requested small-word or WORD boundary model and stops safely at prompt boundaries

#### Scenario: Operator ranges use the same word boundary model as navigation

- **WHEN** caller requests delete, change, or yank by small-word or WORD motion
- **THEN** the prompt buffer computes the characterwise operator range using the same boundary model as the corresponding navigation target and preserves existing register, cursor, and no-op semantics

### Requirement: Prompt buffer substitution helpers preserve line-range semantics

The prompt buffer SHALL preserve existing literal and regex substitution line-range behavior when traversal and result assembly are shared internally.

#### Scenario: Literal line-range substitution preserves counts ranges and cursor

- **WHEN** caller requests literal substitution over a bounded prompt line range with global or non-global matching
- **THEN** the prompt buffer replaces only addressed line matches, reports the same match count, reports preview ranges on the original line positions, clamps the cursor to the resulting prompt text, and sets `changed` according to text equality

#### Scenario: Regex line-range substitution preserves success shape and literal replacement

- **WHEN** caller requests regex substitution over a bounded prompt line range with a valid pattern
- **THEN** the prompt buffer returns an `ok: true` result with the same edit, match count, preview ranges, literal replacement text behavior, and cursor clamping as before

#### Scenario: Regex substitution errors remain hard failures

- **WHEN** caller requests regex substitution with an invalid pattern, empty pattern, pattern that can match empty text, too-long pattern or subject, or too many matches
- **THEN** the prompt buffer returns the existing `ok: false` message shape without edit data and does not partially apply replacements

#### Scenario: Missing and identical substitution matches preserve no-op behavior

- **WHEN** caller requests literal or regex substitution that finds no matches or replaces text with identical content
- **THEN** the prompt buffer preserves the original prompt text, reports the existing match count semantics, clamps the cursor safely, and reports `changed: false`

### Requirement: Prompt buffer exposes paragraph navigation

The prompt buffer module SHALL expose pure prompt-local paragraph navigation using contiguous nonblank line runs separated by whitespace-only blank lines.

#### Scenario: Forward paragraph navigation resolves next paragraph

- **WHEN** caller requests forward paragraph navigation from inside a nonblank paragraph and a later paragraph exists
- **THEN** the prompt buffer returns the first-column position of the next paragraph's first nonblank line

#### Scenario: Forward paragraph navigation resolves prompt end

- **WHEN** caller requests forward paragraph navigation from inside the last nonblank paragraph
- **THEN** the prompt buffer returns the normalized prompt end position without corrupting text

#### Scenario: Backward paragraph navigation resolves paragraph start

- **WHEN** caller requests backward paragraph navigation from inside a nonblank paragraph
- **THEN** the prompt buffer returns the first-column position of the current paragraph start, or the previous paragraph start when already at the current paragraph start

#### Scenario: Counted paragraph navigation repeats safely

- **WHEN** caller requests counted forward or backward paragraph navigation
- **THEN** the prompt buffer repeats paragraph target resolution up to the count and clamps safely at prompt start or prompt end when fewer targets exist

#### Scenario: Separator-only prompt is safe

- **WHEN** caller requests paragraph navigation for an empty prompt or a prompt containing only whitespace separator lines
- **THEN** the prompt buffer returns a safe normalized no-op target and does not corrupt text

### Requirement: Prompt buffer owns operator ranges for paragraph motions

The prompt buffer module SHALL resolve delete, change, and yank ranges for paragraph motions without requiring modal callers to compose line, offset, or separator math.

#### Scenario: Forward paragraph operator range includes separator boundary

- **WHEN** caller requests an operator range from inside a paragraph through a forward paragraph target before a later paragraph
- **THEN** the prompt buffer returns a finite characterwise range from the cursor through the boundary before the later paragraph

#### Scenario: Backward paragraph operator range resolves toward paragraph start

- **WHEN** caller requests an operator range from inside a paragraph through a backward paragraph target
- **THEN** the prompt buffer returns a finite characterwise range between the resolved paragraph boundary and the cursor

#### Scenario: Paragraph operator range preserves operation semantics

- **WHEN** caller requests delete, change, or yank using a valid paragraph motion range
- **THEN** delete and change return edit results with unnamed character-register text and cursor placement, while yank returns the addressed character register without mutating prompt text

#### Scenario: Empty paragraph operator range is safe

- **WHEN** caller requests a paragraph operator range whose resolved target equals the cursor position
- **THEN** the prompt buffer returns a safe no-op edit result or no register and does not corrupt prompt text

### Requirement: Prompt buffer resolves paragraph text-object ranges

The prompt buffer module SHALL resolve inner and around paragraph text-object ranges using the same blank-line paragraph model as paragraph motions.

#### Scenario: Inner paragraph range excludes separators

- **WHEN** caller requests an inner paragraph text object from inside a nonblank paragraph
- **THEN** the prompt buffer resolves the paragraph body range without leading or trailing blank separator lines

#### Scenario: Around paragraph range includes adjacent separator

- **WHEN** caller requests an around paragraph text object from inside a nonblank paragraph
- **THEN** the prompt buffer resolves the paragraph body plus the following blank separator group when present, otherwise the preceding blank separator group when present

#### Scenario: Paragraph text object operation preserves existing contracts

- **WHEN** caller deletes, changes, or yanks a resolved paragraph text object
- **THEN** the prompt buffer uses the existing text-object edit/register contracts for characterwise text objects

#### Scenario: Missing paragraph text object is safe

- **WHEN** caller requests a paragraph text object from an empty prompt, separator-only prompt, or cursor position outside any nonblank paragraph
- **THEN** the prompt buffer returns no range or a safe no-op result without changing text, cursor, or registers

### Requirement: Prompt buffer exposes insert-safe movement operations

The prompt buffer module SHALL expose pure prompt-local movement helpers for insert-mode word and line-boundary actions without requiring modal callers to compose raw offsets.

#### Scenario: Insert word movement uses small-word semantics

- **WHEN** caller requests insert word movement backward or forward from a normalized or out-of-bounds cursor
- **THEN** the prompt buffer clamps the cursor, resolves the target with existing lowercase small-word semantics, and returns a safe cursor position without changing prompt text

#### Scenario: Insert line-boundary movement resolves current line

- **WHEN** caller requests insert movement to current line start or current line end
- **THEN** the prompt buffer returns column `0` or the current line length for the clamped cursor line without changing prompt text

#### Scenario: Insert movement no-ops at prompt boundaries

- **WHEN** caller requests insert movement beyond prompt start, prompt end, line start, or line end
- **THEN** the prompt buffer returns a safe no-op cursor position and does not corrupt prompt text

### Requirement: Prompt buffer exposes insert-safe delete operations

The prompt buffer module SHALL expose prompt-local insert delete helpers that edit text without returning or writing Vim registers.

#### Scenario: Insert word-backward delete uses small-word target

- **WHEN** caller requests insert delete-word-backward from a cursor after prompt text
- **THEN** the prompt buffer deletes from the existing small-word backward target to the cursor and returns an `EditResult` without `register`

#### Scenario: Insert word-forward delete uses small-word target

- **WHEN** caller requests insert delete-word-forward from a cursor before prompt text
- **THEN** the prompt buffer deletes from the cursor to the existing small-word forward target and returns an `EditResult` without `register`

#### Scenario: Insert line-backward delete stays on current line

- **WHEN** caller requests insert delete-line-backward from a cursor after the current line start
- **THEN** the prompt buffer deletes from the cursor back to column `0` of the current line, never joins with the previous line, and returns an `EditResult` without `register`

#### Scenario: Insert line-forward delete removes text to line end

- **WHEN** caller requests insert delete-line-forward from a cursor before current line end
- **THEN** the prompt buffer deletes from the cursor to current line end and returns an `EditResult` without `register`

#### Scenario: Insert line-forward at EOL deletes exactly one newline

- **WHEN** caller requests insert delete-line-forward at current line end and another prompt line follows
- **THEN** the prompt buffer deletes exactly the newline between the lines, joins them without trimming spaces, and returns an `EditResult` without `register`

#### Scenario: Insert delete no-ops at prompt boundaries

- **WHEN** caller requests insert delete-word-backward at prompt start, delete-word-forward at prompt end, delete-line-backward at line start, or delete-line-forward at final line end
- **THEN** the prompt buffer returns a safe unchanged `EditResult` without `register`
