## ADDED Requirements

### Requirement: Actual editor honors mark configuration

The Vim editor SHALL preserve configured mark behavior from construction through the actual `VimEditor` adapter.

#### Scenario: VimEditor honors disabled marks

- **WHEN** `VimEditor` is constructed with `piVimMode.marks.enabled` resolved to `false`
- **THEN** mark set and jump controls are ignored as mark controls in the live editor and do not set pending mark state

#### Scenario: VimEditor honors restricted mark slots

- **WHEN** `VimEditor` is constructed with `piVimMode.marks.slots` resolved to `["x"]`
- **THEN** only local mark slot `x` can be set or jumped to in the live editor and other slot targets are ignored as invalid mark targets
