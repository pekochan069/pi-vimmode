## ADDED Requirements

### Requirement: Ex command-line shows finite command suggestions

The Vim editor SHALL show bounded command suggestions while Ex command-line input is active, using the same finite command surface accepted by the Ex parser.

#### Scenario: Empty command shows available command names

- **WHEN** Ex command-line mode is active with an empty command word
- **THEN** the rendered Ex workbench includes width-safe suggestions for supported Ex command names without changing prompt text

#### Scenario: Command prefix filters suggestions

- **WHEN** Ex command-line mode is active and the user types a command prefix such as `ma`
- **THEN** the suggestions only include supported Ex command names that start with that prefix, such as `mapcheck`, and omit non-matching commands

#### Scenario: Range prefix still suggests command names

- **WHEN** Ex command-line mode is active and the user types a valid range prefix before a command prefix, such as `:%s`
- **THEN** the suggestions are based on the command prefix after the range and include matching command names such as `s` and `substitute`

#### Scenario: Command arguments suppress command suggestions

- **WHEN** Ex command-line mode is active and the command word is followed by argument text, such as `:help keybindings`
- **THEN** command-name suggestions are not shown for the argument text

#### Scenario: Unsupported or invalid range prefix is side-effect free

- **WHEN** Ex command-line mode is active with text that cannot produce command-name suggestions
- **THEN** the editor hides suggestions without changing prompt text, registers, marks, search state, macros, dot-repeat state, visual state, cursor position, or Ex history

### Requirement: Ex command suggestions mirror configured transform commands

The Vim editor SHALL include enabled prompt transform Ex command names and configured transform aliases in command suggestions, and SHALL omit disabled transform commands.

#### Scenario: Enabled transform command is suggested

- **WHEN** Ex command-line mode is active and prompt transform command `quote` is enabled
- **THEN** typing prefix `qu` shows `quote` as an available Ex command suggestion

#### Scenario: Configured transform alias is suggested

- **WHEN** Ex command-line mode is active and `piVimMode.promptTransforms.commands.quote` resolves to include `wrapquote`
- **THEN** typing prefix `wrap` shows `wrapquote` as an available Ex command suggestion

#### Scenario: Disabled transform command is omitted

- **WHEN** Ex command-line mode is active and prompt transform action `quote` is disabled
- **THEN** typing prefix `qu` does not show `quote` solely because of the disabled transform action

### Requirement: Ex command-line applies suggestions with minimal completion behavior

The Vim editor SHALL allow a user to apply command-name suggestions from Ex command-line mode without adding selection-menu state or changing execution semantics.

#### Scenario: Tab completes a single matching command

- **WHEN** Ex command-line mode is active, the command cursor is in the command word, and exactly one supported command matches the typed prefix
- **THEN** pressing `Tab` completes the command word to that supported command, moves the command cursor after the completed word, clears stale substitution preview state, and leaves prompt text unchanged

#### Scenario: Tab extends to common prefix

- **WHEN** Ex command-line mode is active and multiple supported commands share a longer common prefix than the typed command word
- **THEN** pressing `Tab` extends the command word to the common prefix and leaves prompt text unchanged

#### Scenario: Tab no-ops when completion cannot improve input

- **WHEN** Ex command-line mode is active and matching suggestions do not provide a longer common prefix or single completion
- **THEN** pressing `Tab` leaves the pending Ex command text, prompt text, and editor state unchanged

#### Scenario: History and execution keys keep existing behavior

- **WHEN** Ex command-line suggestions are visible
- **THEN** `Up` and `Down` continue to navigate Ex history, `Enter` continues to execute or preview the command, and `Esc` continues to cancel Ex command-line mode

### Requirement: Ex command suggestions render without stealing host autocomplete rows

The Vim editor SHALL render Ex command suggestions as bounded Vim-owned workbench rows that compose safely with prompt rendering and Pi-owned autocomplete output.

#### Scenario: Suggestions reserve prompt viewport rows

- **WHEN** Ex command-line suggestions are visible
- **THEN** the prompt editor viewport uses fewer terminal rows so total rendering remains bounded

#### Scenario: Suggestions are width-safe

- **WHEN** Ex command-line suggestions are rendered in a narrow terminal
- **THEN** every suggestion row is truncated or padded to the available width without overflowing

#### Scenario: Host autocomplete rows are preserved

- **WHEN** Pi-owned insert autocomplete rows are visible and Vim renders status or workbench rows
- **THEN** Ex command-line suggestion rendering does not replace, truncate, or restyle those host autocomplete rows

### Requirement: Ex command suggestion behavior is documented and validated

The change SHALL include automated tests and user-facing documentation for finite Ex command suggestions.

#### Scenario: Automated suggestion validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover suggestion candidate filtering, range-prefixed command suggestions, configured transform aliases, disabled transform omission, `Tab` completion behavior, existing history/execution keys, side-effect preservation, and render composition with host autocomplete rows

#### Scenario: Feature guide describes suggestion scope

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents Ex command suggestions as finite command-name hints for supported commands and states that full Vimscript, file/path/shell, command-argument, and runtime command completion are intentionally unsupported
