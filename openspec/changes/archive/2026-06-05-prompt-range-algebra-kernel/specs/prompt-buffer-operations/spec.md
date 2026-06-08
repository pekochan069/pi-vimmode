## ADDED Requirements

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
