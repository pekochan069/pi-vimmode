# package-artifact-verification Specification

## Purpose

TBD - created by archiving change verify-0-9-0-package-artifacts. Update Purpose after archive.

## Requirements

### Requirement: Package metadata stages version 0.9.0 without release

The project SHALL identify source and generated built-package metadata as version 0.9.0 while keeping publication, tagging, and release creation outside this change.

#### Scenario: Build propagates staged version

- **WHEN** maintainer builds package from version 0.9.0 source metadata
- **THEN** generated publishable package metadata also reports version 0.9.0

#### Scenario: Foundation work remains unpublished

- **WHEN** package verification completes
- **THEN** workflow has not published package, created release tag, or created GitHub release
- **AND** no package verification command invokes publication or release automation

### Requirement: Existing release-note content is preserved

Version staging and package verification SHALL preserve authored `RELEASE.md` content except for intentional changes required by 0.9.0 version validation.

#### Scenario: Version staging leaves release notes intact

- **WHEN** package metadata moves to 0.9.0 and package verification is added
- **THEN** existing release-note prose and structure remain unchanged unless an intentional version-validation change is required

### Requirement: Built-package inventory is verified outside repository

The project SHALL provide automated verification of publishable built package or tarball contents from a temporary working directory outside repository cwd.

#### Scenario: Baseline package is complete

- **WHEN** maintainer runs package verification after build
- **THEN** verifier finds built runtime entrypoint, package manifest, license, README, and promised feature/settings documentation in consumed package artifact
- **AND** verifier imports or loads built entrypoint from temporary consumer without relying on repository source files

#### Scenario: Required artifact is missing

- **WHEN** publishable built package omits required baseline file
- **THEN** package verification fails with missing artifact path

#### Scenario: Source tree cannot mask package omission

- **WHEN** required file exists in repository but not in consumed built package
- **THEN** outside-repository verification fails

### Requirement: Temporary-consumer smoke setup is reusable

The project SHALL keep one project-owned temporary-consumer setup that later package checks can extend for public config types, documentation, examples, and release assets.

#### Scenario: Later package assertion is added

- **WHEN** later release work needs to resolve package type export or read packaged asset
- **THEN** check can run inside existing built-artifact consumer lifecycle without recreating temporary directory, artifact placement, outside-cwd execution, and cleanup logic

#### Scenario: Consumer verification fails

- **WHEN** smoke assertion fails inside temporary consumer
- **THEN** verifier reports failing assertion or command and exits unsuccessfully
- **AND** temporary resources are cleaned safely

### Requirement: Benchmark assets remain outside package

The project SHALL reject benchmark assets from publishable package inventory.

#### Scenario: Package contains no benchmark assets

- **WHEN** maintainer verifies built package or tarball
- **THEN** no packaged path belongs to benchmark or benchmark-results assets

#### Scenario: Benchmark asset leaks into package

- **WHEN** package inventory contains benchmark directory, corpus, profile, or result path
- **THEN** package verification fails and identifies forbidden packaged path

### Requirement: Package verification joins release quality gates

The project SHALL expose package verification as a repeatable project command and SHALL keep existing tests, typecheck, lint, formatting, and build validation compatible with staged package version.

#### Scenario: Maintainer validates release foundation

- **WHEN** maintainer runs documented project validation commands and package verification
- **THEN** tests, typecheck, lint, format check, build, package inventory, and temporary-consumer smoke all complete successfully

#### Scenario: Package verification detects drift

- **WHEN** generated metadata version, required inventory, forbidden inventory, or temporary-consumer behavior differs from package contract
- **THEN** repeatable package verification command exits unsuccessfully before release
