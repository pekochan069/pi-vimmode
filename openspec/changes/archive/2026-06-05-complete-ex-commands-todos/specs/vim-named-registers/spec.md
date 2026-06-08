## ADDED Requirements

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
