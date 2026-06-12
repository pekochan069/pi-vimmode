## ADDED Requirements

### Requirement: Normal mode supports selected special register prefixes

The Vim editor SHALL support the explicit unnamed register `""`, black-hole register `"_`, and clipboard registers `"+` and `"*` as one-shot register prefixes for supported normal-mode yank, delete, change, and paste commands.

#### Scenario: Explicit unnamed register writes current line

- **WHEN** the editor is in normal mode and the user presses `""yy`
- **THEN** the current line is copied to the unnamed register as linewise text, prompt text remains unchanged, and named or clipboard register mirrors are not modified

#### Scenario: Explicit unnamed register pastes through default paste semantics

- **WHEN** the editor is in normal mode with the unnamed register containing characterwise text and the user presses `""p`
- **THEN** the unnamed register text is inserted after the cursor using existing characterwise `p` cursor placement

#### Scenario: Black-hole delete preserves unnamed register

- **WHEN** the editor is in normal mode with the unnamed register already populated and the user presses `"_dd`
- **THEN** the current line is removed, the unnamed register remains unchanged, named registers remain unchanged, and clipboard register mirrors remain unchanged

#### Scenario: Black-hole paste is a safe no-op

- **WHEN** the editor is in normal mode and the user presses `"_p`
- **THEN** prompt text, cursor position, unnamed register, named registers, and clipboard register mirrors are unchanged

#### Scenario: Clipboard yank writes host clipboard and mirror

- **WHEN** the editor is in normal mode and the user presses `"+yy`
- **THEN** the current line is copied to the unnamed register, copied to the `+` clipboard register mirror as linewise text, a host clipboard copy is requested with that text, and prompt text remains unchanged

#### Scenario: Clipboard delete updates host clipboard and unnamed register

- **WHEN** the editor is in normal mode and the user presses `"*dw`
- **THEN** the addressed word range is removed, copied to the unnamed register, copied to the `*` clipboard register mirror as characterwise text, and a host clipboard copy is requested with that text

#### Scenario: Clipboard paste reads host clipboard text

- **WHEN** the editor is in normal mode, host clipboard text is readable as `clip`, and the user presses `"+p`
- **THEN** `clip` is inserted using existing charwise `p` cursor placement, the `+` clipboard register mirror is refreshed as charwise text, and no named register is modified

#### Scenario: Clipboard paste falls back to prompt-local mirror

- **WHEN** the editor is in normal mode with the `+` clipboard register mirror containing linewise text, host clipboard text read fails, and the user presses `"+P`
- **THEN** the mirrored register lines are inserted above the current line using existing linewise `P` cursor placement

#### Scenario: Missing clipboard data paste is safe

- **WHEN** the editor is in normal mode without a readable host clipboard or `+` clipboard register mirror and the user presses `"+p`
- **THEN** prompt text, cursor position, unnamed register, named registers, and clipboard register mirrors are unchanged except for bounded clipboard failure feedback

### Requirement: Visual modes support selected special register prefixes

The Vim editor SHALL honor `""`, `"_`, `"+`, and `"*` register prefixes for supported visual, visual-line, and visual-block yank, delete, change, and paste operations.

#### Scenario: Visual yank targets clipboard register

- **WHEN** the editor is in characterwise visual mode and the user presses `"+y`
- **THEN** the selected text is copied to the unnamed register, copied to the `+` clipboard register mirror as characterwise text, a host clipboard copy is requested with that text, visual selection clears, and the editor returns to normal mode

#### Scenario: Visual-line delete targets black-hole register

- **WHEN** the editor is in visual-line mode with selected lines, the unnamed register is already populated, and the user presses `"_d`
- **THEN** the selected full lines are removed, the unnamed register remains unchanged, named registers remain unchanged, clipboard register mirrors remain unchanged, visual selection clears, and the editor returns to normal mode

#### Scenario: Visual-block change targets clipboard register

- **WHEN** the editor is in visual-block mode with a rectangular selection and the user presses `"*c`
- **THEN** the selected block slices are removed, copied to the unnamed register, copied to the `*` clipboard register mirror as characterwise newline-joined text, a host clipboard copy is requested with that text, visual selection clears, and the editor enters insert mode

#### Scenario: Visual-line explicit unnamed paste replaces selected lines

- **WHEN** the editor is in visual-line mode with selected lines, the unnamed register contains linewise text, and the user presses `""p`
- **THEN** the selected lines are replaced using existing visual-line paste semantics, visual selection clears, and the editor returns to normal mode

### Requirement: Ex line commands support selected special register operands

The Vim editor SHALL extend supported Ex `:delete`, `:yank`, and `:put` line-command register operands to bare `_`, `+`, `*`, and `"` operands while preserving existing bare alphabetic named-register operands.

#### Scenario: Ex delete writes explicit unnamed register

- **WHEN** the editor executes `:delete "` over a valid addressed prompt-line range
- **THEN** the addressed lines are removed, the unnamed register receives the removed linewise text, named registers remain unchanged, and clipboard register mirrors remain unchanged

#### Scenario: Ex delete targets black-hole register

- **WHEN** the unnamed register is already populated and the editor executes `:2delete _`
- **THEN** line 2 is removed, the unnamed register remains unchanged, named registers remain unchanged, clipboard register mirrors remain unchanged, and the Ex row reports the deleted line count

#### Scenario: Ex yank targets clipboard register

- **WHEN** the editor executes `:%yank +`
- **THEN** the addressed prompt lines are copied to the unnamed register, copied to the `+` clipboard register mirror as linewise text, a host clipboard copy is requested with that text, prompt text remains unchanged, and the Ex row reports the yanked line count

#### Scenario: Ex put reads clipboard mirror

- **WHEN** the `*` clipboard register mirror contains linewise text and the editor executes `:put *`
- **THEN** the mirrored register lines are inserted after the addressed line, the cursor moves according to existing Ex put behavior, register contents remain unchanged, and the Ex row reports the inserted line count

#### Scenario: Ex put black-hole operand is safe error

- **WHEN** the editor executes `:put _`
- **THEN** the editor reports a readable Ex error, prompt text remains unchanged, unnamed register remains unchanged, named registers remain unchanged, and clipboard register mirrors remain unchanged

#### Scenario: Quoted Ex clipboard operand remains unsupported

- **WHEN** the editor executes `:yank "+`, `:delete "_`, or `:put "+`
- **THEN** the editor reports a readable Ex register operand error, prompt text remains unchanged for non-mutating rejected commands, and registers remain unchanged

### Requirement: Unsupported special registers remain safe and documented

The Vim editor MUST reject unsupported special register targets without inserting text, corrupting pending modal state, or implying full Vim/Neovim register parity.

#### Scenario: Expression register target is rejected

- **WHEN** the editor is in normal mode and the user presses `"=`
- **THEN** prompt text, cursor position, mode, unnamed register, named registers, clipboard register mirrors, and pending operator state are unchanged, and the register target is cleared

#### Scenario: Numbered register target remains unsupported

- **WHEN** the editor is in normal mode and the user presses `"1`
- **THEN** prompt text, cursor position, mode, unnamed register, named registers, clipboard register mirrors, and pending operator state are unchanged, and the register target is cleared

#### Scenario: Read-only special register targets remain unsupported

- **WHEN** the editor is in normal mode and the user presses `"/`, `".`, `":`, or `"%`
- **THEN** prompt text, cursor position, mode, unnamed register, named registers, clipboard register mirrors, and pending operator state are unchanged, and the register target is cleared

### Requirement: Special registers are documented and validated

The special register change SHALL include automated tests, inspectability coverage, and user-facing documentation for supported special registers, host clipboard write/read behavior, prompt-local clipboard paste fallback, black-hole semantics, explicit unnamed semantics, unsupported special registers, and Ex operand syntax.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover normal-mode special register writes and reads, visual-mode special register writes and reads, Ex special register operands, clipboard copy/read effects, black-hole preservation of the unnamed register, missing clipboard paste safety, unsupported special target rejection, and preservation of existing named-register behavior

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide documents special registers

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `""`, `"_`, `"+`, and `"*`, explains host clipboard write/read and prompt-local mirror fallback behavior, and lists unsupported special registers including `"=`, numbered registers, and read-only registers

#### Scenario: Inspect output summarizes clipboard mirrors without contents

- **WHEN** the user runs `:vimmode inspect` after writing a clipboard register mirror
- **THEN** the bounded register summary includes the presence and type or length of clipboard register mirrors without dumping full clipboard or register contents
