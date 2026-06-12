## MODIFIED Requirements

### Requirement: Prompt transform actions have canonical registry metadata

The Vim editor SHALL expose a finite typed registry for bindable prompt transform actions using only canonical `prompt.transform.*` action IDs.

#### Scenario: Registry contains first milestone transform actions

- **WHEN** the action registry is inspected by config, diagnostics, or tests
- **THEN** it includes canonical entries for quote, unquote, bulletize, fence, indent, dedent, and reflow prompt transforms

#### Scenario: Registry excludes metadata-only diagnostics from bindable actions

- **WHEN** `piVimMode.keymap.actions` is parsed
- **THEN** only bindable prompt transform action IDs are accepted and metadata-only diagnostic IDs such as `vimmode.doctor` are rejected with a warning

#### Scenario: Action IDs are unique

- **WHEN** the registry is validated
- **THEN** no two action entries share the same canonical action ID

#### Scenario: Registry excludes legacy aliases

- **WHEN** config validation, diagnostics, runtime help, keybinding popup output, or tests inspect prompt transform action metadata
- **THEN** no `promptTransform.*` action IDs or aliases are exposed, and callers must use canonical `prompt.transform.*` IDs

## REMOVED Requirements

### Requirement: Legacy promptTransform aliases remain diagnostics-only during transition

**Reason**: The planned transition period has ended. Keeping `promptTransform.*` as a diagnostic/search alias preserves a duplicate action namespace and weakens canonical `prompt.transform.*` source-of-truth guarantees.

**Migration**: Use canonical `prompt.transform.*` IDs in diagnostics and docs, for example `:actions prompt.transform.reflow`, `:features prompt.transform.reflow`, and `piVimMode.keymap.actions["prompt.transform.reflow"]`.
