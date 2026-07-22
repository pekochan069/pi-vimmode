## Why

Later 0.9.0 work must verify types, documentation, examples, and release assets from the package users receive rather than from repository files. Current release checks only mention manual package inspection, so source-tree files can mask missing built artifacts and each later ticket would need to recreate temporary-consumer setup.

## What Changes

- Move package metadata to version 0.9.0 without publishing the package.
- Add one reusable built-package verification command that inspects the built `dist` package or its tarball from outside the repository working directory.
- Establish temporary-consumer smoke setup that later config-type, documentation, example, and changelog checks can extend.
- Assert baseline package inventory and keep benchmark assets excluded from package contents.
- Preserve existing release-note content except for version-validation changes required by the 0.9.0 package metadata.
- Keep existing test, typecheck, lint, format, and build gates green.

### Non-goals

- Publishing or tagging 0.9.0.
- Adding config declarations, config examples, generated documentation, or changelog runtime assets owned by later tickets.
- Adding benchmark implementation or benchmark assets.
- Changing runtime editor behavior or Pi peer dependencies.

## Capabilities

### New Capabilities

- `package-artifact-verification`: Version staging, built-package inventory validation, outside-repository temporary-consumer smoke checks, and package exclusion guarantees.

### Modified Capabilities

None.

## Impact

- Affected seams: `package.json`, generated `dist/package.json`, build/package scripts, package verification tests or scripts, and release validation documentation where command discovery is needed.
- Tests: reusable verification must run against built output from a temporary directory outside repository cwd and fail on missing required files or included benchmark assets.
- Docs: existing release-note prose remains unchanged unless strict version validation requires an intentional update; README remains concise.
- Dependencies: no new runtime dependencies and no Pi peer dependency changes.
- Compatibility: no runtime API or behavior changes. Package version becomes 0.9.0, but this change performs no publish, tag, or release operation.
