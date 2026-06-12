# vim-named-registers Specification

## Purpose

TBD - created by archiving change add-named-registers. Update Purpose after archive.

## Requirements

### Requirement: Normal mode supports named register prefixes

The Vim editor SHALL support Vim-style `"{slot}` register prefixes in normal mode for supported yank, delete, change, and paste commands.

#### Scenario: Named register receives normal-mode yank

- **WHEN** the editor is in normal mode and the user presses `"ayy`
- **THEN** the current line is copied to named register `a`, copied to the unnamed register as linewise text, and prompt text remains unchanged

#### Scenario: Named register receives normal-mode delete

- **WHEN** the editor is in normal mode and the user presses `"add`
- **THEN** the current line is removed, copied to named register `a`, copied to the unnamed register as linewise text, and the editor remains in normal mode

#### Scenario: Named register receives operator-motion yank

- **WHEN** the editor is in normal mode and the user presses `"ayw`
- **THEN** the addressed text range is copied to named register `a`, copied to the unnamed register as characterwise text, and prompt text remains unchanged

#### Scenario: Named register receives character delete

- **WHEN** the editor is in normal mode and the user presses `"ax`
- **THEN** the character under the cursor is removed, copied to named register `a`, copied to the unnamed register as characterwise text, and the editor remains in normal mode

#### Scenario: Named register target is one-shot

- **WHEN** the editor writes text with `"ayy` and then yanks another line with `yy`
- **THEN** named register `a` keeps the first yank, the unnamed register contains the second yank, and later unprefixed paste uses the second yank

### Requirement: Visual modes support named register prefixes

The Vim editor SHALL honor `"{slot}` register prefixes for supported visual, visual-line, and visual-block yank, delete, and change operations.

#### Scenario: Characterwise visual yank targets named register

- **WHEN** the editor is in characterwise visual mode and the user presses `"ay`
- **THEN** the selected text is copied to named register `a`, copied to the unnamed register as characterwise text, visual selection clears, and the editor returns to normal mode

#### Scenario: Visual-line delete targets named register

- **WHEN** the editor is in visual-line mode with selected lines and the user presses `"ad`
- **THEN** the selected full lines are removed, copied to named register `a`, copied to the unnamed register as linewise text, visual selection clears, and the editor returns to normal mode

#### Scenario: Visual-block change targets named register

- **WHEN** the editor is in visual-block mode with a rectangular selection and the user presses `"ac`
- **THEN** the selected block slices are removed, copied to named register `a`, copied to the unnamed register as characterwise newline-joined text, visual selection clears, and the editor enters insert mode

### Requirement: Named registers paste through existing paste semantics

The Vim editor SHALL paste from a named register when `p` or `P` is preceded by a valid `"{slot}` prefix, while unprefixed paste continues to use the unnamed register.

#### Scenario: Paste characterwise named register after cursor

- **WHEN** the editor is in normal mode with named register `a` containing characterwise text and the user presses `"ap`
- **THEN** register `a` text is inserted after the cursor using existing characterwise `p` cursor placement

#### Scenario: Paste linewise named register before current line

- **WHEN** the editor is in normal mode with named register `a` containing linewise text and the user presses `"aP`
- **THEN** register `a` lines are inserted above the current line using existing linewise `P` cursor placement

#### Scenario: Missing named register paste is safe

- **WHEN** the editor is in normal mode without named register `z` and the user presses `"zp`
- **THEN** prompt text, cursor position, unnamed register, and named registers are unchanged

#### Scenario: Unprefixed paste still uses unnamed register

- **WHEN** named register `a` and the unnamed register contain different text and the user presses `p`
- **THEN** the editor pastes the unnamed register content

### Requirement: Uppercase register targets append

The Vim editor SHALL treat uppercase alphabetic register targets as append writes to the matching lowercase named register for yank, delete, and change operations.

#### Scenario: Uppercase target appends characterwise text

- **WHEN** named register `a` contains characterwise text and the user yanks characterwise text with `"Ayw`
- **THEN** named register `a` contains the previous text followed by the newly yanked text and the unnamed register contains only the newly yanked text

#### Scenario: Uppercase target appends linewise text

- **WHEN** named register `a` contains linewise text and the user yanks a line with `"Ayy`
- **THEN** named register `a` contains the previous lines followed by the newly yanked line separated by one newline boundary and the unnamed register contains only the newly yanked line

#### Scenario: Uppercase target on empty register behaves like replace

- **WHEN** named register `b` is empty and the user deletes a line with `"Bdd`
- **THEN** named register `b` contains the deleted line as linewise text and the unnamed register contains the same deleted line

#### Scenario: Uppercase paste reads lowercase register

- **WHEN** named register `a` contains text and the user presses `"Ap`
- **THEN** the editor pastes named register `a` without modifying register contents

### Requirement: Invalid register prefixes are safe

The Vim editor MUST reject unsupported register targets without inserting text or corrupting pending operator state.

#### Scenario: Unsupported register target clears prefix

- **WHEN** the editor is in normal mode and the user presses `"1`
- **THEN** prompt text, cursor position, mode, unnamed register, named registers, and pending operator state are unchanged

#### Scenario: Incomplete register prefix does not edit text

- **WHEN** the editor is in normal mode and the user presses `"` without a following slot
- **THEN** prompt text remains unchanged and the editor waits for a register target key

#### Scenario: Register prefix before unsupported command no-ops

- **WHEN** the editor is in normal mode and the user presses `"aq`
- **THEN** prompt text, cursor position, unnamed register, and named register `a` are unchanged, and the register target is cleared

### Requirement: Named edit registers stay separate from macro slots

The Vim editor SHALL keep named edit registers independent from macro recording and playback slots.

#### Scenario: Macro slot and edit register with same letter do not collide

- **WHEN** macro slot `a` contains recorded input tokens and named edit register `a` contains text
- **THEN** playing macro `@a` replays the macro tokens, while `"ap` pastes the edit-register text

#### Scenario: Writing edit register does not overwrite macro slot

- **WHEN** macro slot `a` contains recorded input tokens and the user writes text to named edit register `a`
- **THEN** macro slot `a` remains available for playback and named edit register `a` contains the written text

### Requirement: Named registers are documented and validated

The named register change SHALL include automated tests and user-facing documentation for supported slots, write behavior, paste behavior, append behavior, macro separation, and limitations.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover normal-mode register writes, visual-mode register writes, paste from named registers, uppercase append, invalid prefixes, missing registers, one-shot target clearing, and macro separation where macro support is present

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide documents named registers

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents supported named register syntax, append behavior, session-local storage, unsupported special registers, and separation from macro slots

### Requirement: Ex line commands support named register operands

The Vim editor SHALL extend named-register read, write, and uppercase append semantics to supported Ex `:delete`, `:yank`, and `:put` line commands while preserving existing unnamed-register defaults.

#### Scenario: Ex delete writes lowercase named register

- **WHEN** the editor executes `:delete a` over a valid addressed prompt-line range
- **THEN** the addressed lines are removed, named register `a` receives the removed linewise text, the unnamed register receives the same linewise text, and unrelated named registers remain unchanged

#### Scenario: Ex yank writes lowercase named register

- **WHEN** the editor executes `:%yank b`
- **THEN** the addressed prompt lines are copied to named register `b` as linewise text, the unnamed register receives the same linewise text, prompt text remains unchanged, and the Ex row reports the yanked line count

#### Scenario: Ex uppercase delete appends to named register

- **WHEN** named register `a` contains linewise text and the editor executes `:2,3delete A`
- **THEN** named register `a` contains the previous linewise text followed by the deleted linewise text with one newline boundary, the unnamed register contains only the newly deleted linewise text, and prompt text reflects the deletion

#### Scenario: Ex uppercase yank appends to named register

- **WHEN** named register `c` contains linewise text and the editor executes `:yank C`
- **THEN** named register `c` appends the newly yanked linewise text, the unnamed register contains only the newly yanked text, and prompt text remains unchanged

#### Scenario: Ex put reads named register

- **WHEN** named register `a` contains linewise text and the editor executes `:put a`
- **THEN** register `a` lines are inserted after the addressed line, the cursor moves according to existing Ex put behavior, the register contents remain unchanged, and the Ex row reports the inserted line count

#### Scenario: Ex uppercase put reads lowercase register

- **WHEN** named register `a` contains text and the editor executes `:put A`
- **THEN** the editor reads named register `a`, inserts that text according to existing Ex put behavior, and does not append or modify register `a`

#### Scenario: Missing named register put is safe

- **WHEN** the editor executes `:put z` and named register `z` is missing or empty
- **THEN** the editor reports a readable Ex error, prompt text remains unchanged, the unnamed register remains unchanged, and named registers remain unchanged

#### Scenario: Ex line commands without operands keep unnamed defaults

- **WHEN** named register `a` contains text and the editor executes `:delete`, `:yank`, or `:put` without a register operand
- **THEN** named register `a` remains unchanged and the command uses existing unnamed-register semantics

#### Scenario: Invalid Ex register operand is rejected

- **WHEN** the editor executes `:delete 1`, `:yank _`, `:put ab`, or `:delete "a`
- **THEN** the editor reports a readable Ex error, prompt text remains unchanged, unnamed register remains unchanged, and named registers remain unchanged

### Requirement: Ex register operands are documented and validated

The named register change SHALL include automated tests and user-facing documentation for supported Ex register operands, default unnamed behavior, lowercase writes, uppercase append writes, uppercase reads, missing registers, and unsupported operand forms.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover Ex delete/yank lowercase writes, uppercase append writes, unnamed-register updates, Ex put lowercase and uppercase reads, missing named register put safety, invalid Ex register operands, visual-source Ex ranges, and preservation of existing normal and visual named-register behavior

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide documents Ex register operands

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents Ex register operand syntax for `:delete`, `:yank`, and `:put`, explains lowercase and uppercase behavior, and lists unsupported special registers or quoted Ex operand forms as limitations

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
