## Context

Issue #41 is the public-type slice of the 0.9.0 trusted configuration work. Runtime implementation already exposes validated domain properties, opaque finite action factories, compatibility prompt factories, and scoped `keymap.set`; however, that dynamic API has no package-resolvable public type. Current Rolldown build emits only `dist/index.js`, writes a reduced package manifest, and copies baseline docs. Existing package verification already provides an outside-repository temporary-consumer seam for this extension.

This change crosses public types, examples, build output, package exports, and verification. It must prove installed-package behavior without adding runtime config helpers or changing config evaluation. Later issues #42 and #43 own generated references, full documentation/example coverage, and negative fixtures.

## Goals / Non-Goals

**Goals:**

- Publish complete `VimConfig` and `VimConfigApi` declarations for current finite trusted config API.
- Support JSDoc and TypeScript consumers, including synchronous and asynchronous default exports and imported helper parameters.
- Keep action descriptors opaque while accurately typing finite factories, arguments, modes, keymap right-hand sides, and mapping options.
- Prove one unchanged basic JavaScript example through real loader and typechecker.
- Prove built-package resolution under TypeScript Bundler and NodeNext modes.
- Keep declaration, export map, and package inventory synchronized by build and verification.

**Non-Goals:**

- Runtime `defineConfig`, config module, action constructor, registry, or descriptor introspection.
- Trusted config runtime, precedence, reload, editor, or JSON behavior changes.
- Complete guide, generated property/action references, full example suite, or negative fixtures.
- Full Vim/Neovim configuration API parity.

## Decisions

### 1. Keep one self-contained public declaration source

Target seams: a dedicated source declaration under `src/`, Rolldown package-file generation, and `dist/config.d.ts`.

Define `VimConfig`, `VimConfigApi`, and supporting public-only types in one self-contained declaration source. Public types mirror current validated option tree and finite action/keymap surface, but do not import internal source paths or expose runtime implementation records. `VimConfig` accepts `(vim: VimConfigApi) => void | Promise<void>`. Opaque descriptor types expose no constructible value or registry data.

Build copies this declaration to `dist/config.d.ts` in the same package-file hook that writes `dist/package.json`. This is smaller and more reliable than adding declaration bundling for the runtime graph, whose internal imports would require shipping unrelated declarations. Hand-writing a second generated runtime module is rejected because config subpath must remain declaration-only. Reusing resolved editor options directly is rejected because runtime config API also contains writable domains, `g`, `keymap.set`, `action`, `prompt`, and source-order preset behavior.

Public declaration completeness will be checked against representative values across every option domain and finite API family. Later metadata generation work may replace mechanical declaration sections, but it must preserve these exported names and behavior.

### 2. Export config subpath through type-only package condition

Target seam: generated `dist/package.json`.

Change generated export map from one string root export to an object that preserves `.` runtime export and adds `./config` with only a `types` target for `./config.d.ts`. Do not add `config.js`, `default`, `import`, or `require` target. Include `config.d.ts` in generated package file inventory in the same build hook.

A runtime stub is rejected because it creates permanent executable API and lets accidental value imports appear supported. `typesVersions` without an export-map entry is rejected because it does not prove modern Bundler and NodeNext subpath behavior.

### 3. Verify package-name resolution from installed layout

Target seams: `scripts/verify-package.ts` and package verification tests.

Extend existing temporary-consumer helper so built artifact can be addressed as `node_modules/pi-vimmode` while preserving current outside-repository checks and cleanup. Consumer projects import `pi-vimmode/config`, not relative `./package` paths. Run existing local TypeScript compiler with no package installation or network access.

Create separate minimal consumer compiler configurations for Bundler and NodeNext because their export-condition rules differ. Each checks `VimConfig`, `VimConfigApi`, sync and async exports, and helper parameter usage against built `dist`. Inventory checks require `config.d.ts`, require manifest packaging/export entry, and reject any runtime config file or runtime-resolvable config export.

Source-tree-only checks are rejected because they can pass while generated package manifest or declaration copying is broken. Adding another temporary-directory framework is rejected because issue #34 already established reusable consumer lifecycle.

### 4. Use one basic JavaScript example as runtime and type evidence

Target seams: repository examples, `loadVimJsConfig`, focused config tests, and package consumer typecheck.

Add one basic global config example with JSDoc `import("pi-vimmode/config").VimConfig`. Use supported assignments representative of root config without introducing helper modules or advanced keymaps owned by #43. Runtime test loads exact file through `loadVimJsConfig` and requires successful result with no warnings. Type test consumes same unchanged file against built package declarations.

Duplicating example content into test fixtures is rejected because copies can drift. Typechecking only a rewritten TypeScript equivalent is rejected because acceptance requires checked JavaScript to remain unchanged.

### 5. Keep runtime and editor behavior untouched

This change adds build/type artifacts and tests only. It does not alter config parsing, `src/config.ts`, `src/types.ts` runtime option resolution, `VimEditor.cloneOptions`, live editor construction, Pi delegation, cursor placement, visual state, registers, marks, dot-repeat, search highlights, Ex messages, or reload behavior. No config propagation test is needed because no setting or active plan changes.

## Risks / Trade-offs

- **[Public declarations drift from dynamic runtime API]**: cover every option domain and action family in focused type assertions now; let #42 derive mechanical reference/type sections from canonical metadata later.
- **[Internal types leak into package declarations]**: keep public declaration self-contained and inspect built `config.d.ts` for source-relative imports.
- **[Type checks accidentally resolve repository source]**: place copied built artifact under temporary `node_modules/pi-vimmode`, run outside repository cwd, and import package subpath by name.
- **[NodeNext and Bundler interpret export conditions differently]**: run both compiler modes against same built package.
- **[Export map accidentally creates runtime API]**: expose only `types` condition and assert no runtime config artifact or successful runtime subpath import.
- **[Example runtime and type checks diverge]**: reference one committed JavaScript file unchanged in both checks.
- **[Unrelated working-tree changes are overwritten]**: limit implementation to issue #41 files and do not normalize existing OpenSpec archive/spec changes.

## Migration Plan

1. Add self-contained public declaration source and focused source-level type assertions.
2. Add basic JSDoc example and real-loader no-warning test.
3. Copy declaration during build and add type-only `./config` export plus package inventory entry atomically.
4. Extend temporary package consumer for installed package-name resolution.
5. Add Bundler and NodeNext consumer checks using built output and unchanged example.
6. Run focused tests, full Bun/type/lint/format/build/package gates, and strict OpenSpec validation.

Rollback is a normal code revert: remove subpath export, declaration, example, and checks together. No runtime state, persisted config, package publish, or data migration is involved.

## Open Questions

None. Exact source filename and test-file placement may follow repository conventions, provided built path and public exports remain `config.d.ts`, `VimConfig`, and `VimConfigApi`.
