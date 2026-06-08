## ADDED Requirements

### Requirement: Ex command-line supports finite inspectability diagnostics

The Vim editor SHALL parse and execute `:vimmode inspect` and `:messages` as finite read-only Ex diagnostic commands without adding arbitrary Vimscript or command dispatch.

#### Scenario: Vimmode inspect command executes

- **WHEN** Ex command-line mode is active and the user executes `:vimmode inspect`
- **THEN** the editor exits Ex command-line mode, shows a bounded prompt-local inspect diagnostic, and leaves prompt text unchanged

#### Scenario: Messages command executes

- **WHEN** Ex command-line mode is active and the user executes `:messages`
- **THEN** the editor exits Ex command-line mode, shows a bounded recent-message diagnostic, and leaves prompt text unchanged

#### Scenario: Inspect command supports exact finite syntax

- **WHEN** the Ex parser receives `vimmode inspect`
- **THEN** it returns a finite parse result for the inspectability diagnostic command

#### Scenario: Unsupported inspect syntax is rejected

- **WHEN** the Ex parser receives unsupported inspectability syntax such as `vimmode`, `vimmode status`, `vimmode inspect raw`, `messages clear`, or `mes`
- **THEN** it returns a readable Ex error and prompt text remains unchanged

### Requirement: Inspectability diagnostics compose with Ex source-mode restoration

Inspectability diagnostics SHALL follow existing Ex command-line source-mode restoration rules for normal and visual source modes.

#### Scenario: Normal source mode returns to normal

- **WHEN** `:vimmode inspect` or `:messages` is executed from Ex command-line mode opened in normal mode
- **THEN** Ex command-line mode closes, the editor remains in normal mode, and the original prompt text and cursor are preserved

#### Scenario: Visual source mode restores captured selection

- **WHEN** `:vimmode inspect` or `:messages` is executed from Ex command-line mode opened in visual, visual-line, or visual-block mode
- **THEN** Ex command-line mode closes, the original visual mode and captured selection are restored, and prompt text remains unchanged

#### Scenario: Inspectability diagnostics do not enter Ex history as edits

- **WHEN** `:vimmode inspect` or `:messages` executes successfully
- **THEN** the command may be recorded according to existing successful Ex history rules, but it does not update registers, search state, visible search highlights, marks, macros, cursor target, or repeat-change state

### Requirement: Inspectability Ex output uses existing workbench feedback surface

The Ex command-line implementation SHALL show inspectability diagnostics through existing bounded diagnostic/workbench feedback rather than adding a new persistent render surface.

#### Scenario: Inspect output appears as bounded diagnostic feedback

- **WHEN** `:vimmode inspect` executes
- **THEN** the diagnostic appears through the same transient feedback path used by finite read-only diagnostic Ex commands or a bounded message-view path, and total editor rendering remains width-safe

#### Scenario: Messages output does not change prompt viewport rules permanently

- **WHEN** `:messages` executes
- **THEN** any visible diagnostic feedback uses existing workbench row behavior and clears according to existing transient feedback clearing rules while retained history remains available to future `:messages`

#### Scenario: Pending Ex preview is cleared safely

- **WHEN** an inspectability diagnostic is executed while an Ex substitution preview had been active for the same pending Ex command text
- **THEN** the preview is cleared, prompt text remains unchanged, and no stale substitution edit is applied
