## ADDED Requirements

### Requirement: Public trusted-config types are declaration only

The package SHALL export a declaration-only `pi-vimmode/config` subpath containing `VimConfig` and `VimConfigApi` without runtime config helper surface.

#### Scenario: Root config uses public VimConfig type

- **WHEN** a JavaScript or TypeScript root config annotates its default export with `VimConfig`
- **THEN** supported synchronous and asynchronous functions accepting `VimConfigApi` typecheck
- **AND** complete supported option, action, prompt compatibility, and keymap surfaces are available through the parameter

#### Scenario: Helper uses public VimConfigApi type

- **WHEN** an imported helper or preset annotates its session parameter with `VimConfigApi`
- **THEN** supported root, option-domain, action, prompt compatibility, and keymap operations typecheck without importing a runtime helper

#### Scenario: Config subpath has no runtime module

- **WHEN** a consumer inspects or executes built package
- **THEN** `pi-vimmode/config` exposes declarations only
- **AND** package contains no runtime config stub, `defineConfig`, descriptor constructor, or registry API

### Requirement: Basic JavaScript config is checked unchanged

The repository SHALL provide one basic JavaScript config example using public `VimConfig` JSDoc and SHALL validate exact file through both runtime and type seams without rewriting it.

#### Scenario: Basic example loads through real config loader

- **WHEN** test loads committed basic example through real trusted JavaScript config loader
- **THEN** loader returns successful result without warnings
- **AND** example operations are accepted by current runtime API

#### Scenario: Basic example typechecks without modification

- **WHEN** same committed example is typechecked against built package declarations
- **THEN** it passes without generated wrappers, copied source, or test-only edits

### Requirement: Built package resolves trusted-config declarations

Built package SHALL include config declaration and matching export-map entry atomically and SHALL resolve `pi-vimmode/config` under supported TypeScript module-resolution modes.

#### Scenario: Bundler consumer resolves built declaration

- **WHEN** temporary consumer imports `VimConfig` and `VimConfigApi` from built `pi-vimmode/config` using TypeScript Bundler resolution
- **THEN** consumer typechecks successfully outside repository cwd
- **AND** resolution uses copied built package rather than repository source

#### Scenario: NodeNext consumer resolves built declaration

- **WHEN** temporary consumer imports `VimConfig` and `VimConfigApi` from built `pi-vimmode/config` using TypeScript NodeNext resolution
- **THEN** consumer typechecks successfully outside repository cwd
- **AND** no runtime JavaScript module is required for config subpath

#### Scenario: Declaration or export map is incomplete

- **WHEN** built declaration, package inventory entry, or type-only subpath export is missing or inconsistent
- **THEN** package verification fails before publication
