---
title: Resolve symbolic Vim leader mappings after layered config overlay
date: 2026-07-14
category: docs/solutions/architecture-patterns
module: pi-vimmode
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Adding symbolic key prefixes across layered configuration sources"
  - "Resolving physical keybindings from later configuration values"
  - "Reserving modal grammar only for accepted mappings"
  - "Testing side-effect-free cancellation in a modal input parser"
tags: [leader-key, keymap-resolution, config-precedence, vim-keybindings, modal-input, typescript]
---

# Resolve symbolic Vim leader mappings after layered config overlay

## Context

`pi-vimmode` needed Vim leader configuration across three sources, in this precedence order:

1. global JSON: `~/.pi/agent/settings.json`
2. trusted global JavaScript: `~/.pi/agent/pi-vimmode.config.js`
3. project JSON: `.pi/settings.json`

The difficult part was not validating one printable character. A mapping declared as `<leader>q` in an early layer must follow the final project leader, while `null` must clear inherited leader state and invalid later values must preserve valid lower-layer state.

Runtime ownership added another constraint. Configuring a leader must not steal counts, registers, marks, macros, or visual transforms unless an accepted normal/visual mapping actually uses that leader. Rejected mappings and explicit clears must leave no stale prefix reservation.

A review found a hidden side effect after the feature worked manually: invalid leader continuations shared ordinary invalid-key feedback. With `feedback.noop: "status"`, an unmatched leader sequence emitted an Ex status message even though the contract required silent cancellation. Default quiet feedback had hidden the defect.

Session-history search found no relevant prior sessions for this specific implementation.

## Guidance

### Preserve symbolic LHS values until final overlay

Parse JSON mapping keys and trusted-JS LHS values into canonical leading `<leader>` notation. Resolve the final leader first, validate each layer against it, overlay retained mappings, then expand the final overlay into physical key sequences in `src/config.ts`.

Core flow:

1. parse each config source without binding `<leader>` to that layer's local value;
2. resolve final leader using global JSON < trusted JS < project JSON precedence;
3. validate leader-dependent entries per layer so invalid higher-layer entries do not erase valid lower-layer mappings;
4. overlay retained source mappings;
5. expand the final overlay once;
6. compile conflicts, actions, diagnostics, and runtime matchers from physical keys.

`LeaderExpansionContext` keeps final leader, warnings, and expansion mode together across helpers. Primary implementation points are `src/config.ts:expandLeaderMappings` and `src/config.ts:resolveKeymapFromLayers`.

### Keep mapping LHS and replay RHS semantics separate

`src/config-js.ts:tokenizeLhsKeys` recognizes case-insensitive `<leader>` only on mapping LHS values. Replay RHS tokenization remains unchanged.

```js
vim.g.mapleader = " ";
vim.keymap.set("n", "<leader>x", "<leader>");
```

The LHS resolves to physical ` x`. The RHS tokenizer normalizes `<leader>` to replay input `leader`; it does not substitute the configured physical leader.

### Share validation across JSON and JavaScript

Both config surfaces use one predicate:

```ts
export function isPrintableLeader(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === 1 &&
    value.charCodeAt(0) >= 32 &&
    value.charCodeAt(0) !== 127
  );
}
```

`src/config-js.ts:setMapleader` and `src/config.ts:parsePiVimMode` accept one printable character or `null`. Invalid values emit field-local warnings without discarding valid sibling or lower-layer settings.

### Derive reservation from accepted final mappings

A configured leader alone does not reserve modal grammar. Reservation activates only when at least one accepted normal/visual mapping derived from `<leader>` survives final overlay and action validation.

This ordering prevents these entries from stealing normal/visual input:

- rejected printable insert mappings;
- invalid multi-key text objects;
- disabled or conflicting actions;
- explicitly cleared bindings;
- literal replacements that no longer carry leader provenance.

When reservation is active, `src/commands.ts` checks the leader before numeric count parsing. `src/modal/engine.ts` checks it before register, macro, mark, and visual `u`/`U` handlers. Already-pending operands retain ownership.

### Cancel invalid leader continuations without feedback

Ordinary invalid Vim sequences may use configured no-op feedback. Invalid leader continuations are different: they must clear pending state without creating a new Ex/status message.

```ts
if (pendingResult.type === "invalid") {
  if (keymap.leader && state.pending?.startsWith(keymap.leader)) {
    return invalidate(clearPending(state));
  }
  return invalidate(withNoopFeedback(clearPending(state), options, "invalid Vim key sequence"));
}
```

Test this with feedback explicitly enabled. A default-quiet test cannot detect message-state regressions.

### Avoid these tempting alternatives

- **Expand each layer immediately:** inherited mappings retain mixed prefixes and cannot follow a project override.
- **Expand before overlay and track separate provenance:** action replacement, additive JS mappings, and clears can leave stale ownership metadata.
- **Preserve `<leader>` until runtime:** every matcher, conflict diagnostic, clone path, and help view becomes symbol-aware.
- **Reserve whenever leader is configured:** leader-only settings and rejected mappings disable familiar Vim grammar without an executable mapping.
- **Use ordinary invalid-key feedback:** prompt text stays unchanged, but status message state still violates the side-effect contract.

## Why This Matters

Late binding preserves configuration intent. A project can change a global or JS leader without redeclaring every inherited mapping, while runtime code still receives simple physical sequences.

Deriving ownership after validation keeps configuration metadata aligned with executable behavior. No accepted mapping means no reserved prefix.

Silent-cancellation tests also demonstrate a broader modal-editor rule: “no text edit” is weaker than “no side effect.” Status messages, registers, marks, search highlights, captured visual state, and dot-repeat are observable state and need explicit assertions.

## When to Apply

- A symbolic mapping value depends on configuration resolved by later layers.
- Declarative JSON and trusted executable config feed one immutable runtime model.
- A configured prefix competes with existing modal grammar.
- Rejected or disabled bindings must not retain runtime ownership.
- Cancellation must be side-effect-free while ordinary invalid input may show feedback.

## Examples

Project-local manual test:

```json
{
  "piVimMode": {
    "leader": " ",
    "feedback": { "noop": "status" },
    "keymap": {
      "commands": {
        "showKeybindings": ["<leader>k"]
      }
    }
  }
}
```

After restarting Pi:

1. press `Esc`, then `Space`, `k`; the keybindings popup opens;
2. inspect keybindings; the resolved mapping displays physical ` k`;
3. press `Space`, `z`; pending input clears without a new status message;
4. press ordinary unmapped `z`; configured no-op feedback still appears.

Regression coverage:

- `test/config.test.ts` — precedence, `null`, invalid fallback, final expansion, protected suffixes, clears, and reservation eligibility.
- `test/config-js.test.ts` — `vim.g.mapleader`, assignment order, unchanged RHS behavior, project override, and protected shortcuts.
- `test/commands.test.ts` — active digit leader beats count parsing.
- `test/modal.test.ts` — structural-prefix reservation, pending-operand ownership, visual behavior, and silent invalid continuation with status feedback enabled.
- `test/vim-editor.test.ts` and `test/customization.test.ts` — cloning and physical resolved-key displays.

Verified on 2026-07-14 with `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, strict leader and complete OpenSpec validation, plus the project-local manual test above.

## Related

- [`../logic-errors/pi-vimmode-config-keymap-precedence-2026-06-17.md`](../logic-errors/pi-vimmode-config-keymap-precedence-2026-06-17.md) — final-layer keymap precedence and default conflict removal.
- [`finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md`](finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md) — finite pending-prefix grammar and modal parser boundaries.
- [`pi-vimmode-typed-action-registry-keybindings-2026-06-09.md`](pi-vimmode-typed-action-registry-keybindings-2026-06-09.md) — trusted JS actions, config validation, and mode-scoped bindings.
- [`../developer-experience/pi-vimmode-ctrl-p-insert-mode-delegates-to-pi-2026-06-22.md`](../developer-experience/pi-vimmode-ctrl-p-insert-mode-delegates-to-pi-2026-06-22.md) — protected shortcut ownership across modes.
- `docs/adr/0004-final-leader-resolution.md` — architectural decision for final leader resolution.
- `openspec/changes/add-leader-key-configuration/` — durable requirements, design, and implementation tasks.
