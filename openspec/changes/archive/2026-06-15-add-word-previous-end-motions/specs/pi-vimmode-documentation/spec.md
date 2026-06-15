## ADDED Requirements

### Requirement: Documentation explains WORD and previous-end motions

User-facing pi-vimmode documentation SHALL describe supported WORD and previous-end word motions, including examples, configurable action names, operator composition, and explicit non-goals.

#### Scenario: Feature guide documents motion behavior

- **WHEN** a user opens `docs/features.md`
- **THEN** the normal motions section documents `W`, `B`, `E`, `ge`, and `gE`, explains that WORD motions are whitespace-delimited, and gives at least one prompt-editing example involving paths, flags, URLs, or code-like tokens

#### Scenario: Feature guide documents operator composition

- **WHEN** a user opens `docs/features.md`
- **THEN** the operator-motion documentation includes examples or descriptions for delete, change, or yank with WORD and previous-end motions such as `dW`, `cE`, `dge`, or `ygE`

#### Scenario: Settings reference documents semantic action names

- **WHEN** a user opens `docs/settings.md`
- **THEN** the keymap motion reference lists `wordForwardBig`, `wordBackwardBig`, `wordEndBig`, `wordPreviousEnd`, and `wordPreviousEndBig` with their default bindings and notes that these actions can be used in `operatorMotions`

#### Scenario: Documentation states scope boundaries

- **WHEN** a user reads the motion limitations in `docs/features.md` or `docs/settings.md`
- **THEN** the docs state that this change does not add subword/camelCase navigation, display-line motions, recursive mappings, Vimscript, `.vimrc`, or full Vim/Neovim parity

#### Scenario: Documentation preserves lowercase word behavior claims

- **WHEN** docs describe `w`, `b`, `e`, `W`, `B`, `E`, `ge`, or `gE`
- **THEN** they do not claim that lowercase word motions were changed to a new punctuation-aware boundary model unless source behavior and tests actually implement that boundary model
