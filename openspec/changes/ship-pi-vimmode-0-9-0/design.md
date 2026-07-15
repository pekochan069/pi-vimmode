## Context

pi-vimmode already has finite JSON settings, a small trusted JavaScript keymap builder, semantic action metadata, layered leader resolution, a stable lifecycle editor factory, finite Ex parsing, and an editor-owned read-only popup. Those seams are sufficient for 0.9.0, but current JavaScript evaluation mutates a partial settings result directly, mapping scope is not represented as a complete grammar concept, successful reload updates future editor construction rather than every active editor, and package build does not carry a validated release asset or public config declarations.

The work spans configuration, keymap compilation, lifecycle state, public types, documentation generation, packaging, and popup rendering. It must preserve existing JSON behavior and valid JavaScript calls while keeping Pi application shortcuts and ordinary insert-mode typing under Pi ownership. Release work is split across GitHub issues #33–#45; cursor-setter migration and final performance/release gates remain deferred until Pi provides the required public cursor API.

Relevant durable decisions remain in force: Ex input uses its dedicated command-line row; detailed docs live outside README; settings and finite metadata own customization truth; leader placeholders resolve with one final effective leader; `VimEditor` remains the Pi adapter; and lifecycle keeps one stable editor factory.

## Goals / Non-Goals

**Goals:**

- Represent every finite setting and bindable action once in typed canonical metadata.
- Evaluate trusted global JavaScript into a closed, source-ordered transaction.
- Compile every configuration layer into one immutable scoped plan before commit.
- Support finite normal, visual, insert, and operator-pending mappings with deterministic conflicts and compatibility aliases.
- Apply valid reloads to active editors atomically while preserving durable prompt state.
- Publish declaration-only config types, generated references, checked examples, and package-level drift checks.
- Package validated current-version release notes and expose them through manual `:changelog` in the existing read-only popup.
- Establish reproducible performance and package verification foundations for later release gates.

**Non-Goals:**

- Full Vim/Neovim mapping semantics, recursive mappings, timeout resolution, arbitrary callbacks, broad insert remapping, Vimscript, or Lua.
- Executable project config, sandboxing, file watching, or transitive helper hot reload.
- Replacing JSON settings or changing project-over-global precedence.
- Replacing the stable editor factory or creating a second action registry.
- Automatic changelog notices, historical/network release browsing, or a general Markdown viewer.
- Cursor restoration migration, final layout optimization, or release-candidate publishing before upstream Pi cursor support exists.

## Decisions

### 1. Canonical finite metadata feeds behavior, types, and generated references

Settings metadata will describe each public leaf's domain path, accepted value shape, built-in default, replacement semantics, and JSON crosswalk. Action metadata will describe opaque descriptor factory, accepted arguments, supported scopes, compatibility aliases, and finite runtime action identity. Existing settings, prompt-transform action, diagnostics, and protected-shortcut sources will be consolidated or adapted rather than copied into a second registry.

Target seams are configuration/types, semantic command metadata, customization diagnostics, and generated docs. Existing behavior-equivalence tests must pass before duplicate tables are removed.

Alternatives rejected:

- Hand-maintained docs/types tables: they drift across the complete surface.
- Runtime introspection registry exposed to config: it creates unsupported API and arbitrary execution pressure.
- One generic untyped property bag: it weakens field-local validation and editor assistance.

### 2. JavaScript evaluation produces an operation log, not active options

Each trusted config load will create a session seeded from built-in defaults plus valid global JSON. The session exposes validated domain properties, preset assignment, `vim.g.mapleader`, finite action factories, map, and unmap. It records source-ordered operations and returns frozen snapshots from reads. Arrays and records replace on assignment.

Invalid or unknown leaf writes remain local warnings and preserve prior staged values plus valid siblings. Syntax, import, and uncaught export failures return a distinct fatal transaction result. Session closure happens in `finally`; later writes through retained references throw `config session closed`.

Root modules are re-evaluated on reload. Imported helpers follow native ESM process caching, which is documented as requiring Pi restart after helper edits. Executable config remains global-only and unsandboxed with full Pi process privileges.

Alternatives rejected:

- Mutating a partial options object during evaluation: fatal async failure can leave ambiguous partial state.
- Deep mutable getters: nested mutation bypasses validation and source ordering.
- Sandboxing: outside 0.9.0 scope and incompatible with normal trusted ESM imports.
- Cache-busting transitive imports: unreliable and broader than root reload promise.

### 3. One compiler resolves all layers into immutable scoped lookup tables

Compilation order is defaults, global JSON, global JavaScript operations, then project JSON. Global and project JSON are parsed once. JavaScript getters do not observe project JSON. The compiler retains leader expressions until final project-layer leader resolution, then expands accepted mapping keys and preflights scope, exact, prefix, replay, insert, operator-pending, and protected-shortcut rules.

Output is an immutable plan containing resolved options, diagnostics, and per-scope exact/prefix lookup tables. Existing JSON keymaps adapt into this compiler. Project semantic action settings replace JavaScript mappings for that action across canonical scopes; unrelated JavaScript mappings survive; final project exact-key conflicts win.

Alternatives rejected:

- Independent JSON and JavaScript compilers: they duplicate collision and precedence logic.
- Expanding leader at declaration time: contradicts final project authority and ADR 0004.
- Incremental active-state mutation: makes fatal rollback and generation ordering unsafe.

### 4. Mapping scope is separate from stable editor mode

Canonical scopes are normal, visual family, insert, and operator-pending grammar. Short and long supported mode names normalize at API boundary; `x` aliases visual family and `o` aliases operator-pending. Operator-pending is not added as stable editor mode.

Opaque immutable descriptors carry finite action identity internally. Config authors cannot construct, inspect as registry records, mutate, or execute them directly. Same-scope exact mapping uses latest valid operation. `null` removes only selected exact mappings. Later strict-prefix overlap in one scope is rejected because pi-vimmode has no timeout semantics; disjoint scopes may overlap.

String RHS stays bounded and non-recursive outside insert scope. Insert scope accepts only finite insert descriptors on supported keys, preserving ordinary typing and autocomplete. Operator-pending accepts only valid motions/targets. Protected shortcut override is per binding and does not claim terminal delivery guarantees. Descriptions are diagnostic metadata only.

Alternatives rejected:

- Treating operator-pending as editor mode: leaks parser state into durable mode model.
- Vim timeout/recursive behavior: adds ambiguous asynchronous grammar.
- Arbitrary callbacks: bypasses finite validation and Pi shortcut ownership.

### 5. Reload commits compiled plans to tracked editors in place

Lifecycle keeps stable factory identity and tracks active editors. A successful load compiles fully before commit. `VimEditor.reconfigure(plan, diagnostics)` swaps resolved options and lookup tables atomically, reapplies terminal cursor style, and requests render without replacing editor component.

Durable state preserved: prompt buffer, clamped cursor, stable mode, valid visual selection, registers, marks, macro contents, undo/redo, Ex history, and prompt-search history. Transient grammar cleared: pending count, operator, key prefix, character/register/mark/macro targets, active Ex/search input, and macro recording slot.

Each async reload receives a generation. Only newest successful generation may update current plan, diagnostics, status, and active editors. Fatal live reload updates diagnostics only and preserves last-known-good plan. Fresh startup fatal JavaScript failure omits JavaScript layer while defaults, global JSON, and project JSON remain usable.

Alternatives rejected:

- Replacing editor component: risks prompt and undo state loss and violates lifecycle factory identity.
- Mutating active editors before compilation: makes rollback partial.
- Letting completion order decide: stale async config can overwrite newer intent.

### 6. Public config typing is declaration-only

Package exports `pi-vimmode/config` as declarations containing `VimConfig` and `VimConfigApi`. `VimConfig` covers synchronous and asynchronous default exports; `VimConfigApi` types root and imported helper/preset parameters. No runtime stub, `defineConfig`, action constructor, or registry API is shipped.

Built-package consumers validate both Bundler and NodeNext resolution. Checked JavaScript examples are loaded through the real config loader and typechecked unchanged. Negative fixtures remain tests rather than shipped examples.

Alternatives rejected:

- Runtime helper wrapper: unnecessary for JSDoc/TypeScript and creates permanent runtime surface.
- Source-tree-only type tests: can miss export-map and package inventory failures.

### 7. Generated config reference extends documentation source-of-truth policy

A canonical JavaScript config guide will contain minimal trusted setup, generated property/action reference blocks, advanced mapping/export/import workflows, and safety/precedence/reload semantics. `docs/settings.md` remains canonical for JSON. README, settings docs, and runtime help link to the JavaScript guide; README stays an index.

Generated blocks are committed for GitHub readability and regenerated from canonical metadata. Guide, examples, helper, declarations, and export map are checked in built package. ADR 0002 will be amended to name the JavaScript guide as the specialized trusted-config source while preserving feature/settings ownership.

Alternatives rejected:

- Put full API in README: violates existing docs split and creates noise.
- Make generated docs build-only: repository readers would not see complete reference.
- Duplicate JSON reference in JavaScript guide: creates two authorities for JSON.

### 8. `RELEASE.md` is sole authored changelog source and build input

After package version moves to 0.9.0, build extracts content after first exact `# vX.Y.Z` heading through before next top-level release heading. It requires version equality, at least one second-level section, and non-empty well-formed current content. Build copies a package-relative runtime asset beside bundled entry and includes authored release source in package.

Runtime never reads repository cwd or network. It defensively validates asset version/shape. Missing, unreadable, malformed, or mismatched asset produces ordinary popup content stating `Changelog unavailable for vX.Y.Z` plus repository release URL; stale notes are never shown as current.

Alternatives rejected:

- Duplicate generated summary: introduces a second authored source.
- Cwd lookup: works in checkout but fails installed package behavior.
- Network fetch: makes local help nondeterministic and unavailable offline.

### 9. Changelog reuses finite Ex and read-only popup seams

Exact `:changelog` with no unsupported arguments is added to finite Ex parsing. Prefilled visual source range `'<,'>` is accepted and ignored; other ranges are rejected. It opens manually only. Existing popup controls and 48×12 minimum remain. Title is `pi-vimmode vX.Y.Z changes`; outer release heading is omitted.

A small Markdown row renderer handles headings, lists, links, prose, blank lines, and fenced code. Prose wraps to width; code indentation is preserved; only indivisible overlong code rows may truncate. Counters refer to rendered rows in the existing 10-row viewport.

Opening, scrolling, and closing preserve prompt buffer, cursor, visual state, registers, marks, search, undo/redo, repeat, and macros. Popup display does not become repeatable change or pollute runtime message history.

Alternatives rejected:

- Generic Markdown dependency: unnecessary for finite release syntax and adds runtime weight.
- Inline Ex row output: cannot show complete release content legibly.
- New popup subsystem: duplicates existing editor-owned overlay/effect boundary.

### 10. Performance and package checks are foundations, not speculative optimization

A dependency-free harness records reproducible pre-change evidence using production paths and generated ASCII, multi-line, mixed-width, and scaling corpora. Setup remains outside timed regions and operations assert expected outcomes. Benchmarks remain outside package.

A built-`dist`/tarball smoke seam runs from outside repository cwd and supports later declaration, docs/example, and release-asset checks. Version moves to 0.9.0 early, but publishing remains separate.

Cursor migration and final layout optimization are not implemented by this change. They will become a later OpenSpec change/ticket set after upstream Pi publishes the normalized logical cursor setter.

## Risks / Trade-offs

- **[Metadata consolidation changes existing behavior]** → Land behavior-preserving metadata first and require equivalence tests before deleting duplicate tables.
- **[Large finite config surface drifts across runtime, types, and docs]** → Generate declarations/references where practical and require clean regeneration plus built-package consumer tests.
- **[Scoped compiler changes default grammar ownership]** → Adapt existing JSON paths, preserve protected shortcut checks, and assert default command equivalence before enabling new API behavior.
- **[Reload corrupts active prompt state]** → Compile before commit, use one atomic editor reconfigure seam, and test explicit preserved/cleared state lists through real editor/lifecycle scenarios.
- **[Async config races]** → Generation-guard every commit and test out-of-order completion.
- **[Trusted config security is misunderstood]** → Put prominent unsandboxed full-process warning beside minimal setup and keep executable config global-only.
- **[Package checks pass against repository files accidentally]** → Run temporary consumers and changelog smoke outside repository cwd against built artifact.
- **[Markdown rendering grows into a general parser]** → Support only release-document constructs required by source and keep renderer pure and finite.
- **[Existing uncommitted release work is overwritten]** → Preserve authored release content and limit release processing changes to extraction/validation/packaging.
- **[Deferred Pi dependency is mistaken as complete release]** → State explicitly that this change covers #33–#45 only and cannot authorize publish.

## Migration Plan

1. Capture benchmark evidence and add package verification foundation; bump version to 0.9.0 without publishing (#33, #34).
2. Establish canonical config metadata/scopes with behavior parity (#35).
3. Add staged JavaScript transaction and one cross-layer compiler (#36, #37).
4. Add complete option tree and scoped finite action mappings in parallel-compatible slices (#38, #39).
5. Apply generation-guarded active-editor reconfiguration (#40).
6. Ship declaration-only config types, generated references, complete guide, examples, discovery, and package checks (#41–#43).
7. Add release extraction/package validation, then expose Markdown `:changelog` (#44, #45).
8. Keep each issue independently revertible and green. Revert a failing slice rather than adding runtime feature flags.
9. After upstream Pi setter release, create deferred cursor/performance/release-candidate tasks and run complete publish gate.

## Open Questions

- Which exact Pi release first satisfies the required normalized logical cursor setter contract? This remains an external blocker for deferred work and does not block #33–#45.
- No unresolved design choice remains inside current #33–#45 scope; implementation discoveries that contradict these decisions require artifact update before continuing.
