## ADDED Requirements

### Requirement: Prompt buffer exposes paragraph navigation

The prompt buffer module SHALL expose pure prompt-local paragraph navigation using contiguous nonblank line runs separated by whitespace-only blank lines.

#### Scenario: Forward paragraph navigation resolves next paragraph

- **WHEN** caller requests forward paragraph navigation from inside a nonblank paragraph and a later paragraph exists
- **THEN** the prompt buffer returns the first-column position of the next paragraph's first nonblank line

#### Scenario: Forward paragraph navigation resolves prompt end

- **WHEN** caller requests forward paragraph navigation from inside the last nonblank paragraph
- **THEN** the prompt buffer returns the normalized prompt end position without corrupting text

#### Scenario: Backward paragraph navigation resolves paragraph start

- **WHEN** caller requests backward paragraph navigation from inside a nonblank paragraph
- **THEN** the prompt buffer returns the first-column position of the current paragraph start, or the previous paragraph start when already at the current paragraph start

#### Scenario: Counted paragraph navigation repeats safely

- **WHEN** caller requests counted forward or backward paragraph navigation
- **THEN** the prompt buffer repeats paragraph target resolution up to the count and clamps safely at prompt start or prompt end when fewer targets exist

#### Scenario: Separator-only prompt is safe

- **WHEN** caller requests paragraph navigation for an empty prompt or a prompt containing only whitespace separator lines
- **THEN** the prompt buffer returns a safe normalized no-op target and does not corrupt text

### Requirement: Prompt buffer owns operator ranges for paragraph motions

The prompt buffer module SHALL resolve delete, change, and yank ranges for paragraph motions without requiring modal callers to compose line, offset, or separator math.

#### Scenario: Forward paragraph operator range includes separator boundary

- **WHEN** caller requests an operator range from inside a paragraph through a forward paragraph target before a later paragraph
- **THEN** the prompt buffer returns a finite characterwise range from the cursor through the boundary before the later paragraph

#### Scenario: Backward paragraph operator range resolves toward paragraph start

- **WHEN** caller requests an operator range from inside a paragraph through a backward paragraph target
- **THEN** the prompt buffer returns a finite characterwise range between the resolved paragraph boundary and the cursor

#### Scenario: Paragraph operator range preserves operation semantics

- **WHEN** caller requests delete, change, or yank using a valid paragraph motion range
- **THEN** delete and change return edit results with unnamed character-register text and cursor placement, while yank returns the addressed character register without mutating prompt text

#### Scenario: Empty paragraph operator range is safe

- **WHEN** caller requests a paragraph operator range whose resolved target equals the cursor position
- **THEN** the prompt buffer returns a safe no-op edit result or no register and does not corrupt prompt text

### Requirement: Prompt buffer resolves paragraph text-object ranges

The prompt buffer module SHALL resolve inner and around paragraph text-object ranges using the same blank-line paragraph model as paragraph motions.

#### Scenario: Inner paragraph range excludes separators

- **WHEN** caller requests an inner paragraph text object from inside a nonblank paragraph
- **THEN** the prompt buffer resolves the paragraph body range without leading or trailing blank separator lines

#### Scenario: Around paragraph range includes adjacent separator

- **WHEN** caller requests an around paragraph text object from inside a nonblank paragraph
- **THEN** the prompt buffer resolves the paragraph body plus the following blank separator group when present, otherwise the preceding blank separator group when present

#### Scenario: Paragraph text object operation preserves existing contracts

- **WHEN** caller deletes, changes, or yanks a resolved paragraph text object
- **THEN** the prompt buffer uses the existing text-object edit/register contracts for characterwise text objects

#### Scenario: Missing paragraph text object is safe

- **WHEN** caller requests a paragraph text object from an empty prompt, separator-only prompt, or cursor position outside any nonblank paragraph
- **THEN** the prompt buffer returns no range or a safe no-op result without changing text, cursor, or registers
