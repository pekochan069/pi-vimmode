## Context

`piVimMode.keymap.actions` already supports finite bindable prompt transform actions, and `src/action-keybinding-recipes.ts` already owns source-backed copy-pasteable recipes for paragraph editing and Markdown wrapping. The remaining friction is configuration ergonomics: users must paste nested JSON snippets instead of selecting a named bundle.

This change adds a small config-resolution layer. It must not alter prompt transform semantics, modal dispatch, registers, marks, dot-repeat, search highlight clearing, visual state, Ex messages, cursor behavior, or insert-mode Pi delegation. Presets expand into the same action binding candidates that explicit `piVimMode.keymap.actions` already uses.

## Goals / Non-Goals

**Goals:**

- Add `piVimMode.keymap.actionPresets` as an opt-in array of named built-in action keybinding presets.
- Reuse existing recipe metadata for `paragraph-editing` and `markdown-wrapping` instead of duplicating key/action data.
- Resolve presets through existing action binding parsing, arg normalization, protected-shortcut checks, disabled-transform checks, duplicate-key checks, and grammar-conflict checks.
- Let explicit `piVimMode.keymap.actions` override or clear preset-provided action IDs.
- Document and expose presets through finite runtime help/discovery with drift-guarded tests.

**Non-Goals:**

- No default action keybindings.
- No new prompt transform actions, edit behavior, or modal engine dispatch path.
- No full Vim mapping semantics, recursive mappings, `.vimrc`, runtime `:map`, or plugin API.
- No diagnostic/help action dispatch through keybindings.
- No removal of existing recipes or `piVimMode.keymap.actions` snippets.

## Decisions

1. **Use `piVimMode.keymap.actionPresets` under keymap.**
   - Target seams: `src/types.ts`, `src/config.ts`, `docs/settings.md`, `openspec/specs/vim-keymap-configuration/spec.md`.
   - Decision: accept an array of finite preset IDs such as `["paragraph-editing", "markdown-wrapping"]`; default is absent/empty.
   - Rationale: action presets are keymap-specific, not whole-editor baselines like top-level `piVimMode.preset`.
   - Alternatives rejected: top-level `piVimMode.actionPreset` (too easy to confuse with whole-editor presets), single string only (prevents combining finite bundles), automatic defaults (breaks current no-default action keybinding contract).

2. **Derive presets from source-backed recipe metadata.**
   - Target seams: `src/action-keybinding-recipes.ts` or a renamed/shared `src/action-keybinding-presets.ts`, `test/config.test.ts`, `test/docs-drift.test.ts`.
   - Decision: keep one source of truth for preset ID, title, docs anchor, action snippets, and expected resolved bindings. Existing recipe exports can remain or become aliases over the preset registry.
   - Rationale: recipes and presets describe the same canonical action IDs/keys; duplicating them invites drift.
   - Alternatives rejected: hard-code preset maps in `src/config.ts` (hides user-facing metadata from docs/runtime help), regenerate JSON snippets manually in docs (parser drift risk).

3. **Apply presets before explicit actions at each settings layer.**
   - Target seams: `parseKeymap`, `mergeKeymap`, `mergeActionBindings`, `resolveVimOptions`.
   - Decision: resolution order is defaults, global top-level preset, global `keymap.actionPresets`, global explicit `keymap.actions`, project top-level preset, project `keymap.actionPresets`, project explicit `keymap.actions`. Multiple presets in the same array apply in listed order; later presets replace earlier bindings for the same action ID. Explicit `keymap.actions` replaces preset bindings for the same action ID, and an explicit empty array clears that action ID.
   - Rationale: users can select a bundle, then override one action without rewriting the whole bundle.
   - Alternatives rejected: append explicit actions after preset bindings for the same action ID (creates duplicate/conflict surprises), apply all presets after explicit actions (prevents overrides), make empty arrays invalid (removes the only compact clearing mechanism).

4. **Reuse current action binding parser and resolver.**
   - Target seams: `parseActionBindingEntry`, `normalizePromptTransformActionArgs`, `resolveActionBindings`, `commands.ts` action dispatch tests only as regression coverage.
   - Decision: preset expansion produces the same partial `actions` shape as explicit config; it then flows through existing validation and conflict detection.
   - Rationale: side effects stay unchanged because accepted presets only change resolved action keymap entries.
   - Alternatives rejected: install presets directly into `DEFAULT_VIM_KEYMAP` (would create defaults), add a separate command resolver path (prefix/count/macro/operator behavior drift), skip validation because built-ins are trusted (disabled transform and future grammar conflicts would become stale).

5. **Keep runtime help finite and source-backed.**
   - Target seams: `src/runtime-help.ts`, `test/runtime-help.test.ts`, `test/docs-drift.test.ts`, `docs/features.md`.
   - Decision: `:features keybindings`, `:features action presets`, and preset-name queries report available preset IDs, their action IDs/keys, and opt-in/no-default wording. Full JSON can stay in settings docs.
   - Rationale: users can discover the setting without a new command or command palette.
   - Alternatives rejected: add `:presets` or `:map` command (unnecessary Ex/API expansion), docs-only discovery (misses runtime quick help and drift guard path).

6. **Avoid new resolved state unless diagnostics need it.**
   - Target seams: `ResolvedVimKeymap`, `VimEditor` `cloneOptions`, live editor tests.
   - Decision: prefer expanding presets into `keymap.actions.accepted` without storing selected preset IDs in resolved editor options. If implementation stores selected IDs for diagnostics, update `cloneOptions` and add a live `VimEditor` construction test.
   - Rationale: the runtime behavior is the accepted action bindings, not the preset label.
   - Alternatives rejected: store raw user config in `VimEditor` (adapter should stay thin), inspect settings files at runtime (violates resolved-options source of truth and complicates project/global layering).

## Risks / Trade-offs

- **Preset vs recipe terminology confusion** → Docs distinguish recipes as copy-paste snippets and presets as config-selected bundles backed by the same metadata.
- **Unexpected overrides when combining presets** → Define listed-order merge semantics and test overlapping `quote`/`unquote` bindings.
- **Preset bindings rejected by disabled transforms or future grammar changes** → Reuse existing resolver and add tests proving warnings occur while valid siblings survive.
- **Config propagation drift** → Update public types, parser, merge logic, docs, specs, and live editor construction tests if any resolved field changes.
- **Runtime help becomes too verbose** → Keep feature output compact with preset IDs and `actionId=key` pairs; put full JSON in docs.
- **Users expect Vim mapping parity** → Repeat non-goals in docs/help: no recursive mappings, no plugin API, no runtime `:map`.

## Migration Plan

1. Add typed preset ID metadata by reusing or renaming the recipe registry.
2. Extend config parsing for `piVimMode.keymap.actionPresets` with field-by-field warnings for unsupported values and non-array input.
3. Expand preset actions before explicit `keymap.actions` at global/project layers.
4. Add config tests for defaults, valid preset expansion, invalid sibling preservation, disabled transform rejection, explicit override, explicit clearing, project-over-global behavior, and duplicate preset order.
5. Update runtime help and docs drift tests for preset discovery and docs anchors.
6. Update `docs/settings.md` and `docs/features.md` with accepted preset IDs and examples.
7. Validate with targeted tests, full suite, typecheck, lint, format check, and OpenSpec validation.

Rollback removes the parser field, preset expansion, docs/help output, and tests. Existing explicit `piVimMode.keymap.actions` configs continue to work because presets are additive opt-in sugar.

## Open Questions

- Should the implementation keep the existing `ACTION_KEYBINDING_RECIPES` export name and add preset aliases, or rename the module to presets with recipe compatibility exports?
- Decision: `markdown-wrapping` uses `gT` with no default language specifier; users can override `prompt.transform.fence` explicitly when they want a language like `ts`.
- Should runtime help show a minimal JSON fragment for `actionPresets`, or only list preset IDs and point to settings docs?
