## 1. Release Foundations

- [ ] 1.1 Implement [#33](https://github.com/pekochan069/pi-vimmode/issues/33): capture reproducible 0.9.0 production-path benchmark baseline, committed pre-change evidence, profiling instructions, and unpublished generated corpora. **Blocked by:** none.
- [ ] 1.2 Implement [#34](https://github.com/pekochan069/pi-vimmode/issues/34): bump package to 0.9.0 without publishing and add built-`dist`/tarball inventory plus temporary-consumer smoke foundation outside repository cwd. **Blocked by:** none.
- [x] 1.3 Implement [#35](https://github.com/pekochan069/pi-vimmode/issues/35): establish canonical finite option/action metadata and normal, visual, insert, and operator-pending mapping scopes with existing behavior equivalence tests. **Blocked by:** none.

## 2. Trusted Configuration Core

- [ ] 2.1 Implement [#36](https://github.com/pekochan069/pi-vimmode/issues/36): stage trusted JavaScript config as closed source-ordered transaction with frozen reads, field-local warnings, fatal results, exact late-write failure, and legacy API parity. **Blocked by:** #35.
- [x] 2.2 Implement [#37](https://github.com/pekochan069/pi-vimmode/issues/37): compile defaults, global JSON, JavaScript operations, and project JSON into one immutable scoped plan with final leader and project authority. **Blocked by:** #35 and #36.

## 3. Public Config Behavior and Reload

- [ ] 3.1 Implement [#38](https://github.com/pekochan069/pi-vimmode/issues/38): expose every finite `piVimMode` option through validated domain-grouped trusted JavaScript properties and prove source-order/replacement/fallback behavior. **Blocked by:** #37.
- [ ] 3.2 Implement [#39](https://github.com/pekochan069/pi-vimmode/issues/39): add opaque action descriptors and finite mode-scoped mappings with unmapping, deterministic conflicts, bounded replay, insert/operator restrictions, protected override, compatibility aliases, and project precedence. **Blocked by:** #37; may run parallel with #38.
- [ ] 3.3 Implement [#40](https://github.com/pekochan069/pi-vimmode/issues/40): reconfigure tracked active editors atomically on generation-guarded reload, preserving durable state and clearing specified transient grammar through lifecycle and real-editor tests. **Blocked by:** #38 and #39.

## 4. Public Types and Canonical Documentation

- [ ] 4.1 Implement [#41](https://github.com/pekochan069/pi-vimmode/issues/41): publish declaration-only `pi-vimmode/config` types with checked basic example and built-package Bundler/NodeNext consumers, without runtime helper API. **Blocked by:** #34, #38, and #39.
- [ ] 4.2 Implement [#42](https://github.com/pekochan069/pi-vimmode/issues/42): generate committed complete property/action references from canonical metadata with stable anchors and clean-tree drift checks. **Blocked by:** #35 and #41.
- [ ] 4.3 Implement [#43](https://github.com/pekochan069/pi-vimmode/issues/43): ship complete trusted-config guide, checked basic/keymap/async/imported-preset workflows, negative fixtures, ADR/discovery links, and built-package content gates. **Blocked by:** #40 and #42.

## 5. Packaged Current-Version Changelog

- [ ] 5.1 Implement [#44](https://github.com/pekochan069/pi-vimmode/issues/44): validate first `RELEASE.md` release against package version, package current-release runtime asset, and prove defensive package-relative loading outside repository cwd. **Blocked by:** #34.
- [ ] 5.2 Implement [#45](https://github.com/pekochan069/pi-vimmode/issues/45): add exact manual `:changelog` command and width-safe Markdown rendering through existing read-only popup while preserving all prompt-editing state. **Blocked by:** #44.

## 6. Change Validation

- [ ] 6.1 After #33–#45 are complete, run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, built-package inventory/consumer/changelog smoke checks, generated-reference clean-tree check, `openspec validate ship-pi-vimmode-0-9-0 --strict`, and `openspec validate --specs --strict`; record failures against owning ticket rather than adding release features.

Deferred cursor-setter migration, final render optimization, and release-candidate verification are intentionally excluded until upstream Pi publishes the required normalized logical cursor setter.
