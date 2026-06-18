## ADDED Requirements

### Requirement: Documentation drift metadata stays out of runtime help paths

The project SHALL keep documentation drift guard metadata for runtime help entries, diagnostic actions, read-only popup command examples, and action keybinding recipe/preset anchors in test/dev-owned sources that are not imported by runtime modules, while preserving public runtime help and discovery behavior.

#### Scenario: Runtime registries expose only runtime-needed fields

- **WHEN** runtime help entries, diagnostic action entries, read-only popup builders, and action keybinding recipes are imported by the extension runtime
- **THEN** those runtime objects omit docs/test-only fields such as OpenSpec spec paths, test file paths, parser-only examples, and documentation anchor fields unless a field is required for displayed user-facing output

#### Scenario: Drift guard preserves coverage through dev metadata

- **WHEN** `bun test` runs the documentation drift guard
- **THEN** every runtime help entry, diagnostic action, read-only popup command, and action keybinding recipe/preset has matching test/dev metadata that validates feature-doc anchors, spec files, parser examples, excluded bindability boundaries, and recipe/preset documentation

#### Scenario: Public runtime discovery behavior is unchanged

- **WHEN** users execute supported read-only discovery commands such as `:help`, `:features`, `:keybindings`, `:actions`, `:keymap`, `:mapcheck`, `:vimdoctor`, `:messages`, or `:vimmode inspect`
- **THEN** the commands keep their existing bounded prompt-local popup or message behavior, finite topic coverage, non-goals, and read-only prompt-editing state boundaries

#### Scenario: Build artifact excludes docs/test-only metadata

- **WHEN** `bun run build` produces `dist/index.js`
- **THEN** the bundled runtime artifact does not include metadata strings that exist only for drift validation, such as OpenSpec spec paths, test file paths, `specAnchor`, `testAnchors`, or parser examples moved to test/dev metadata
