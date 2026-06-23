## ADDED Requirements

### Requirement: Documentation covers visual reselection

The project SHALL document `gv` visual reselection in user-facing feature and settings references.

#### Scenario: Feature guide documents visual reselection

- **WHEN** a user opens `docs/features.md`
- **THEN** the visual mode documentation explains that `gv` reselects the last valid visual selection, preserves characterwise/linewise/blockwise selection kind, and no-ops when no valid stored selection exists

#### Scenario: Settings reference documents visual reselection keymap

- **WHEN** a user opens `docs/settings.md`
- **THEN** the keymap command reference lists `piVimMode.keymap.commands.reselectVisual`, its default `gv` binding, and its normal-mode behavior
