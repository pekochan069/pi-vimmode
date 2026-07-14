## Context

pi-vimmode parses global JSON, trusted global JavaScript, and project JSON into partial options, overlays keymap layers, and resolves one immutable keymap used by compiled finite matchers. Mapping keys are currently normalized while each layer is parsed, while trusted JS mappings are compiled into the same partial keymap shape. Leader semantics must use the final setting across every retained layer, preserve field-level warnings, keep insert-mode text delegation unchanged, and override structural normal/visual dispatch only when a retained `<leader>` mapping exists.

## Goals / Non-Goals

**Goals:**

- Expose optional `piVimMode.leader` and trusted `vim.g.mapleader` settings with unset-by-default, `null` clear, and normal layer precedence.
- Preserve leading case-insensitive `<leader>` placeholders through raw layer overlay, then expand final retained mapping keys before resolved-keymap compilation.
- Preserve current category validation, deterministic warnings, explicit keymap precedence, protected Pi shortcuts, and resolved physical-key displays.
- Make retained normal/visual leader mappings reserve their selected prefix across normal and visual grammar, including hard-coded count, register, mark, macro, and visual transform entry paths; insert-only mappings stay mode-local.

**Non-Goals:**

- Vim declaration-time `mapleader`, timeout fallback, recursive mappings, RHS leader expansion, or runtime mapping commands.
- Multi-key insert-mode input buffering or relaxed text-object/insert binding rules.
- A default leader or project-local executable JavaScript config.

## Decisions

### Resolve final leader, overlay source mappings, then expand once

`src/config.ts` will read the raw global, JS, and project `piVimMode` objects and resolve valid leader values in normal precedence order. `null` clears, omission inherits, and invalid values warn while leaving the previous valid value effective. Mapping parsers retain canonical leading `<leader>` source notation in partial keymaps. After final leader resolution, each layer drops invalid leader-dependent entries while preserving valid siblings and explicit empty-array clears; retained raw partial keymaps then overlay by existing precedence before one expansion pass uses final leader. Runtime keymaps contain physical sequences only. The resolved root options retain final leader so `cloneResolvedVimOptions` and live `VimEditor` construction preserve setting.

`additiveKeymapLayer` will append trusted JS action/insert additions to raw inherited partial bindings rather than calling runtime keymap resolution early. This preserves placeholder provenance until project overrides or clears have produced the final overlay.

Alternative: expand each layer with its local leader. Rejected because inherited mappings would use mixed prefixes and project JSON could not move a complete inherited keymap. Alternative: expand before overlay and carry parallel provenance metadata. Rejected because action replacement, remap append semantics, and JS additive materialization can leave stale ownership. Alternative: preserve placeholders until runtime. Rejected because runtime views, conflict diagnostics, and compiled matcher caches should consume physical resolved sequences only.

### Normalize `<leader>` through existing finite config parsing

`src/config.ts` and `src/config-js.ts` will canonicalize case-insensitive leading `<leader>` tokens in mapping LHS/key strings, reject tokens that appear after an ordinary key, expand final retained mappings with the final leader, reject a lone placeholder, and retain existing per-category validation. Expansion applies to JSON key arrays, action binding keys, remap LHS keys, and JS `vim.keymap.set` LHS values; replay RHS tokenization remains separate and unchanged. Repeated leading placeholders are valid when the mapping contains more than one resulting key.

Trusted JS exposes builder-local `vim.g.mapleader` assignment. The setter accepts one printable character or `null`; invalid assignments add builder warnings without discarding valid mappings. Getter behavior is not part of the public contract.

Alternative: add custom `vim.keymap.leader(...)`. Rejected because `vim.g.mapleader` is familiar and already selected as the public contract. Alternative: add a broad Vim key-notation parser. Rejected because only leader token support is required.

### Derive active normal/visual leader ownership from final overlay

After final raw overlay, keymap resolution will scan retained source mappings. Only accepted normal/visual mappings beginning with `<leader>` activate runtime leader ownership; existing printable-sequence and multi-key validation rejects insert escape, insert action, and text-object leader mappings before they can activate ownership. Any accepted normal- or visual-scoped leader mapping reserves the selected prefix across normal and all visual modes. Literal mappings beginning with the selected physical character do not activate leader reservation by themselves.

A dedicated reservation pass removes inherited exact/prefix grammar under the selected leader before applying expanded overlay bindings, including action mappings that are normally additive and mappings with atomic modified-key suffixes. It does not reuse the general `+`-guarded prefix-removal helper and therefore does not delete newly expanded leader mappings.

The resolved keymap carries active leader only when reservation is active. `src/commands.ts` prioritizes that active leader prefix before numeric count parsing. `src/modal/engine.ts` routes an active first leader key to remap/finite-command resolution before register, macro, mark, or visual `u`/`U` structural handlers. Existing pending operands keep ownership once entered. Entering or invalidating leader sequence does not edit prompt text, change durable register/mark/search/visual/dot-repeat state, or emit new Ex messages; standard transient-message clearing for handled input still applies.

Alternative: require users to clear conflicts manually. Rejected because hard-coded count/register paths cannot be cleared consistently and mapping categories would behave differently. Alternative: mode-specific reservation. Rejected because it requires per-mode provenance and produces multiple leader grammars; one retained normal/visual leader mapping intentionally reserves the prefix across those modes. Alternative: add timeout fallback. Rejected as broader state/UI behavior outside this change.

### Keep displays and docs resolved

Existing keybinding/help views continue reading resolved key sequences and therefore show physical expanded keys. `docs/settings.md` documents complete syntax, precedence, clear behavior, warnings, and JSON/JS examples; `docs/features.md` describes behavior; README removes leader maps from limitations and links to settings details. OpenSpec tests cover parser, JS builder, resolver precedence, modal dispatch, live option cloning, and docs drift where applicable.

## Risks / Trade-offs

- **A selected leader can disable familiar Vim grammar such as counts or registers**: Reservation activates only when a retained leader-derived mapping exists; docs state the consequence and tests cover digit/quote cases.
- **Config parsing and runtime dispatch can disagree about active ownership**: Store active leader ownership on the immutable resolved keymap and exercise both resolver and modal tests.
- **Higher-priority invalid fields, clears, or literal replacements can lose fallback or leave stale reservation metadata**: Validate leader-dependent entries per layer, preserve placeholders through raw overlay, and derive ownership only from final retained source mappings.
- **Insert mappings could swallow ordinary text or alter normal grammar**: Keep existing printable-sequence rejection, add no insert pending state, and exclude insert-only mappings from normal/visual reservation.
- **Option propagation can drift in live editors**: Add leader to centralized clone helpers and a live editor option-cloning test.
- **Global agent configuration could be mutated during testing**: Use temporary fixtures only; never edit `/home/thinline20/.pi/agent/settings.json`.

## Migration Plan

No migration is required. Existing settings contain no leader field, so behavior remains unchanged. Rollback removes the optional setting and placeholder handling; configurations using them then produce existing unsupported/unmapped behavior without data migration.

## Open Questions

None.
