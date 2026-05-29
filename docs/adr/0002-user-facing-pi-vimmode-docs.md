# User-facing pi-vimmode documentation

pi-vimmode will keep detailed user-facing behavior documentation in `docs/features.md` and the complete settings reference in `docs/settings.md`, while `README.md` remains the quickstart and documentation index. `docs/adr/` remains for compact decisions like this one. We choose this split because feature and settings guides need examples, tables, and operational detail that would make README and ADRs noisy, but the docs structure itself is a durable decision worth recording.

Future updates to `docs/features.md` and `docs/settings.md` must verify behavior against `src/config.ts`, `src/types.ts`, relevant feature modules under `src/`, durable requirements in `openspec/specs/`, and focused tests under `test/` before changing user-facing claims. `src/config.ts` and `src/types.ts` are the source of truth for settings names, defaults, accepted values, and validation behavior; feature docs should prefer current source/spec/test behavior over older README or archived plan prose when conflicts appear.

## Resolved follow-up decisions

### From 2026-05-29 documentation review

- README is the quickstart and index, not a synced full reference. Keep detailed feature behavior in `docs/features.md` and detailed settings/defaults/troubleshooting in `docs/settings.md`.
