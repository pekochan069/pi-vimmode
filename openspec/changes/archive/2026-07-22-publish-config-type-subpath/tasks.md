## 1. Public Config Types

- [x] 1.1 Add one self-contained public declaration source exporting `VimConfig`, `VimConfigApi`, opaque action descriptors, finite action/prompt factories, supported mode aliases, keymap right-hand sides/options, and every validated option domain.
- [x] 1.2 Add focused compile-time assertions covering synchronous and asynchronous `VimConfig` exports, `VimConfigApi` helper parameters, every option domain, and every finite action family without importing internal source paths.

## 2. Checked Basic Example

- [x] 2.1 Add one basic JavaScript config example annotated with `import("pi-vimmode/config").VimConfig` and only supported root assignments.
- [x] 2.2 Load exact committed example through `loadVimJsConfig` and assert successful operations with no warnings.
- [x] 2.3 Typecheck same unchanged example against package declaration without generated wrapper or copied source.

## 3. Declaration-Only Package Export

- [x] 3.1 Update Rolldown package-file hook to copy public declaration as `dist/config.d.ts`, include it in generated package inventory, and add type-only `./config` export while preserving root runtime export.
- [x] 3.2 Extend package inventory tests to require declaration and matching manifest entry and reject missing/inconsistent config type export.
- [x] 3.3 Assert built package contains no config runtime file and runtime import of `pi-vimmode/config` is not exposed.

## 4. Built-Package Type Consumers

- [x] 4.1 Extend existing outside-repository temporary consumer seam to expose copied artifact as `node_modules/pi-vimmode` without network installation and preserve cleanup/failure reporting.
- [x] 4.2 Add Bundler-mode temporary consumer importing `VimConfig` and `VimConfigApi` by package subpath and check sync/async roots, helper parameters, and unchanged basic example.
- [x] 4.3 Add NodeNext-mode temporary consumer with same built-package checks and no runtime config dependency.

## 5. Validation

- [x] 5.1 Run focused config-example and package-verification tests.
- [x] 5.2 Run `bun run build` and `bun run verify-package` against generated `dist`.
- [x] 5.3 Run `bun test`, `bun run check-types`, `bun run lint`, and `bun run format:check`.
- [x] 5.4 Run `openspec validate publish-config-type-subpath --strict` and `openspec validate --specs --strict`.
