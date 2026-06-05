## ADDED Requirements

### Requirement: Ex line ranges support finite address offsets

The Vim editor SHALL support signed line offsets on finite Ex line addresses for supported line-oriented Ex commands.

#### Scenario: Offset from current line executes

- **WHEN** the editor is on prompt line 2 of a four-line prompt and executes `:.,.+1delete`
- **THEN** prompt lines 2 and 3 are deleted, the unnamed register receives those lines as linewise text, and the Ex row reports the deleted line count

#### Scenario: Offset from last line executes

- **WHEN** the editor executes `:$-1,$join` in a prompt with at least two lines
- **THEN** the last two prompt lines are joined according to existing Ex join whitespace and message semantics

#### Scenario: Offset from numeric line executes

- **WHEN** the editor executes `:3+1yank` in a prompt with at least four lines
- **THEN** prompt line 4 is copied to the unnamed register as linewise text and prompt text remains unchanged

#### Scenario: Offset range applies to substitution preview

- **WHEN** the editor previews `:2,2+1s/foo/bar/g` in a prompt where lines 2 and 3 contain matches
- **THEN** substitution preview highlights matches only on prompt lines 2 and 3 and leaves prompt text unchanged until confirmation

#### Scenario: Out-of-bounds offset is rejected

- **WHEN** the editor executes an Ex command with an offset resolving outside prompt-buffer lines such as `:1-1delete` or `:$+1yank`
- **THEN** the editor reports an Ex range error, prompt text remains unchanged, and registers remain unchanged

#### Scenario: Repeated offset is rejected in v1

- **WHEN** the editor executes an Ex command with repeated offset syntax such as `:.+1-2delete`
- **THEN** the editor reports a readable Ex range error, prompt text remains unchanged, and registers remain unchanged

### Requirement: Ex semicolon ranges reset the second address base

The Vim editor SHALL support a finite Ex semicolon range form where the first resolved single-line address becomes the current-line base for resolving the second single-line address.

#### Scenario: Semicolon relative range executes

- **WHEN** the editor executes `:2;.+2delete` in a prompt with at least four lines
- **THEN** prompt lines 2 through 4 are deleted and the unnamed register receives those lines as linewise text

#### Scenario: Semicolon range can use current-line start

- **WHEN** the editor is on prompt line 3 and executes `:.;.-1yank`
- **THEN** the editor reports an Ex range error because the resolved range is reversed and prompt text and registers remain unchanged

#### Scenario: Semicolon range composes with substitution preview

- **WHEN** the editor previews `:2;.+1s/foo/bar/g` in a prompt where lines 2 and 3 contain matches
- **THEN** substitution preview highlights matches only on prompt lines 2 and 3 and leaves prompt text unchanged until confirmation

#### Scenario: Unsupported semicolon forms are rejected

- **WHEN** the editor executes a semicolon range using unsupported broad syntax such as repeated separators, expression ranges, or a missing second address
- **THEN** the editor reports a readable Ex range error and prompt text remains unchanged

### Requirement: Ex copy and move destination addresses support finite offsets

The Vim editor SHALL support signed line offsets on finite Ex destination addresses for copy and move commands while preserving existing destination-zero behavior.

#### Scenario: Copy destination offset executes

- **WHEN** the editor executes `:2copy$-1` in a prompt with at least four lines
- **THEN** prompt line 2 is duplicated after the penultimate line and before the original last line

#### Scenario: Move destination offset executes

- **WHEN** the editor is on prompt line 1 and executes `:4move.+1` in a prompt with at least four lines
- **THEN** prompt line 4 is moved after prompt line 2 and the Ex row reports `1 line moved`

#### Scenario: Destination zero remains before first line

- **WHEN** the editor executes `:2t0` or `:3,4m0` with valid source ranges
- **THEN** existing before-first-line destination behavior is preserved

#### Scenario: Destination zero is not an offset base

- **WHEN** the editor executes a copy or move command with an offset applied to destination zero such as `:2t0+1`
- **THEN** the editor reports a readable Ex range error and prompt text remains unchanged

#### Scenario: Destination offset inside moved range is rejected

- **WHEN** the editor executes `:2,4move3+0`
- **THEN** the editor reports a readable Ex error and prompt text remains unchanged

### Requirement: Ex range algebra behavior is documented and validated

The change SHALL include automated tests and user-facing documentation for visible Ex offset and semicolon range behavior.

#### Scenario: Automated range validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover Ex address offsets, semicolon base semantics, destination offsets, destination zero preservation, visual range preservation, invalid offset safety, substitution preview ranges, and non-substitution command ranges

#### Scenario: Feature guide describes finite Ex ranges

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents supported Ex offsets, semicolon range behavior, destination offset behavior, destination zero behavior, and unsupported range syntax limits
