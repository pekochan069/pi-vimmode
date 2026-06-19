# TODOs

## Next Version

- [x] Add `{` / `}` paragraph motions and `ip` / `ap` paragraph text objects.
- [x] Add `*` / `#` search word under cursor forward/backward, reusing prompt search repeat state.
- [ ] Add `X` delete character before cursor.
- [ ] Add `gu` / `gU` / `g~` case operators, including text-object and visual support.
- [ ] Add `gv` reselect last visual range.
- [ ] ex command autocomplete

## Deferred

- [ ] Consider `gj` / `gk` display-line motions if prompt rendering gains stable display-line mapping.
- [ ] Consider `zz` / `zt` / `zb` viewport recentering if prompt viewport state needs explicit cursor positioning.
- [ ] Consider window/file keybindings only if pi-vimmode expands beyond prompt-local editing.

## Ideas

- [ ] Explore a full user-defined action/plugin surface for pi-vimmode after the finite named prompt action/transform keybinding layer proves demand.
  - [ ] javascript/typescript based config files in `~/.pi/agent/`
- [ ] Add registry-backed diagnostic action entries and a fuller Neovim quickref classification after M1 prompt transform action keybindings ship. Context: /plan-eng-review intentionally cut `vimmode.*` diagnostic metadata and quickref polish from the first code PR so resolver/config/dispatch risk stays bounded.
- [ ] Explore config-hacker and extension-author workflows: action registry introspection, recipes, community presets, and future extension seams.
