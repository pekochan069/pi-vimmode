## Why

pi-vimmode can bind finite prompt-transform actions, but it cannot bind a Pi slash command.
Users must leave their modal keymap to type commands such as `/model`, `/tree`, or a
workflow command. This change adds one configured, declarative action without adding an Ex
bridge or a general plugin callback API.

## What Changes

- Add a bindable `pi.command` action with required `{ command: "/..." }` arguments.
- Accept the action from JSON `piVimMode.keymap.actions` and trusted JavaScript through
  `vim.action.pi.command({ command })`.
- Restrict the action to Normal mode.
- Dispatch through Pi's existing submit callback while restoring the prompt draft, cursor, and
  local redo state.
- Reject malformed command arguments at config load time without checking whether Pi knows the
  configured command.

Non-goals:

- No `:pi` Ex command.
- No command-name prevalidation.
- No arbitrary JavaScript action callbacks.
- No Visual-mode command dispatch in this change.

## Capabilities

### New Capabilities

- `pi-command-action`: Configured Normal-mode leader bindings dispatch Pi slash commands.

### Modified Capabilities

- `vim-keymap-configuration`: Action keymaps accept the finite `pi.command` ID.
- `vim-editor-adapter-architecture`: The adapter applies the Pi command dispatch effect.
- `pi-vimmode-documentation`: User docs describe JSON and trusted JavaScript command mappings.

## Impact

Affected seams: action registry/types, config parsing, semantic command resolution, modal effects,
VimEditor submit integration, trusted JS API metadata/types, docs, and focused Bun tests.

No runtime or peer dependency changes. Existing mappings, Insert mode, Visual modes, and Ex
behavior remain unchanged.
