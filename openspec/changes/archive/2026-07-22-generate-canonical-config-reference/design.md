## Context

Issue #35 established `src/config-metadata.ts` as source-backed inventory composed from existing defaults, keymap descriptors, mapping scopes, prompt-transform actions, diagnostics, and protected-shortcut ownership. Issue #41 added self-contained declaration-only `src/vim-config.d.ts`. Current user docs still hand-copy facts from those seams, and neither source guarantees that every public trusted-config property or action has one complete reference entry.

This change crosses runtime-owned metadata, public declarations, build-time generation, committed docs, and tests. It must add documentation facts without turning a docs table into a second config/action resolver. `docs/settings.md` remains canonical for JSON; new `docs/config.md` becomes canonical trusted JavaScript config guide and initially receives generated reference sections needed by issue #42. Issue #43 will complete authored setup, workflow, safety, discovery, and package content around those blocks.

No editor behavior changes. Registers, marks, dot-repeat, search highlights, visual state, Ex messages, cursor placement, and Pi delegation remain untouched. No settings are added, so `src/config.ts`, `src/types.ts`, `VimEditor` `cloneOptions`, and live editor construction require no propagation changes.

## Goals / Non-Goals

**Goals:**

- Generate complete deterministic public property and action references from canonical source metadata.
- Give every public entry one explicit stable anchor and all issue-required fields.
- Commit generated blocks in `docs/config.md` for repository readability.
- Fail validation for missing/duplicate public metadata, declaration drift, broken anchors, or stale generated output.
- Keep runtime and declaration-only public APIs unchanged.

**Non-Goals:**

- Complete authored trusted-config guide, examples, discovery links, or package gates tracked by issue #43.
- Generate `src/vim-config.d.ts` or expose metadata through package runtime.
- Change defaults, validators, mappings, scopes, actions, aliases, or config precedence.
- Add full Vim/Neovim parity, recursive mappings, Vimscript, Neovim Lua, or user-created actions.

## Decisions

### 1. Extend canonical metadata; do not create a documentation registry

**Target seams:** `src/config-metadata.ts`, existing config option ownership in `src/config-js.ts`, keymap descriptors, prompt-transform metadata, mapping scopes, and focused metadata tests.

Public property rows will project from config-session property ownership and source defaults/validators. Documentation-only facts such as accepted value display, replacement semantics, and JSON crosswalk attach to those canonical entries or a typed projection of them; no second independent array of property names is allowed. Public action rows will project from `VIM_ACTION_METADATA` plus existing argument and alias owners. Missing public actions such as `escape` must enter the canonical catalog rather than be appended only by generator.

Alternatives rejected:

- Hand-written Markdown tables: drift is problem being solved.
- Separate script-local property/action lists: creates competing registry and cannot prove completeness.
- Making docs metadata runtime API: violates declaration-only contract and adds unsupported introspection surface.

### 2. Treat trusted JavaScript properties and JSON paths as related but distinct

**Target seams:** canonical config metadata, `src/vim-config.d.ts`, `docs/settings.md`, generated property rows.

Each public JavaScript property gets canonical API path, accepted type/value shape, built-in default, assignment semantics, and zero or more JSON crosswalk paths. Record and array properties document replacement semantics at JavaScript assignment boundary. Compatibility aliases such as `vim.g.mapleader` point to canonical property entry instead of creating duplicate property rows.

Property coverage follows public `VimConfigApi`, not every internal resolved field. Compile-time fixtures and metadata tests compare public paths/value shapes with declaration-only types; declarations remain authored source and are not regenerated here.

Alternatives rejected:

- Reusing JSON leaf paths as JavaScript API paths: incorrect for grouped JavaScript properties and aliases.
- Duplicating full JSON behavior in `docs/config.md`: conflicts with `docs/settings.md` ownership.
- Parsing rendered Markdown to infer type compatibility: catches formatting, not source contract drift.

### 3. Generate action rows from public finite action metadata

**Target seams:** `src/config-metadata.ts`, `src/keymap-descriptors.ts`, `src/mapping-scopes.ts`, `src/prompt-transform-actions.ts`, trusted-config action/prompt API, and `src/vim-config.d.ts`.

Exactly one row is emitted per public opaque action descriptor. Each row includes canonical action/factory path, supported mapping scopes, arguments, and compatibility aliases. Scope lists come from canonical mapping-scope logic; prompt-transform argument details come from `PROMPT_TRANSFORM_ACTIONS`; `vim.prompt.*` and EasyMotion compatibility forms come from canonical alias metadata. Non-bindable diagnostic metadata remains excluded because it is not public action factory surface.

Alternatives rejected:

- Use default keybindings to infer scopes: defaults do not encode all valid mapping contexts.
- Include diagnostic IDs as public actions: would imply unsupported keybinding API.
- Document aliases as separate actions: violates exactly-once requirement.

### 4. Use explicit anchors and marker-delimited committed blocks

**Target seams:** new `docs/config.md`, generator under `scripts/`.

Generator owns only content between explicit property/action marker comments. Every row receives deterministic explicit HTML anchor derived from canonical kind and ID, avoiding dependence on GitHub heading-slug changes. Entries sort by canonical API path/action ID, and structured values use stable serialization. Generated Markdown links and aliases target explicit anchors.

Alternatives rejected:

- Replace whole guide: issue #43 needs authored sections around generated content.
- Implicit heading anchors: punctuation/case changes can silently alter URLs.
- Build-only output: GitHub readers would not see references.

### 5. One generator supports write and check workflows

**Target seams:** `scripts/generate-config-reference.ts`, `package.json`, focused tests.

One deterministic generator renders both blocks. Normal mode updates marker regions; check mode compares rendered output with committed file and exits non-zero with actionable missing/duplicate/drift details. Validation also rejects duplicate IDs/anchors, missing required fields, unsupported crosswalk targets, unresolved local anchors, and metadata/public-declaration coverage mismatch. Repository script names should follow existing Bun conventions and avoid new dependencies.

Alternatives rejected:

- Snapshot-only test: poor regeneration workflow and opaque failures.
- Separate generate/check implementations: duplicated rendering logic can disagree.
- Git-diff-only check: unrelated working-tree changes make result noisy; direct content comparison is precise.

## Risks / Trade-offs

- **[Docs-only annotations drift from runtime validators or declarations]**: Keep names/defaults/scopes source-derived and add focused declaration compatibility fixtures for manually formatted type/assignment facts.
- **[Canonical metadata enters runtime bundle unnecessarily]**: Keep rendering and docs-only strings in build/test paths; runtime modules consume only existing minimal metadata owners.
- **[Stable anchors change during refactor]**: Derive anchors from canonical public IDs, test uniqueness/resolution, and treat renames as compatibility changes.
- **[Generator rewrites authored guide content]**: Restrict edits to unique marker pairs and fail on missing/duplicate markers.
- **[Issue #43 changes guide structure]**: Marker-delimited blocks permit authored sections to move without changing generated content.
- **[Generated table becomes too wide]**: Use one entry subsection per anchor with compact labeled fields rather than a wide Markdown table if readability requires it.

## Migration Plan

1. Strengthen canonical public property/action metadata and add focused completeness/equivalence tests without changing runtime behavior.
2. Add deterministic renderer plus write/check command.
3. Add `docs/config.md` shell with property and action markers, then generate committed blocks.
4. Add anchor, duplicate/missing metadata, declaration compatibility, and stale-output validation.
5. Run focused tests, regeneration check, full project validation, and strict OpenSpec validation.

Rollback removes generator, generated guide shell, and documentation-only metadata fields/tests. Any source-backed catalog correction needed for completeness can remain independently because it preserves behavior.

## Open Questions

None. Exact marker text and package-script names may follow repository conventions while preserving one renderer, write/check modes, and `docs/config.md` output.
