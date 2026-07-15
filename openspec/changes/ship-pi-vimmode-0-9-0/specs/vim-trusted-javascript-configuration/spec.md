## ADDED Requirements

### Requirement: Trusted JavaScript configuration has one explicit global boundary

The extension SHALL load executable configuration only from `~/.pi/agent/pi-vimmode.config.js` as trusted unsandboxed ESM with full Pi process privileges, after global JSON and before project JSON.

#### Scenario: Global config loads in resolved layer order

- **WHEN** the global JavaScript config exports a supported synchronous or asynchronous default function
- **THEN** the function evaluates against built-in defaults plus valid global JSON
- **AND** valid project JSON remains the final configuration layer

#### Scenario: Project executable config is ignored

- **WHEN** a project contains a JavaScript file resembling pi-vimmode config
- **THEN** the extension does not import or execute it
- **AND** project JSON remains the only supported project-local configuration surface

#### Scenario: Trust warning is discoverable

- **WHEN** a user follows the canonical JavaScript config setup documentation
- **THEN** the setup states prominently that the file is unsandboxed trusted code with Pi process privileges

#### Scenario: Root reload follows native helper caching

- **WHEN** `/vimmode reload` re-evaluates the root config after an imported helper module changed
- **THEN** the root module is re-evaluated
- **AND** native ESM process caching may retain the imported helper until Pi restarts

### Requirement: Trusted configuration exposes every finite option through validated domains

The trusted JavaScript API SHALL expose each existing finite `piVimMode` capability through domain-grouped properties covering preset, startup mode, leader, cursor, UI, macros, marks, search, Ex behavior, feedback, prompt structures, prompt transforms, action presets, and operator motions.

#### Scenario: Getter starts from defaults and global JSON

- **WHEN** a config function reads a supported property before writing it
- **THEN** the value reflects built-in defaults with valid global JSON applied
- **AND** it does not include project JSON

#### Scenario: Valid writes compose in source order

- **WHEN** a config function assigns a preset and then assigns one supported leaf
- **THEN** the preset applies at its source position
- **AND** the later leaf overrides only its supported value

#### Scenario: Later preset may replace earlier leaf

- **WHEN** a config function assigns a leaf and later assigns a preset that defines the same capability
- **THEN** the later preset value becomes staged value for that capability

#### Scenario: Arrays and records replace on assignment

- **WHEN** a config function assigns a valid array or record property
- **THEN** the assigned value replaces the prior staged value rather than merging through nested mutation

#### Scenario: Reads cannot bypass validation

- **WHEN** a config function reads an array, record, or nested domain value
- **THEN** it receives a frozen snapshot
- **AND** mutating that snapshot cannot alter staged or active configuration

### Requirement: Invalid JavaScript option writes remain field local

The trusted configuration session SHALL validate each known leaf independently and SHALL retain prior staged values plus valid siblings when one write is invalid or unknown.

#### Scenario: Invalid leaf preserves prior value

- **WHEN** a config function assigns an unsupported value to one known leaf
- **THEN** the session records a non-fatal warning
- **AND** the prior staged value for that leaf remains effective

#### Scenario: Unknown leaf does not discard siblings

- **WHEN** a config function attempts an unknown property write between two valid writes
- **THEN** the unknown write records a warning and has no configuration effect
- **AND** both valid writes remain staged

#### Scenario: Invalid nested value does not partially merge

- **WHEN** a config function assigns an invalid array or record value
- **THEN** no portion of that assignment changes staged state
- **AND** the previous complete value remains effective

### Requirement: JavaScript evaluation is a closed transaction

Each config evaluation SHALL record source-ordered operations in an isolated session, SHALL close that session when the default export settles, and SHALL distinguish fatal evaluation failure from field-local warnings.

#### Scenario: Successful async export commits staged operations

- **WHEN** an asynchronous default export completes successfully after valid writes
- **THEN** the loader returns its ordered operations and warnings for final compilation
- **AND** no active editor state was mutated during evaluation

#### Scenario: Syntax or import failure is fatal

- **WHEN** the root config has a syntax error or an import fails
- **THEN** the loader returns a fatal transaction result
- **AND** no JavaScript operation from that evaluation is eligible for commit

#### Scenario: Uncaught export failure is fatal

- **WHEN** a synchronous or asynchronous default export throws or rejects
- **THEN** the loader returns a fatal transaction result
- **AND** no partial staged operation is eligible for commit

#### Scenario: Session closes after export settles

- **WHEN** a config function retains its API reference and writes after the export has settled
- **THEN** the write throws exactly `config session closed`
- **AND** staged and active configuration remain unchanged

### Requirement: Configuration layers compile before commit

The extension SHALL compile defaults, global JSON, successful global JavaScript operations, and project JSON into one immutable plan before updating lifecycle or editor state.

#### Scenario: Successful layers resolve in order

- **WHEN** all layers contain valid overlapping values
- **THEN** resolution order is defaults, global JSON, global JavaScript, then project JSON
- **AND** the committed plan contains the final project-authoritative values

#### Scenario: Final leader resolves after all layers

- **WHEN** inherited JavaScript mappings use `<leader>` and project JSON changes the leader
- **THEN** retained mappings expand with the final project leader before conflict compilation

#### Scenario: Fresh startup survives fatal JavaScript config

- **WHEN** JavaScript evaluation fails fatally during fresh startup
- **THEN** defaults, valid global JSON, and valid project JSON still compile into usable plan
- **AND** diagnostics report JavaScript failure

#### Scenario: Compile failure has no partial effects

- **WHEN** staged operations cannot compile into valid finite plan
- **THEN** no active plan or editor is partially updated
- **AND** diagnostics identify rejected operations or fatal result according to failure class

### Requirement: Public trusted-config types are declaration only

The package SHALL export a declaration-only `pi-vimmode/config` subpath containing `VimConfig` and `VimConfigApi` without runtime config helper surface.

#### Scenario: Root config imports VimConfig through JSDoc

- **WHEN** a JavaScript config annotates its default export with `VimConfig`
- **THEN** supported synchronous and asynchronous exports typecheck against complete public API

#### Scenario: Helper module imports VimConfigApi

- **WHEN** an imported preset/helper annotates its session parameter with `VimConfigApi`
- **THEN** supported option and keymap operations typecheck without importing runtime helper

#### Scenario: Built package resolves declarations

- **WHEN** temporary consumers resolve `pi-vimmode/config` from built package using TypeScript Bundler and NodeNext modes
- **THEN** both consumers typecheck successfully
- **AND** no runtime JavaScript module is required for config subpath

#### Scenario: Invalid public API shapes fail typechecking

- **WHEN** negative fixtures use unsupported leaves, values, modes, action arguments, or mapping options
- **THEN** typechecking fails at expected invalid expressions
- **AND** valid sibling expressions remain accepted

### Requirement: Existing trusted-config calls remain compatible

Version 0.9.0 SHALL preserve existing valid `vim.g.mapleader`, `vim.prompt.*`, and three-argument `vim.keymap.set` behavior and SHALL keep existing JSON settings behavior unchanged.

#### Scenario: Existing JavaScript config loads unchanged

- **WHEN** a valid pre-0.9.0 config uses mapleader, prompt action factories, and three-argument keymap calls
- **THEN** it loads without requiring migration
- **AND** its previously supported behavior remains effective

#### Scenario: Existing JSON remains authoritative

- **WHEN** users configure only supported global and project JSON settings
- **THEN** 0.9.0 resolves those settings with existing field-local validation and precedence

#### Scenario: Future breaking change is versioned

- **WHEN** a future release removes or changes a supported trusted-config API
- **THEN** deprecation is warned for at least one minor release when feasible
- **AND** an incompatible trusted-config contract requires a major release
