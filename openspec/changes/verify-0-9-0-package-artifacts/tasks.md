## 1. Package Verification Foundation

- [x] 1.1 Add focused tests for required inventory, version mismatch, forbidden benchmark paths, outside-repository source masking, smoke failure reporting, and temporary cleanup.
- [x] 1.2 Implement one Bun-based helper that creates and cleans a temporary consumer outside repository cwd, places only built package artifact there, and runs extensible assertions without network dependency.
- [x] 1.3 Implement baseline built-package inventory and entrypoint smoke assertions with concise required/forbidden path diagnostics.
- [x] 1.4 Expose one repeatable package verification script that builds publishable output, runs temporary-consumer checks, and exits unsuccessfully on package drift.

## 2. Version and Package Contract

- [x] 2.1 Bump root package and generated lockfile metadata to 0.9.0 without changing Pi peer ranges, adding publish automation, or marking package private.
- [x] 2.2 Ensure generated `dist/package.json` inherits version 0.9.0 and retains baseline entrypoint, manifest, license, README, and feature/settings documentation inventory.
- [x] 2.3 Verify packaged inventory excludes benchmark directories, corpora, profiles, and results while keeping later type/docs/example/release-asset assertions easy to add.
- [x] 2.4 Confirm `RELEASE.md` authored content has no unintended diff and no package publish, tag, or GitHub release operation occurred.

## 3. Validation and Handoff

- [x] 3.1 Run package verification from clean built output and confirm temporary consumer imports built entrypoint without repository-cwd fallback.
- [x] 3.2 Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `bun run build`.
- [x] 3.3 Run `openspec validate verify-0-9-0-package-artifacts --strict` and `openspec validate --specs --strict`.
- [x] 3.4 After all checks pass, mark issue #34 task 1.2 complete in `openspec/changes/ship-pi-vimmode-0-9-0/tasks.md` without changing unrelated parent tasks.
