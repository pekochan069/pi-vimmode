## Context

The repository builds a self-contained publishable package under `dist/`. `rolldown.config.ts` writes a reduced `dist/package.json` and copies baseline docs, while root `package.json` describes source-package contents. Current release guidance runs `bun pm pack --dry-run`, but no automated check proves built-package inventory or execution from outside repository cwd. Later 0.9.0 config-type and changelog work depends on that seam.

Issue #34 is release-foundation task 1.2 in `ship-pi-vimmode-0-9-0`. This change refines only that ticket. It must not pull in later config declarations, generated docs/examples, release assets, changelog UI, benchmark assets, or publishing.

## Goals / Non-Goals

**Goals:**

- Stage source and built package metadata at version 0.9.0 without publishing.
- Provide one automated command that builds and verifies package users receive.
- Run package inventory and smoke behavior from a temporary cwd outside repository.
- Make temporary-consumer setup reusable by later type-resolution, docs/example, and changelog checks.
- Reject benchmark paths in package inventory.
- Preserve current runtime behavior, peer dependency ranges, and authored release notes.

**Non-Goals:**

- Publishing, tagging, or creating a GitHub release.
- Implementing benchmark harness, config types/docs/examples, release-note asset processing, or `:changelog`.
- Changing package runtime APIs, Pi integration, or editor state.
- General package-manager abstraction or support for package managers other than project-standard Bun workflow.

## Decisions

### 1. Verify publishable built output, not repository source layout

Target seams: `rolldown.config.ts`, `dist/package.json`, package verification script, and package scripts.

Verification will run after `bun run build`, package the generated `dist` directory or otherwise consume it as the package root, then inspect that artifact from a temporary directory outside repository cwd. Required baseline inventory includes built entrypoint, package manifest, license, README, and currently promised feature/settings docs. Entry smoke imports the built extension entrypoint from the temporary consumer.

Rejected alternatives:

- Inspect root `package.json#files` only: it does not prove generated `dist` contents.
- Assert files directly from repository cwd: source files can hide missing build copies.
- Keep manual `bun pm pack --dry-run` inspection only: not reusable and cannot gate later package additions.

### 2. Keep one reusable temporary-consumer seam

Target seams: a small script/helper under project tooling plus `package.json#scripts`.

One verification command owns temporary directory creation, artifact placement or extraction, outside-cwd command execution, and cleanup. Baseline inventory/import assertions use that seam. Later tickets extend assertions within the same consumer lifecycle rather than add separate ad hoc temp setup.

The helper remains project tooling, not exported package API. It uses Bun and platform/standard-library filesystem and subprocess APIs already available; no dependency is added.

Rejected alternatives:

- Add a generic test framework or package-testing dependency: existing Bun and filesystem APIs cover the finite need.
- Create one script per later ticket: duplicates setup and risks inconsistent package roots.
- Export consumer helpers from runtime package: release tooling is not user API.

### 3. Treat package inventory as explicit allow/deny contract

Target seams: verifier constants/assertions and generated `dist/package.json` file list.

Baseline required files are asserted explicitly. Every artifact path is also checked against forbidden benchmark directory/file patterns, so future benchmark work cannot leak into published contents. Later tickets add required type, docs/example, and release-asset paths to the same inventory contract.

Rejected alternatives:

- Snapshot full tar listing byte-for-byte: fragile to harmless package-manager metadata/order changes.
- Rely only on `package.json#files`: generated files or packaging behavior can still drift.
- Check only one known benchmark directory: future naming variants could bypass intent.

### 4. Version source once and assert propagation

Target seams: root `package.json`, generated `dist/package.json`, lockfile package metadata if Bun records it, and verifier.

Root version becomes 0.9.0. Build-generated package metadata must carry the same version, and verification fails on mismatch. No publish command, lifecycle publish script, tag, or release operation is added. Existing `RELEASE.md` content is preserved; this ticket may only add version-validation handling if verification requires it.

Rejected alternatives:

- Patch only generated `dist/package.json`: build regeneration would overwrite it.
- Mark package `private`: package is intended for later release and `private` would change release mechanics beyond “do not publish now.”
- Delay version bump: later release-asset validation needs real target version.

## Risks / Trade-offs

- **Package smoke accidentally resolves repository files**: run with temporary cwd and consume only copied/packed built artifact; avoid repository-relative import paths.
- **Temporary consumer cleanup hides useful failures**: preserve concise failing path/command diagnostics while cleaning in `finally`.
- **Package-manager output varies**: assert normalized paths and required/forbidden sets rather than full textual output.
- **Future tickets duplicate setup anyway**: expose one internal callback/helper or single extension point sufficient for extra consumer assertions, without building a framework.
- **Version bump changes authored release text unintentionally**: review `RELEASE.md` diff and reject unrelated content edits.
- **Verification becomes network-dependent through peers**: prefer local artifact placement/extraction and import resolution using existing installed peers; if installation is used, keep it local and deterministic.

## Migration Plan

1. Add reusable package verification and temporary-consumer smoke against current build shape.
2. Bump root package version to 0.9.0 and update lockfile metadata only where generated by Bun.
3. Assert generated package version, baseline inventory, outside-cwd import, and benchmark exclusion.
4. Run package verifier plus existing test, typecheck, lint, format, and build gates.
5. Confirm `RELEASE.md` has no unintended content diff and no publish/tag occurred.
6. Mark issue #34 task complete in parent change only after implementation and validation pass.

Rollback is a normal code revert: restore version metadata and remove verifier/script entry. No published artifact, tag, migration, or runtime state requires rollback.

## Open Questions

None. Exact helper filename and whether artifact placement uses packed tarball or copied `dist` may follow shortest reliable Bun implementation, provided verification consumes only built output from outside repository cwd.
