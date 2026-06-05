---
title: Pi vimmode runtime help docs drift guard
date: 2026-06-05
category: docs/solutions/architecture-patterns
module: pi-vimmode
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Adding runtime help or feature discovery to pi-vimmode"
  - "Preventing user-facing docs from drifting away from source-backed behavior"
  - "Extending finite Ex commands without implementing full Vim help or Vimscript"
  - "Making documentation claims testable through source/spec/test anchors"
related_components:
  - documentation
  - testing_framework
  - development_workflow
tags:
  - pi-vimmode
  - runtime-help
  - docs-drift
  - ex-command-line
  - source-of-truth
  - openspec
  - documentation
  - test-guard
---

# Pi vimmode runtime help docs drift guard

## Context

`pi-vimmode` had source-backed feature work, OpenSpec requirements, user docs, and tests, but no compact runtime discovery surface tying those claims together. That made it easy for docs to omit supported behavior or regress into misleading claims, especially around finite Ex commands such as `:noh` / `:nohlsearch`, settings defaults, customization diagnostics, and prompt-local limitations.

The implemented solution introduced a finite runtime help registry plus docs drift tests. Runtime help remains intentionally small: `:help`, `:features`, and `:messages` expose what pi-vimmode supports without implying full Vim help tags, Vimscript, a pager, or a command palette.

## Guidance

Use a finite, typed registry as the source-backed bridge between runtime discovery, docs, specs, and tests.

1. **Put runtime help topics in `src/runtime-help.ts`.** Registry entries carry the user-facing summary plus anchors that tests can validate.

   ```ts
   export type RuntimeHelpEntry = {
     id: string;
     category: RuntimeHelpCategory;
     topics: readonly string[];
     summary: string;
     examples: readonly string[];
     limits: readonly string[];
     docsAnchor: string;
     specAnchor: string;
     testAnchors: readonly string[];
   };
   ```

   Add aliases/topics, examples, limitations, `docsAnchor`, `specAnchor`, and `testAnchors` when adding a discoverable feature. Reuse existing customization metadata for actions and protected shortcuts instead of creating duplicate help catalogs.

2. **Keep Ex parser support exact and finite.** `src/ex.ts` parses `help`, `features`, and `messages` as explicit runtime-help commands. Unsupported abbreviations and unexpected arguments remain parse errors; `:messages anything` is rejected.

   ```ts
   export type ParsedExRuntimeHelpCommand = {
     type: "runtimeHelp";
     command: "help" | "features" | "messages";
     query?: string;
   };
   ```

3. **Execute runtime help as info-only modal messages.** Runtime help should not mutate prompt text, registers, marks, macro state, search highlights, visual selections, or dot-repeat state. Route it through the same modal message surface used by existing Ex feedback.

   ```ts
   return restoreVisualExState(
     state,
     { kind: "info", text: message },
     parsed.command !== "messages",
   );
   ```

   The third argument matters: `:messages` summarizes retained history but does not retain its own output, so repeated `:messages` calls do not pollute history.

4. **Keep message history bounded and prompt-local.** Retain recent user-facing success/error/info/no-op feedback with a small cap. In this change the cap is 20 messages. Do not build a persistent log or multi-row help UI unless a later product requirement justifies it.

5. **Make docs claims executable.** `test/docs-drift.test.ts` validates that registry docs anchors exist in `docs/features.md`, spec/test anchors resolve, supported runtime commands are documented, `:noh` / `:nohlsearch` cannot be described as unsupported, and settings docs stay aligned with source-backed defaults.

## Why This Matters

Runtime help and documentation drift together create a trust problem: users and agents rely on docs to know what pi-vimmode can do, while the source may already support more behavior than the prose says. A registry with docs/spec/test anchors makes runtime help honest and testable, and prevents `:help` from implying full Vim help tags, Vimscript, or pager behavior.

The modal implementation keeps blast radius low. Runtime help uses the existing one-row width-safe message surface and restores visual mode state, so it composes with visual selection, search highlights, cursor rendering, registers, macros, and dot-repeat instead of creating a second UI/state channel.

## When to Apply

- Adding runtime discovery for pi-vimmode commands, settings, actions, or protected shortcuts.
- Adding finite read-only Ex commands such as diagnostics, help, feature lookup, or history summaries.
- Updating docs with source-backed behavior claims or fixing drift between OpenSpec specs, source, tests, and user-facing docs.
- Preventing familiar Vim command names from implying unsupported Vim parity.

Do not use this pattern as permission to implement full Vim help, Vimscript parsing, persistent logs, or a command palette. The pattern is strongest when the supported surface is finite and prompt-local.

## Examples

### Registry-backed help entry

```ts
{
  id: "search",
  category: "search",
  topics: ["search", "/", "?", "nohlsearch", "noh"],
  summary:
    "prompt search uses /, ?, n, and N; :noh/:nohlsearch clear visible highlights while keeping repeat-search state",
  examples: ["/term", "?term", ":nohlsearch"],
  limits: ["prompt-local", "literal by default", "no cross-prompt history"],
  docsAnchor: "runtime-help:search",
  specAnchor: "openspec/specs/vim-search/spec.md",
  testAnchors: ["test/modal.test.ts", "test/vim-editor.test.ts"],
}
```

This gives future changes a concrete checklist: docs anchor, spec anchor, tests, summary, examples, and limitations all travel with the runtime help entry.

### Docs drift guard

```ts
for (const entry of runtimeHelpEntries({ options: DEFAULT_VIM_OPTIONS })) {
  expect(featuresDoc).toContain(`<!-- ${entry.docsAnchor} -->`);
  expect(existsSync(entry.specAnchor)).toBe(true);
  for (const testAnchor of entry.testAnchors) expect(existsSync(testAnchor)).toBe(true);
}
```

Adding a runtime help entry without a docs/spec/test connection now fails `bun test` instead of waiting for a user to notice stale prose.

Rule for history commands: `:messages` must summarize retained messages without retaining its own output.

## Related

- `docs/solutions/architecture-patterns/pi-vimmode-finite-ex-line-commands-architecture-2026-06-01.md` — predecessor finite Ex architecture and parser/modal/test separation.
- `docs/solutions/architecture-patterns/pi-vimmode-ex-command-line-substitution-architecture-2026-05-28.md` — finite Ex command-line scope and prompt-local design.
- `docs/solutions/logic-errors/vim-behavior-contract-drift-2026-05-28.md` — earlier docs/spec/test behavior drift issue.
- `docs/solutions/tooling-decisions/pi-vimmode-ui-config-single-source-of-truth-2026-05-27.md` — source-of-truth pattern for config and docs alignment.
- `docs/solutions/logic-errors/pi-vimmode-customization-diagnostics-edge-cases-2026-06-04.md` — effective option diagnostics and customization metadata reuse.

## Validation

The implementation was verified with:

```bash
bun test
bun run check-types
bun run lint
bun run format:check
openspec validate --specs --strict
```
