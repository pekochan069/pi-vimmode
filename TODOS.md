# TODOs

## Deferred

- [ ] Explore a full user-defined action/plugin surface for pi-vimmode after the finite named prompt action/transform keybinding layer proves demand.
- [ ] Add registry-backed diagnostic action entries and a fuller Neovim quickref classification after M1 prompt transform action keybindings ship. Context: /plan-eng-review intentionally cut `vimmode.*` diagnostic metadata and quickref polish from the first code PR so resolver/config/dispatch risk stays bounded.
- [ ] Remove legacy `promptTransform.*` diagnostic/search aliases after one release cycle on canonical `prompt.transform.*` IDs. Context: M1 should keep old aliases searchable for transition, then retire them so public action vocabulary does not stay split forever.

## Ideas

- [ ] Explore config-hacker and extension-author workflows: action registry introspection, recipes, community presets, and future extension seams.
- [ ] Full keybindings and features, helps in popup UI
