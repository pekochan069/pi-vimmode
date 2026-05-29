## Context

pi-vimmode already documents core behavior in `README.md`, but feature breadth has grown across modes, search, Ex substitution, registers, marks, macros, rendering, lifecycle, and settings. Settings are implemented in `src/config.ts` and typed in `src/types.ts`; behavior contracts live across existing OpenSpec specs and tests. New docs must make those sources easier for users to consume without changing runtime code or configuration.

User-facing docs will live in `docs/features.md` and `docs/settings.md`. A compact ADR in `docs/adr/` will record why those docs are canonical user-facing references and which source files must be checked when updating them.

## Goals / Non-Goals

**Goals:**

- Create a complete feature guide with useful examples for every pi-vimmode feature area.
- Create a settings reference that explains every `piVimMode` setting, including defaults, accepted values, behavior, validation/fallback rules, and examples.
- Add an ADR documenting the docs structure and source-of-truth policy.
- Keep implementation docs-only and confined to `docs/` plus this OpenSpec change.

**Non-Goals:**

- Change source code, tests, package metadata, runtime config, or README links.
- Add new pi-vimmode behavior or change existing requirements.
- Reorganize existing docs beyond adding the requested docs.
- Claim full Vim parity where pi-vimmode intentionally supports a smaller prompt-local subset.

## Decisions

1. **Use `docs/features.md` and `docs/settings.md` for user guides.**
   - Rationale: Feature and settings references are user-facing manuals, not architecture decisions.
   - Alternative considered: Put all docs in `docs/adr/`. Rejected because existing ADR style is compact decision record, and settings/feature manuals would make ADRs noisy.

2. **Add one ADR under `docs/adr/` for docs structure and source-of-truth.**
   - Rationale: Satisfies the `docs/adr/` success criterion while preserving ADR purpose.
   - Alternative considered: Skip ADR and only write guides. Rejected because future docs drift is likely without an explicit maintenance decision.

3. **Use source and tests as the behavior oracle.**
   - Rationale: `src/config.ts`, `src/types.ts`, OpenSpec specs, and tests describe actual defaults, validation, and supported feature limits more reliably than existing prose.
   - Alternative considered: Copy and split README content. Rejected because README may lag source and would duplicate drift.

4. **Document limitations beside features.**
   - Rationale: pi-vimmode is prompt-local and intentionally partial. Users need clear boundaries for search, Ex commands, registers, marks, macros, and Vim parity.
   - Alternative considered: Keep limitations in a final catch-all section only. Rejected because feature-local caveats make examples safer.

## Risks / Trade-offs

- Documentation drifts from implementation → Mitigation: settings doc cites `src/config.ts` and `src/types.ts` as source of truth; ADR requires checking specs/tests before updates.
- Docs duplicate README content → Mitigation: new docs organize detailed references; README remains unchanged by this work because user constrained edits.
- Settings reference misses nested keys → Mitigation: tasks require enumerating defaults from `DEFAULT_VIM_OPTIONS`, `DEFAULT_VIM_KEYMAP`, UI/search/macro/mark defaults, and parser validation rules.
- Examples imply unsupported Vim behavior → Mitigation: each feature section includes supported scope and explicit limitations.
- `docs/adr/` success criterion conflicts with guide placement → Mitigation: create one ADR in `docs/adr/` and user guides in docs root, matching user-selected path decision.
