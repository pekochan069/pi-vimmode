## ADDED Requirements

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
