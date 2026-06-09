## ADDED Requirements

### Requirement: Keybinding discovery popup preserves customization state boundaries

Runtime keybinding discovery popup display, popup-local scrolling, and dismissal SHALL be read-only with respect to prompt editing state and effective customization state.

#### Scenario: Popup display is read-only

- **WHEN** the editor executes `:features keybindings` from normal mode
- **THEN** prompt text, cursor position, mode, search highlights, registers, marks, macro slots, dot-repeat state, resolved options, effective keymaps, and retained diagnostics remain unchanged except for displaying the popup

#### Scenario: Popup from visual Ex restores visual state

- **WHEN** Ex command-line mode was opened from a visual selection and the user executes `:features keybindings`
- **THEN** the command exits Ex mode without editing prompt text and restores the original visual mode state while displaying the popup

#### Scenario: Popup scrolling is read-only

- **WHEN** the keybinding discovery popup is visible and the user scrolls inside it with popup-local controls
- **THEN** only the popup scroll position changes, while prompt text, cursor position, mode, visual selection, search highlights, registers, marks, macro slots, dot-repeat state, resolved options, effective keymaps, retained diagnostics, and retained messages remain unchanged

#### Scenario: Popup dismissal is read-only

- **WHEN** the keybinding discovery popup is visible and the user dismisses it with `Esc` or existing reset behavior
- **THEN** prompt text, cursor position, mode, visual selection, search highlights, registers, marks, macro slots, dot-repeat state, resolved options, effective keymaps, and retained diagnostics remain unchanged except for removing the popup

### Requirement: Keybinding popup reuses customization diagnostics vocabulary

The keybinding discovery popup SHALL describe bindings using the same finite metadata boundaries as existing customization diagnostics.

#### Scenario: Accepted bindings use canonical action IDs

- **WHEN** the popup lists accepted prompt transform action bindings
- **THEN** it prints canonical `prompt.transform.*` IDs exactly and does not use legacy `promptTransform.*` names as bindable config keys

#### Scenario: Metadata-only diagnostic actions remain non-bindable

- **WHEN** the popup explains diagnostic or runtime-help action metadata such as `vimmode.doctor` or `vimmode.features`
- **THEN** it identifies those IDs as metadata-only or non-bindable rather than presenting them as configurable keybinding targets

#### Scenario: Protected shortcuts remain protected

- **WHEN** the popup mentions protected Pi shortcuts or directs users to `:mapcheck <key>`
- **THEN** it preserves the protected shortcut catalog boundary and does not present protected Pi shortcuts as available pi-vimmode bindings
