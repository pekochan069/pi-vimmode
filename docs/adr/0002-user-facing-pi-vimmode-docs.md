# User-facing pi-vimmode documentation

pi-vimmode keeps detailed behavior in `docs/features.md`, complete JSON settings reference in `docs/settings.md`, and executable trusted JavaScript setup/API/safety workflows in `docs/config.md`. `README.md` remains quickstart and documentation index. `docs/adr/` remains for compact decisions like this one. This split avoids duplicate authority while keeping generated references and copyable workflows discoverable.

Future updates must verify claims against runtime source, canonical metadata in `src/config-metadata.ts`, public declarations in `src/vim-config.d.ts`, durable requirements in `openspec/specs/`, and focused tests under `test/`. `src/config.ts` and `src/types.ts` own JSON settings behavior; `src/config-metadata.ts` generates finite property/action references; `src/vim-config.d.ts` owns public config types; `src/runtime-help.ts` owns compact runtime discovery. Prefer current source/spec/test behavior over older README or archived plan prose.

## Resolved follow-up decisions

### From 2026-05-29 documentation review

- README is the quickstart and index, not a synced full reference. Keep detailed feature behavior in `docs/features.md` and detailed settings/defaults/troubleshooting in `docs/settings.md`.
