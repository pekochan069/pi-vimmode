# TODOs

## Next Version

- [x] Force override system keybindings (like `ctrl+j`)
- [x] Insert mode new line keybindings (previous line and next line)
- [ ] Add more common ex-commands like `q` or `w`
- [ ] ex command autocomplete
- [ ] `:n` line jumps

## Deferred

- [ ] More insert mode keybindings
- [ ] Add `gv` reselect last visual range.
- [ ] Consider `gj` / `gk` display-line motions if prompt rendering gains stable display-line mapping.
- [ ] Consider `zz` / `zt` / `zb` viewport recentering if prompt viewport state needs explicit cursor positioning.
- [ ] Consider window/file keybindings only if pi-vimmode expands beyond prompt-local editing.

## Ideas

- [ ] Keybinding presets (qwerty, dvorak, colemak, etc)
- [ ] Separate escape keybindings (escapeInsert, escapeVisual, escapeEx, ...)
- [ ] Explore a full user-defined action/plugin surface for pi-vimmode after the finite named prompt action/transform keybinding layer proves demand.
  - [ ] javascript/typescript based config files in `~/.pi/agent/`
- [ ] Add registry-backed diagnostic action entries and a fuller Neovim quickref classification after M1 prompt transform action keybindings ship. Context: /plan-eng-review intentionally cut `vimmode.*` diagnostic metadata and quickref polish from the first code PR so resolver/config/dispatch risk stays bounded.
- [ ] Explore config-hacker and extension-author workflows: action registry introspection, recipes, community presets, and future extension seams.
- [ ] Make pi-vimmode controllable with ex commands?
