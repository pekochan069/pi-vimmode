# prompt-range-algebra Specification

## Purpose
TBD - created by archiving change prompt-range-algebra-kernel. Update Purpose after archive.
## Requirements
### Requirement: Prompt range algebra resolves finite prompt-local references

The Vim editor SHALL provide a prompt-local range algebra that resolves only supported finite range references over the current prompt buffer.

#### Scenario: Resolve supported Ex line references

- **WHEN** a supported Ex command addresses current line, last line, numeric line, whole prompt, captured visual range, or a signed line offset from those supported addresses
- **THEN** range algebra resolves the reference to a bounded prompt line range or destination according to the command context

#### Scenario: Resolve semicolon range base

- **WHEN** an Ex range uses a semicolon between two supported single-line addresses
- **THEN** range algebra resolves the first address, uses it as the current-line base for the second address, and returns the inclusive line range between the resolved addresses

#### Scenario: Wrap modal-compatible range targets

- **WHEN** modal or buffer code has an already-resolved line, character, block, or destination target
- **THEN** range algebra can wrap that target as a typed range result compatible with prompt-buffer operation semantics without changing user-visible behavior

#### Scenario: Reject unsupported range syntax

- **WHEN** a range reference uses unsupported Vimscript, expression ranges, recursive commands, unsupported separators, missing captures, missing marks, missing search matches, or out-of-bounds lines
- **THEN** range algebra returns a readable range error and no prompt-buffer mutation is requested

### Requirement: Prompt range algebra returns typed range results

The Vim editor SHALL represent resolved range targets as typed results instead of requiring callers to compose raw offsets, line clamps, or selection bounds.

#### Scenario: Return line range for Ex line commands

- **WHEN** an Ex delete, yank, put, substitution, join, copy, move, or transform command resolves a valid line address or range
- **THEN** range algebra returns a typed inclusive line range using zero-based internal line indexes

#### Scenario: Return destination for Ex copy and move

- **WHEN** an Ex copy or move command resolves a valid destination address
- **THEN** range algebra returns a typed destination that preserves the existing destination-zero before-first-line sentinel behavior

#### Scenario: Return character and block range wrappers

- **WHEN** caller provides an already-resolved characterwise target or visual-block target
- **THEN** range algebra returns a typed character range or block range rather than collapsing it into a line range

#### Scenario: Preserve visual Ex line capture semantics

- **WHEN** Ex command-line mode was opened from visual, visual-line, or visual-block mode and `'<,'>` is used
- **THEN** range algebra resolves the captured lines touched at Ex entry time, not the editable Ex command text cursor and not only selected characters or block cells

### Requirement: Prompt range algebra is side-effect free

The Vim editor SHALL keep range parsing and resolution side-effect free; only later modal or prompt-buffer operations may mutate editor state after successful resolution.

#### Scenario: Resolution does not mutate state

- **WHEN** a valid range is parsed and resolved
- **THEN** prompt text, registers, marks, dot-repeat state, search state, visible highlights, visual state, Ex history, messages, cursor position, and Pi adapter state remain unchanged by resolution itself

#### Scenario: Failed resolution is safe

- **WHEN** range resolution fails because syntax is invalid, a target is missing, or a resolved line is out of bounds
- **THEN** prompt text, registers, marks, dot-repeat state, search state, visible highlights, visual state, Ex history, messages, cursor position, and Pi adapter state remain unchanged by resolution itself

#### Scenario: Resolver consumes state snapshots

- **WHEN** range algebra needs cursor, visual capture, or prompt line count for Ex resolution
- **THEN** callers pass those facts as input data and range algebra does not import modal engine or Pi adapter internals

