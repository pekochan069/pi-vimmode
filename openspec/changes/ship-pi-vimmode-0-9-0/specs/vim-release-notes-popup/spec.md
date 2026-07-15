## ADDED Requirements

### Requirement: Current release notes have one authored source

The package SHALL treat the first release in `RELEASE.md` as the sole authored source for current-version in-editor release notes.

#### Scenario: Build extracts current release

- **WHEN** `RELEASE.md` begins with exact top-level heading `# vX.Y.Z`
- **THEN** build extracts content after that heading through before next top-level release heading
- **AND** extraction includes every second-level section in source order

#### Scenario: Outer heading is omitted from popup body

- **WHEN** current release is extracted successfully
- **THEN** runtime body omits outer `# vX.Y.Z` heading
- **AND** retains all current-release section content below it

#### Scenario: Release summary is not duplicated

- **WHEN** package is built
- **THEN** no separately authored or network-generated current-release summary is required

### Requirement: Build validates and packages current release asset

The 0.9.0 build SHALL fail unless current release heading exactly matches package version and extracted current release contains at least one second-level section plus non-empty well-formed content.

#### Scenario: Valid release asset is packaged

- **WHEN** package version and first release heading both equal 0.9.0 and current release content is valid
- **THEN** build copies package-relative runtime asset beside bundled entry
- **AND** package includes authored release source

#### Scenario: Version mismatch fails build

- **WHEN** package version differs from first release heading
- **THEN** build fails with actionable version mismatch

#### Scenario: Missing or malformed release fails build

- **WHEN** release source is missing, empty, unreadable, lacks second-level section, or has malformed current release boundaries
- **THEN** build fails before package is considered valid

#### Scenario: Package smoke uses built artifact

- **WHEN** release asset smoke test runs from outside repository cwd
- **THEN** it loads current release from built package without source-tree fallback

### Requirement: Runtime release loading is package relative and defensive

The extension SHALL read current release notes only from package-relative asset and SHALL never depend on cwd-local files or network access.

#### Scenario: Packaged asset loads current version

- **WHEN** installed package contains valid asset matching package version
- **THEN** runtime returns complete current-release content for popup rendering

#### Scenario: Missing asset produces unavailable content

- **WHEN** packaged asset is missing or unreadable
- **THEN** runtime returns `Changelog unavailable for vX.Y.Z`
- **AND** includes repository release URL
- **AND** does not throw

#### Scenario: Invalid or stale asset is never shown as current

- **WHEN** packaged asset is malformed or version does not match package
- **THEN** runtime returns unavailable content and repository release URL
- **AND** stale release text is not presented as current

### Requirement: Changelog popup renders complete finite Markdown content

The changelog popup SHALL display complete current-release headings, lists, links, prose, blank lines, and fenced code examples in source order using width-safe rendered rows.

#### Scenario: Markdown release content is rendered

- **WHEN** valid current release contains second-level headings, bullets, links, inline formatting, prose, blank lines, and fenced examples
- **THEN** popup preserves their semantic order and distinguishes headings, list rows, prose, and code rows

#### Scenario: Prose wraps to popup width

- **WHEN** prose exceeds available row width
- **THEN** renderer wraps prose into width-safe rows without silently dropping text

#### Scenario: Code indentation is preserved

- **WHEN** fenced code contains indentation
- **THEN** rendered code preserves indentation
- **AND** only an indivisible overlong code row may truncate

#### Scenario: Counters use rendered rows

- **WHEN** wrapping expands source lines into multiple rendered rows
- **THEN** visible range and hidden-row counters refer to rendered rows

### Requirement: Changelog popup reuses read-only overlay behavior

The editor SHALL display changelog in existing 10-row read-only popup titled `pi-vimmode vX.Y.Z changes` with existing scroll, close, and small-terminal behavior.

#### Scenario: User scrolls and closes changelog

- **WHEN** changelog popup is open
- **THEN** `j`, `k`, down arrow, and up arrow scroll within rendered rows
- **AND** `Esc`, `Ctrl-C`, and `Ctrl-G` close popup

#### Scenario: Small terminal reports unavailable popup non-destructively

- **WHEN** terminal is smaller than 48×12 and user requests changelog
- **THEN** existing popup-unavailable feedback is shown
- **AND** prompt-editing state remains unchanged

#### Scenario: Popup preserves prompt state

- **WHEN** user opens, scrolls, and closes changelog
- **THEN** prompt buffer, cursor, mode, valid visual selection, registers, marks, search state, undo/redo, repeat, macros, and histories remain unchanged except normal successful Ex history semantics

#### Scenario: Popup is manual only

- **WHEN** extension starts or package version changes
- **THEN** changelog does not open automatically
- **AND** no persistent seen-version state is required
