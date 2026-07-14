# TODOs

## Next Version

- [ ] leader key (default none)

## Deferred

- [ ] Separate escape keybindings (escapeInsert, escapeVisual, escapeEx, ...)
- [ ] Consider `gj` / `gk` display-line motions if prompt rendering gains stable display-line mapping.
- [ ] Consider `zz` / `zt` / `zb` viewport recentering if prompt viewport state needs explicit cursor positioning.
- [ ] Consider window/file keybindings only if pi-vimmode expands beyond prompt-local editing.

## Ideas

- [ ] Keybinding presets (qwerty, dvorak, colemak, colemak-dh, etc) after finite insert actions prove useful.
- [ ] Add registry-backed diagnostic action entries and a fuller Neovim quickref classification after M1 prompt transform action keybindings ship. Context: /plan-eng-review intentionally cut `vimmode.*` diagnostic metadata and quickref polish from the first code PR so resolver/config/dispatch risk stays bounded.
- [ ] Explore config-hacker and extension-author workflows: action registry introspection, recipes, community presets, and future extension seams.
- [ ] Make pi-vimmode controllable with ex commands?
