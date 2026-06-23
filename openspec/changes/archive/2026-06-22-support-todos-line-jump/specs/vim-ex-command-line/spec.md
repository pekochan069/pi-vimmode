## ADDED Requirements

### Requirement: Ex command-line supports bare single-address line jumps

The Vim editor SHALL treat a commandless Ex single-line address as a prompt-local cursor jump, without editing prompt text or expanding to broad Vimscript/default Ex command behavior.

#### Scenario: Numeric line jump moves cursor

- **WHEN** the editor is in normal mode on prompt line 1 and the user executes `:3` in a prompt with at least three lines
- **THEN** Ex command-line mode closes, prompt text remains unchanged, the editor remains in normal mode, and the cursor moves to prompt line 3 with its column clamped to the target line length

#### Scenario: Current and last line addresses jump safely

- **WHEN** the editor executes `:.` or `:$` from Ex command-line mode
- **THEN** the cursor moves to the resolved current or last prompt line, prompt text remains unchanged, and no registers, marks, search state, macros, or dot-repeat state are updated

#### Scenario: Single-address offset jumps

- **WHEN** the editor executes `:2+1` in a prompt with at least three lines
- **THEN** the cursor moves to prompt line 3 using the existing finite Ex address-offset resolution rules

#### Scenario: Out-of-bounds line jump is rejected

- **WHEN** the editor executes an out-of-bounds commandless address such as `:0`, `:999`, or `:$+1`
- **THEN** the editor reports an Ex range error, prompt text remains unchanged, and cursor position remains unchanged

#### Scenario: Commandless ranges are rejected

- **WHEN** the editor executes a commandless range such as `:%`, `:2,4`, `:2;.+1`, or `:'<,'>`
- **THEN** the editor reports a readable Ex error, prompt text remains unchanged, and cursor position remains unchanged

#### Scenario: Visual-source line jump exits visual mode

- **WHEN** Ex command-line mode was opened from visual mode, the user replaces the prefilled visual range marker with `:3`, and the line jump succeeds
- **THEN** Ex command-line mode closes, visual selection is cleared, the editor returns to normal mode, and the cursor moves to prompt line 3

### Requirement: Ex line-jump behavior is documented and validated

The change SHALL include automated tests and user-facing documentation for bare single-address Ex line jumps and unsupported commandless range forms.

#### Scenario: Automated line-jump validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover parsing accepted bare single-address jumps, rejecting commandless ranges, executing cursor-only jumps, clamping target columns, preserving prompt text and modal side effects, and leaving invalid jumps harmless

#### Scenario: Feature guide describes line jumps

- **WHEN** the user opens `docs/features.md`
- **THEN** the Ex command-line section documents `:n` line jumps, supported address forms, preserved side effects, and unsupported commandless ranges
