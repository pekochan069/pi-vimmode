# TODOs

## Deferred

- [ ] Explore a full user-defined action/plugin surface for pi-vimmode after the finite named prompt action/transform keybinding layer proves demand.
  - [ ] javascript/typescript based config files in `~/.pi/agent/`
- [ ] Add registry-backed diagnostic action entries and a fuller Neovim quickref classification after M1 prompt transform action keybindings ship. Context: /plan-eng-review intentionally cut `vimmode.*` diagnostic metadata and quickref polish from the first code PR so resolver/config/dispatch risk stays bounded.
- [ ] Remove legacy `promptTransform.*` diagnostic/search aliases after one release cycle on canonical `prompt.transform.*` IDs. Context: M1 should keep old aliases searchable for transition, then retire them so public action vocabulary does not stay split forever.
- [ ] Show all read-only Ex help/diagnostic outputs in popup UI, not inline rows.
  - Commands: `:help`, `:help <topic>`, `:features`, `:features <query>`, `:actions <query>`, `:keymap <action>`, `:mapcheck <key>`, `:messages`, `:vimmode inspect`, `:vimdoctor`.
  - Reuse existing `KeybindingDiscoveryOverlayComponent` style or generalize into `ExHelpOverlayComponent`.
  - Keep edit/mutation Ex commands inline/normal: `:s`, `:d`, `:y`, `:put`, `:copy`, `:move`, `:join`, prompt transforms, `:noh`.
  - Acceptance: read-only commands open centered bounded scrollable overlay; `Esc`/`Ctrl-C`/`Ctrl-G` close; `j/k` and arrows scroll; no prompt edits, no macro recording, no retained runtime-message pollution unless command already intentionally writes history.
  - Tests: update modal effect tests for generic popup/open-overlay effect; vim-editor overlay tests for representative commands; docs drift tests for popup docs covering all popup-backed Ex commands.

## Ideas

- [ ] Explore config-hacker and extension-author workflows: action registry introspection, recipes, community presets, and future extension seams.
