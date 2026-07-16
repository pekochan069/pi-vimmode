---
title: Trusted JavaScript config transactions
date: 2026-07-16
category: design-patterns
module: pi-vimmode-config
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
  - "Adding trusted JavaScript configuration that changes multiple Vim settings or mappings"
tags: [javascript-config, transactions, keymaps, pi-vimmode]
---

# Trusted JavaScript config transactions

## Context

Trusted JavaScript config needs to expose the same mapping controls as JSON config without leaving partial state when evaluation throws. Scoped unmaps must also remove inherited mappings rather than only suppressing local writes.

## Guidance

Stage every config mutation while evaluating user code. Commit staged preset, mapping, remap, and unmap operations only after evaluation succeeds. Close retained configuration APIs after evaluation so delayed calls cannot mutate active state.

```js
export default (vim) => {
  vim.g.mapleader = " ";
  vim.keymap.set("n", "<leader>q", vim.prompt.quote());
  vim.keymap.set("n", "zq", null);
};
```

Treat `null` in `vim.keymap.set()` as an unmap operation for its selected mode and scope. Preserve declaration order when applying staged operations.

## Why This Matters

Immediate mutation makes one config error produce a mixed old/new keymap. Transactional evaluation preserves last known-good configuration. Recording unmaps as operations makes inherited mappings removable and keeps JavaScript configuration behavior aligned with JSON configuration.

## When to Apply

- Trusted user configuration can execute arbitrary JavaScript.
- Evaluation can fail after modifying more than one setting.
- A child config scope must override or remove inherited mappings.

## Examples

A failed config leaves existing settings unchanged:

```js
export default (vim) => {
  vim.g.mapleader = " ";
  throw new Error("invalid config");
};
```

A successful config commits both operations together; a failed config commits neither.

## Related

- `RELEASE.md`
- Issue #36
