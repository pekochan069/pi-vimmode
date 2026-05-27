## MODIFIED Requirements

### Requirement: Settings are namespaced and read-only

The Vim editor SHALL read extension settings from a `piVimMode` object without modifying Pi settings files. Supported settings include `startMode`, `cursor`, `keymap`, `ui`, and selected `vimOptions` aliases.

#### Scenario: Namespaced settings loaded

- **WHEN** Pi starts a session with `piVimMode` configured in global or project settings
- **THEN** the extension reads only supported `piVimMode` fields for Vim editor behavior and ignores unrelated settings

#### Scenario: Project settings override global settings

- **WHEN** global Pi settings and project Pi settings both define supported `piVimMode` fields
- **THEN** project settings override global settings field by field without discarding unrelated global fields

#### Scenario: Settings file unavailable or invalid

- **WHEN** a settings file is absent, unreadable, or contains invalid JSON
- **THEN** the extension uses default Vim mode settings and keeps the prompt editor usable

#### Scenario: Invalid nested setting falls back

- **WHEN** a nested `piVimMode` field such as `cursor`, `keymap`, `ui`, or `vimOptions` contains an unsupported value
- **THEN** the invalid field falls back to its default or lower-precedence value, a warning is recorded, and sibling settings remain usable
