## 1. Types and JSON config

- [x] 1.1 Add optional resolved/user leader fields and active leader metadata to config/keymap types, defaults, and centralized clone helpers.
- [x] 1.2 Add focused config tests for printable/null/invalid leader parsing, default unset behavior, layer precedence, final-overlay expansion, missing/bare/mid-sequence placeholder warnings, repeated placeholders, higher-layer clears/replacements, insert-escape ownership, and existing insert/text-object legality.
- [x] 1.3 Preserve canonical leading `<leader>` notation through raw keymap overlay, then implement final effective leader expansion and retained normal/visual ownership derivation while keeping field-level warnings and explicit keymap precedence.

## 2. Trusted JavaScript config

- [x] 2.1 Add JS config tests for `vim.g.mapleader`, invalid/null assignments, leading `<leader>` LHS expansion, unchanged replay RHS behavior, additive global JSON mappings, project leader override/clear, and final assignment order.
- [x] 2.2 Implement builder-local `vim.g.mapleader` assignment and separate canonical leader-aware LHS token handling from unchanged RHS replay tokenization; keep additive JS overlay raw until final expansion.

## 3. Prefix ownership and modal integration

- [x] 3.1 Add command/modal tests proving retained normal/visual leader mappings reserve default bindings, counts, registers, marks/macros, and visual `u`/`U` across modes, while leader-only and insert-only settings plus already-pending operands preserve existing behavior.
- [x] 3.2 Implement active leader-prefix precedence in resolved keymap compilation, command count parsing, and normal/visual structural dispatch.
- [x] 3.3 Add regression tests proving invalid leader continuations do not edit text, write registers/marks, change search highlights or captured visual state, alter dot-repeat, emit Ex messages, or steal protected Pi shortcuts.

## 4. Adapter and documentation

- [x] 4.1 Add live `VimEditor` cloning coverage for resolved leader and active keymap metadata; verify resolved views show physical expanded keys.
- [x] 4.2 Document JSON and JS leader syntax, precedence, `null` clearing, warnings, reservation behavior, examples, and non-goals in `docs/settings.md`, `docs/features.md`, and README; remove stale leader-map limitation/TODO.

## 5. Validation

- [x] 5.1 Run focused leader config, JS config, command, modal, editor, and docs tests.
- [x] 5.2 Run `bun test`, `bun run check-types`, `bun run lint`, and targeted `bun run format:check`/format fixes without touching user global settings.
- [x] 5.3 Run `openspec validate --specs --strict` and `graphify update .`; verify working-tree changes stay scoped and unrelated user edits remain untouched.
