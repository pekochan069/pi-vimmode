# TODOs

## Next Version

- [x] Add safe insert editing layer
  - [x] Write OpenSpec change `safe-insert-editing-layer`.
  - [x] Add finite named insert actions: `deleteWordBackward`, `deleteWordForward`, `deleteLineBackward`, `deleteLineForward`, `moveWordBackward`, `moveWordForward`, `moveLineStart`, `moveLineEnd`.
  - [x] Reuse existing Vim small-word semantics for word movement/deletion.
  - [x] Ensure insert delete actions never write Vim registers.
  - [x] Make `deleteLineForward` at EOL delete exactly one newline, preserving spaces.
  - [x] Add docs examples for readline-style chords and home-row-mod chords.
  - [x] Test configured actions, rejected raw chords, autocomplete delegation, duplicate bindings, no-register writes, newline join behavior, and no-op prompt boundaries.
- [ ] Bug - Arrow keys in normal mode doesn't move cursor
- [ ] Separate escape keybindings (escapeInsert, escapeVisual, escapeEx, ...)

## Deferred

- [ ] Keybinding presets (qwerty, dvorak, colemak, etc) after finite insert actions prove useful.
- [ ] Consider `gj` / `gk` display-line motions if prompt rendering gains stable display-line mapping.
- [ ] Consider `zz` / `zt` / `zb` viewport recentering if prompt viewport state needs explicit cursor positioning.
- [ ] Consider window/file keybindings only if pi-vimmode expands beyond prompt-local editing.

## Ideas

- [ ] Explore a full user-defined action/plugin surface for pi-vimmode after the finite named prompt action/transform keybinding layer proves demand.
  - [ ] javascript/typescript based config files in `~/.pi/agent/`
- [ ] Add registry-backed diagnostic action entries and a fuller Neovim quickref classification after M1 prompt transform action keybindings ship. Context: /plan-eng-review intentionally cut `vimmode.*` diagnostic metadata and quickref polish from the first code PR so resolver/config/dispatch risk stays bounded.
- [ ] Explore config-hacker and extension-author workflows: action registry introspection, recipes, community presets, and future extension seams.
- [ ] Make pi-vimmode controllable with ex commands?
