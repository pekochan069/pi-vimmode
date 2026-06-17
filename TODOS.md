# TODOs

## Deferred

- [x] Refactor `src/config.ts` clone helpers to reduce hand-written keymap/prompt-transform/UI field repetition. Context: /plan-eng-review on package-size work deferred this DRY cleanup so package artifact verification and the insert-mode fast path stay right-sized.
- [ ] Derive keymap/action tables from shared descriptors instead of repeating motion/command/action names across config and command resolver metadata. Context: potential bundle-size and drift-reduction follow-up; measure and protect resolver behavior with equivalence tests.
- [ ] Move docs/test-only metadata out of runtime help/action modules where possible. Context: reduce published runtime bytes while preserving docs drift guards for anchors, parser examples, and public help coverage.
- [ ] Deduplicate `src/buffer.ts` word-motion and substitution range helper logic with TDD. Context: cleanup has cursor/substitution regression risk, so keep it separate from package and input-latency work.
- [ ] Explore compiled keymap lookup cache for normal-mode command resolution after profiling. Context: `commands.ts` currently rebuilds binding lists during lookups; follow-up should prove hotspot and cover cache invalidation/equivalence.

1. Generic cloneKeymap
   src/config.ts has huge hand-written clone:

```ts
  left: [...keymap.motions.left],
  down: [...keymap.motions.down],
  ...
```

Replace with small generic clone helpers. Same behavior, less source, less emitted JS.

Target:

- cloneKeymap
- clonePromptTransforms
- cloneUi

Expected: -5KB to -10KB.

2. Data-drive keymap/action tables
   Action names repeated across:

- VIM_MOTION_ACTIONS
- DEFAULT_VIM_KEYMAP
- validation sets
- legacy maps in commands.ts

Use one descriptor table:

```ts
const MOTIONS = [
  ["left", "h"],
  ["down", "j"],
  ["up", "k"],
  ["right", "l"],
  ["wordForward", "w"],
] as const;
```

Derive:

- default keymap
- allowed set
- legacy map
- reverse map

Expected: -8KB to -15KB, better maintainability.

3. Strip source-backed metadata from runtime
   docsAnchor, specAnchor, testAnchors, parserExample exist mostly for drift tests/docs. Runtime popup does not need most of them.

Move metadata to test/dev module, keep runtime entries lean.

Targets:

- src/runtime-help.ts
- src/diagnostic-actions.ts
- src/keybinding-discovery-popup.ts
- src/action-keybinding-recipes.ts

Expected: -3KB to -6KB.

4. Refactor duplicated word motion helpers
   src/buffer.ts has separate small-word / WORD versions:

```ts
nextWordStartOffset;
nextWORDStartOffset;
wordEndOffset;
wordEndWORDOffset;
previousWordEndOffset;
previousWordEndWORDOffset;
previousWordStartOffset;
previousWORDStartOffset;
```

Unify with one classifier param:

```ts
  const smallWord = (a, b) => ...
  const bigWord = (a, b) => !isWhitespace(...)
```

Expected: -3KB to -6KB.

5. Refactor substitute range loop
   substituteLineRangeLiteral and substituteLineRangeRegex duplicate line-range traversal, ranges, nextText, cursor clamp.

Extract shared substituteLineRange(...).

Expected: -2KB to -4KB.

6. Faster typing: insert-mode fast path
   Current VimEditor.handleInput() builds full snapshot for every key, even insert-mode letters that just delegate to Pi.

Add fast path:

```ts
  override handleInput(data: string): void {
    if (
      this.modalState.mode === "insert" &&
      !this.modalState.blockInsert &&
      !matchesKey(data, "escape")
    ) {
      const before = this.redoSnapshot();
      super.handleInput(data);
      this.clearRedoAfterTextChange(before);
      return;
    }

    const update = handleModalInput(
      this.modalState,
      this.snapshot(),
      this.options,
      data,
      this.diagnostics,
    );
    this.modalState = update.state;
    this.applyEffects(update.effects);
  }
```

Expected: big typing latency win on long prompts. Bundle size neutral.

7. Faster normal mode: compiled keymap cache
   commands.ts rebuilds bindings via Object.entries / arrays during command resolution.

Compile once after config load:

- exact sequence map
- prefix set
- text object kind map
- text object target map
- command-specific sequence sets

Use WeakMap<ResolvedVimKeymap, CompiledKeymap>.

Expected: faster normal-mode command handling. Bundle size neutral/slightly up.

Priority order:

1. Fix publish entry to use dist/index.js
2. Insert-mode fast path
3. Generic config clone helpers
4. Data-drive keymap tables
5. Strip docs metadata from runtime
6. Buffer helper dedupe
7. Compiled keymap cache

## Ideas

- [ ] Explore a full user-defined action/plugin surface for pi-vimmode after the finite named prompt action/transform keybinding layer proves demand.
  - [ ] javascript/typescript based config files in `~/.pi/agent/`
- [ ] Add registry-backed diagnostic action entries and a fuller Neovim quickref classification after M1 prompt transform action keybindings ship. Context: /plan-eng-review intentionally cut `vimmode.*` diagnostic metadata and quickref polish from the first code PR so resolver/config/dispatch risk stays bounded.
- [ ] Explore config-hacker and extension-author workflows: action registry introspection, recipes, community presets, and future extension seams.
- [ ] ex command autocomplete
