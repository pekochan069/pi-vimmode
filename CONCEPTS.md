# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Vim input ownership

### Pi-owned shortcut

A key sequence whose application-level behavior belongs to Pi rather than to pi-vimmode, even when pi-vimmode is active.

Pi-owned shortcuts should be delegated as raw input unless pi-vimmode intentionally implements or explicitly binds them. This keeps app actions such as prompt submission, cancellation, autocomplete, model controls, external-editor actions, and clipboard/image paste in Pi's keybinding layer.

### Protected shortcut

A Pi-owned shortcut that pi-vimmode recognizes in configuration and diagnostics so accidental keymap ownership is rejected or explained.

Protected shortcuts can still be reclaimed, but only through explicit override configuration. The override is a statement of ownership intent; it is not an OS or terminal guarantee that Pi will deliver the chord distinctly.

### Modal delegation

The act of returning an input sequence from pi-vimmode to Pi without treating it as a Vim command.

Delegation preserves Pi application behavior while letting pi-vimmode reset or clear transient Vim state when appropriate. A delegated input is not a repeatable Vim edit and should not be recorded as a macro command.

### Visual block mode

The pi-vimmode mode for rectangular selections across prompt lines.

Visual block mode is available through configured keymap ownership rather than through an unconditional protected paste shortcut. This keeps blockwise editing possible while letting Pi-owned paste shortcuts remain delegated by default.
