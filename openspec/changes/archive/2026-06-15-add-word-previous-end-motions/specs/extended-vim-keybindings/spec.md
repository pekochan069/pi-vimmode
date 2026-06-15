## ADDED Requirements

### Requirement: Normal and visual modes support WORD and previous-end word motions

The Vim editor SHALL support explicit whitespace-delimited WORD motions and previous-end word motions in prompt-local normal and visual modes while preserving current lowercase word motion behavior.

#### Scenario: WORD motions move across whitespace-delimited tokens

- **WHEN** the editor is in normal mode with prompt text `run --foo=bar /tmp/a-b` and the cursor starts on `run`
- **THEN** pressing `W` moves to the start of `--foo=bar`, pressing `E` from that token moves to the token end, and pressing `B` from `/tmp/a-b` moves back to the start of `--foo=bar`

#### Scenario: Previous-end motions move to earlier word ends

- **WHEN** the editor is in normal mode with prompt text `alpha beta.gamma /tmp/file` and the cursor is at the start of `/tmp/file`
- **THEN** pressing `ge` moves to the previous lowercase word end using the existing lowercase word boundaries, and pressing `gE` moves to the previous WORD end using whitespace-delimited WORD boundaries

#### Scenario: Counted WORD and previous-end motions repeat targets

- **WHEN** the editor is in normal mode with multiple prompt tokens available in the addressed direction
- **THEN** pressing `2W`, `2B`, `2E`, `2ge`, or `2gE` applies the addressed motion twice or stops at the prompt boundary when no further target exists

#### Scenario: Missing WORD or previous-end target is safe

- **WHEN** the editor is in normal mode and a WORD or previous-end motion has no target in the addressed direction
- **THEN** prompt text, registers, mode, and cursor position remain unchanged except for existing invalidation or no-op feedback behavior

#### Scenario: Visual selection extends with WORD and previous-end motions

- **WHEN** the editor is in visual character mode with an active selection
- **THEN** pressing `W`, `B`, `E`, `ge`, or `gE` moves the active end of the selection using the same prompt-local target semantics as normal mode

## MODIFIED Requirements

### Requirement: Operators support range-safe normal motions

The Vim editor SHALL allow motion-capable normal-mode operators to target every supported normal motion with finite range semantics: `h`, `j`, `k`, `l`, `w`, `b`, `e`, `W`, `B`, `E`, `ge`, `gE`, `0`, `^`, `$`, `gg`, `G`, and `%`.

#### Scenario: Characterwise horizontal operator motions

- **WHEN** the editor is in normal mode and the user presses `dl` or `dh`
- **THEN** the addressed characterwise range is removed and copied to the unnamed character register without involving raw adapter movement

#### Scenario: Linewise vertical and buffer operator motions

- **WHEN** the editor is in normal mode and the user presses `dj`, `dk`, `dgg`, or `dG`
- **THEN** the addressed whole-line range is removed and copied to the unnamed line register

#### Scenario: Matching-pair operator motion

- **WHEN** the editor is in normal mode and the user presses `d%` while the cursor is on a matched pair delimiter
- **THEN** the text through the matching delimiter is removed and copied to the unnamed character register

#### Scenario: WORD operator motion

- **WHEN** the editor is in normal mode and the user presses `dW`, `cE`, or `yB` with an addressed WORD target available
- **THEN** the operator applies to the finite whitespace-delimited WORD range, delete and change write the unnamed character register, change enters insert mode after a changed range, and yank leaves prompt text unchanged

#### Scenario: Previous-end operator motion

- **WHEN** the editor is in normal mode and the user presses `dge` or `ygE` with an addressed previous word end available
- **THEN** the operator applies to the finite characterwise range between the cursor and the resolved previous word or WORD end

#### Scenario: Count after operator applies to supported motions

- **WHEN** the editor is in normal mode and the user presses `d2w`, `d2W`, `d2ge`, `d2j`, or `d2;`
- **THEN** the after-operator count is applied to that finite operator target
