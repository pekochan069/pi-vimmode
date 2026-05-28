---
title: Protect global agent settings from project formatting
date: 2026-05-28
category: docs/solutions/conventions
module: pi-vimmode extension workflow
problem_type: convention
component: development_workflow
severity: medium
applies_when:
  - "working in /home/thinline20/.pi/agent/extensions/pi-vimmode"
  - "running formatters or repository-wide maintenance commands"
  - "agent-global configuration paths appear in task context"
tags:
  - agent-settings
  - formatting
  - project-instructions
  - guardrail
---

# Protect global agent settings from project formatting

## Context

`/home/thinline20/.pi/agent/settings.json` is agent-global configuration, not project source for `pi-vimmode`. During extension work, the file was being touched or possibly formatted unintentionally, creating a scope violation: project maintenance commands should not mutate the user's global agent settings.

The durable fix was to add an explicit guard to project `AGENTS.md` so future agents see the boundary before editing or formatting files.

## Guidance

State the protected-file rule in `AGENTS.md` under `## Important`, close to other workflow constraints.

Before:

```md
## Important

- Don’t fight errors! Whenever you encounter the same error twice, research the web and find 3-5 possible ways to fix it. Then choose the most efficient solution and implement it
- Follow rules in `docs/rules/*`
```

After:

```md
## Important

- Do not edit, write, format, normalize, or otherwise touch `/home/thinline20/.pi/agent/settings.json` unless the user explicitly asks for that exact file.
- Don’t fight errors! Whenever you encounter the same error twice, research the web and find 3-5 possible ways to fix it. Then choose the most efficient solution and implement it
- Follow rules in `docs/rules/*`
```

Prefer targeted edits and formatting when fixing localized issues. Avoid broad formatter runs if the toolchain or surrounding workflow may reach outside intended project files.

## Why This Matters

`settings.json` controls agent-global behavior. Accidental formatting, normalization, or writes can change the user's environment outside the task scope. An explicit instruction-file guard makes the boundary discoverable to fresh sessions and other agents before they run bulk tools.

This also prevents a common workflow failure mode: using repo-wide formatters to fix one file after `format:check` fails. If only one markdown/spec file needs formatting, fix that file directly rather than running broad cleanup that may touch unrelated configuration.

## When to Apply

- Work happens inside `/home/thinline20/.pi/agent/extensions/pi-vimmode`.
- A task involves formatting, lint fixes, codemods, generated config, or bulk edits.
- `/home/thinline20/.pi/agent/settings.json` appears in context but was not explicitly requested as the target file.
- A project instruction file needs to document protected paths or user-owned configuration boundaries.

## Examples

Risky:

```sh
bun run format
```

Better when only known files need attention:

```sh
oxfmt --check README.md openspec/specs/vim-marks/spec.md
```

or use a precise `edit` on the affected file.

Risky request interpretation:

```txt
Normalize all JSON settings files.
```

Safer interpretation unless explicitly told otherwise:

```txt
Only edit files required for the current project task. Do not touch `/home/thinline20/.pi/agent/settings.json`.
```

## Related

- `docs/solutions/developer-experience/pi-vimmode-auto-activation-2026-05-26.md` — low overlap; covers settings refresh and validation workflow, not protected global settings.
- `docs/solutions/tooling-decisions/pi-vimmode-ui-config-single-source-of-truth-2026-05-27.md` — low overlap; covers user-facing config semantics, not formatter scope.
