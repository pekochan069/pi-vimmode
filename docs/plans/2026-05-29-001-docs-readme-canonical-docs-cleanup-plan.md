---
title: "docs: Make README an index to canonical pi-vimmode docs"
type: docs
status: completed
date: 2026-05-29
origin: docs/adr/0002-user-facing-pi-vimmode-docs.md
---

# docs: Make README an index to canonical pi-vimmode docs

## Summary

Turn `README.md` into a concise quickstart and documentation index, while keeping detailed behavior in `docs/features.md` and complete settings reference in `docs/settings.md`. This resolves the documentation-review open question by choosing one canonical path instead of maintaining three long overlapping references.

---

## Problem Frame

`docs/adr/0002-user-facing-pi-vimmode-docs.md` establishes `docs/features.md` and `docs/settings.md` as canonical user-facing docs. `README.md` still duplicates detailed keymap, settings, Ex, macro, and limitation content. That duplication makes future behavior/settings changes easy to update in one place and miss in another.

---

## Requirements

- R1. `README.md` remains useful as first-contact documentation: what pi-vimmode is, install/load, basic mode model, links, validation commands, and support/recovery pointers.
- R2. Detailed feature behavior lives in `docs/features.md`, not duplicated in README.
- R3. Complete `piVimMode` settings, defaults, protected-key rules, and examples live in `docs/settings.md`, not duplicated in README.
- R4. OpenSpec docs scenarios that currently name README as the detailed documentation target are updated to reference the canonical docs split.
- R5. The ADR Open Question about README role is resolved or removed after README/spec updates land.
- R6. Docs validation confirms links, headings, and changed files stay formatted.

---

## Scope Boundaries

- This plan does not change pi-vimmode runtime behavior.
- This plan does not rewrite `docs/features.md` or `docs/settings.md` except for small link/back-reference fixes discovered while trimming README.
- This plan does not archive `document-pi-vimmode-features-settings`; archive remains a separate OpenSpec step after implementation is complete.
- This plan does not require a generated docs site or new docs tooling.

### Deferred to Follow-Up Work

- Automated link checking can be added later if docs keep growing.
- README badges/screenshots/demo media are out of scope unless already present and broken by the rewrite.

---

## Context & Research

### Relevant Files

- `README.md`: currently 527 lines with detailed `Keymap`, `Settings`, `Ex command-line`, `Macros`, `Limitations`, and validation sections.
- `docs/features.md`: canonical behavior guide, including activation, modes, motions, visual modes, Ex, registers, marks, macros, UI/status, shortcut compatibility, and validation.
- `docs/settings.md`: canonical settings reference, including merge precedence, key syntax, every setting/default, examples, and troubleshooting.
- `docs/adr/0002-user-facing-pi-vimmode-docs.md`: records the docs split and currently contains the deferred README-role question.
- `openspec/specs/vim-keymap-configuration/spec.md`, `openspec/specs/vim-ui-configuration/spec.md`, and related specs: several scenarios still say README documents detailed settings/keymap behavior.

### Existing Decision

`docs/adr/0002-user-facing-pi-vimmode-docs.md` makes source order explicit: `src/config.ts` and `src/types.ts` define settings truth; feature docs should prefer source/spec/test behavior over older README prose.

---

## Key Technical Decisions

- Choose README-as-index, not synced full reference. The canonical docs are already longer and more precise; keeping README equally detailed creates ongoing drift risk.
- Preserve README as the install and orientation surface. Users should not need to open multiple docs before trying the extension.
- Update OpenSpec scenarios to name canonical docs where they require detailed docs coverage. This keeps durable requirements aligned with the ADR and prevents future work from re-expanding README by accident.
- Resolve the ADR Open Question in the same change that rewrites README so the decision trail stays current.

---

## Open Questions

### Resolved During Planning

- Should README be trimmed or kept as a synced full reference? Trim it to quickstart/index; `docs/features.md` and `docs/settings.md` are the detailed canonical docs.

### Deferred to Implementation

- Exact README length target. Implementation should keep it concise enough to avoid duplicating reference tables; a short overview plus links is the bar, not a strict line count.
- Exact OpenSpec scenario wording. Implementation should preserve existing acceptance intent while changing the named documentation target.

---

## Implementation Units

### U1. Rewrite README as quickstart and documentation index

**Goal:** Remove detailed reference duplication while preserving first-contact usefulness.

**Requirements:** R1, R2, R3

**Dependencies:** None

**Files:**

- Modify: `README.md`

**Approach:**

- Keep a concise opening description of pi-vimmode.
- Keep install/load instructions and basic usage model.
- Replace detailed keymap/settings/Ex/macros/limitations tables with links to `docs/features.md` and `docs/settings.md`.
- Keep validation commands and point contributors to the ADR/source map for docs maintenance.
- Keep recovery pointer to the new disable/recover section in `docs/features.md`.

**Test scenarios:**

- Reader can install pi-vimmode from README alone.
- Reader can find feature behavior from README in one link.
- Reader can find settings defaults/examples from README in one link.
- README no longer contains duplicated full keymap/settings tables that must stay manually synced.

**Verification:**

- `README.md` links to `docs/features.md`, `docs/settings.md`, and `docs/adr/0002-user-facing-pi-vimmode-docs.md`.
- Manual scan confirms detailed default keymap/settings reference is not duplicated in README.

---

### U2. Align OpenSpec documentation scenarios with canonical docs

**Goal:** Update durable requirements so future changes validate the canonical docs split instead of re-growing README.

**Requirements:** R4

**Dependencies:** U1 decision locked in.

**Files:**

- Modify: `openspec/specs/vim-keymap-configuration/spec.md`
- Modify: `openspec/specs/vim-ui-configuration/spec.md`
- Inspect and possibly modify: other `openspec/specs/*/spec.md` files that say README must document detailed feature/settings behavior

**Approach:**

- Search durable specs for scenarios that begin with `WHEN the user opens the project README`.
- For detailed keymap/settings/UI/macro behavior, change the target to `docs/features.md` or `docs/settings.md` as appropriate.
- Keep README requirements only for quickstart/index expectations.
- Avoid weakening acceptance criteria; only change the documentation artifact named by each scenario.

**Test scenarios:**

- Specs no longer require README to carry detailed settings/keymap reference tables.
- Specs still require user-facing docs to cover the same behavior/settings.
- `openspec validate --strict` succeeds for touched specs or active change.

**Verification:**

- `grep -R "project README" openspec/specs` shows only README-index/quickstart expectations, not detailed reference requirements.
- `openspec validate document-pi-vimmode-features-settings --type change --strict` passes.

---

### U3. Resolve ADR Open Question and cross-links

**Goal:** Record the README role decision where the deferred question currently lives.

**Requirements:** R5

**Dependencies:** U1, U2

**Files:**

- Modify: `docs/adr/0002-user-facing-pi-vimmode-docs.md`
- Inspect: `docs/features.md`
- Inspect: `docs/settings.md`

**Approach:**

- Replace the deferred Open Question with a resolved decision note: README is quickstart/index; detailed behavior/settings stay canonical in docs.
- Add or verify back-links from canonical docs to README only if useful for install orientation.
- Keep ADR compact; do not move reference detail into the ADR.

**Test scenarios:**

- ADR no longer contains an unresolved README-role question after README rewrite lands.
- ADR clearly states which files are canonical and which file is the index.

**Verification:**

- Manual read of ADR confirms the decision is explicit and the Open Questions section is gone or empty.

---

### U4. Validate documentation cleanup

**Goal:** Prove the cleanup is internally consistent and ready for review.

**Requirements:** R6

**Dependencies:** U1-U3

**Files:**

- Test/validate: `README.md`
- Test/validate: `docs/features.md`
- Test/validate: `docs/settings.md`
- Test/validate: `docs/adr/0002-user-facing-pi-vimmode-docs.md`
- Test/validate: touched `openspec/specs/*/spec.md`

**Approach:**

- Run formatter on touched markdown files.
- Run OpenSpec validation for the active change.
- Run a targeted grep for stale README reference requirements.
- Manually click/inspect relative links in changed docs.

**Test scenarios:**

- No broken relative links among README, feature guide, settings reference, and ADR.
- No stale docs prose tells contributors to update README as the detailed settings/keymap source.
- Active OpenSpec change remains valid.

**Verification:**

- `bunx oxfmt --check <touched markdown files>`
- `openspec validate document-pi-vimmode-features-settings --type change --strict`
- `grep -R "README" openspec/specs docs README.md` scoped to changed expectations for manual review

---

## Sequencing

1. U1 first, because README content shape drives exact spec wording.
2. U2 second, so durable requirements align with the chosen README role.
3. U3 third, after the README/spec changes prove the decision has landed.
4. U4 last, as validation and cleanup.

---

## Risks & Mitigations

- **Risk:** README becomes too sparse for new users.  
  **Mitigation:** Keep install, mode summary, first commands, recovery, and links in README.
- **Risk:** OpenSpec scenarios are weakened accidentally.  
  **Mitigation:** Preserve acceptance intent; only change the artifact from README to canonical docs.
- **Risk:** Canonical docs still drift from runtime after README cleanup.  
  **Mitigation:** ADR already requires source/spec/test verification before doc updates; keep that policy.

---

## Ready for Work Checklist

- [ ] Confirm README-as-index direction is still desired.
- [ ] Implement U1-U3.
- [ ] Run U4 validation.
- [ ] Re-run document review or spot-check if README/spec rewrite is large.
