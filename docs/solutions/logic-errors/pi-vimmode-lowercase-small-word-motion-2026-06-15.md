---
title: Lowercase Vim word motions used WORD/native boundaries
date: 2026-06-15
category: docs/solutions/logic-errors
module: pi-vimmode
problem_type: logic_error
component: tooling
symptoms:
  - "Lowercase `w` moved through punctuation-heavy text like a WORD/native editor motion"
  - "In `foo/bar baz qux`, uppercase `W` worked but lowercase `w` did not stop at Vim small-word boundaries"
  - "Operator and normal-motion paths risked disagreeing because some word motions used pure buffer helpers while lowercase `w`/`b` delegated to adapter commands"
root_cause: logic_error
resolution_type: code_fix
severity: medium
related_components:
  - "testing_framework"
  - "documentation"
tags:
  - "vim-mode"
  - "word-motion"
  - "adapter-boundary"
  - "buffer-helpers"
  - "typescript"
---

# Lowercase Vim word motions used WORD/native boundaries

## Problem

`pi-vimmode` lowercase word motions drifted from Vim small-word behavior. Uppercase `W` behaved correctly as a whitespace-delimited WORD motion, but lowercase `w` behaved too much like a native editor or WORD motion in punctuation-heavy text.

The concrete repro was:

```txt
foo/bar baz qux
```

Expected lowercase `w` movement should split keyword and punctuation runs:

```txt
0:f -> 3:/ -> 4:b(bar) -> 8:b(baz) -> 12:q(qux)
```

Uppercase `W` should remain whitespace-delimited:

```txt
f -> b(baz) -> q(qux)
```

## Symptoms

- `W` worked as expected for WORD movement.
- Lowercase `w` did not behave like Vim small-word movement over `foo/bar baz qux`.
- Punctuation-heavy tokens such as paths, flags, and slash-delimited text could skip important small-word stops.
- Normal motion and operator-motion semantics were at risk of diverging because lowercase normal motions used adapter commands while newer WORD and previous-end motions used pure buffer helpers.

## What Didn't Work

- Delegating lowercase `wordForward` / `wordBackward` to adapter-native commands (`wordRight` / `wordLeft`) was too broad. The host editor's word model is not Vim's small-word model.
- Adding uppercase `W`, `B`, `E`, `gE` support alone did not protect lowercase behavior. The first tests proved the new WORD paths worked, while manual testing exposed lowercase `w` still drifting.
- Pure parser and keymap tests were insufficient by themselves. The command could parse correctly while runtime cursor restoration still used the wrong movement implementation.
- Prior session history search found no directly relevant prior sessions for this exact lowercase-vs-WORD regression.

## Solution

Keep lowercase Vim word semantics in `src/buffer.ts`, and keep adapter-native movement out of lowercase `w` / `b`.

### Split small-word and WORD classifiers

`src/buffer.ts` now classifies characters into three small-word categories:

```ts
function isKeywordWordChar(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_]/.test(char);
}

function wordKind(char: string | undefined): "keyword" | "punctuation" | "whitespace" {
  if (isWhitespace(char)) return "whitespace";
  return isKeywordWordChar(char) ? "keyword" : "punctuation";
}
```

Lowercase motions use keyword/punctuation/whitespace boundaries:

```ts
wordForwardPosition(...)      // w
wordBackwardPosition(...)     // b
wordEndPosition(...)          // e
wordPreviousEndPosition(...)  // ge
```

Uppercase WORD motions use non-whitespace spans:

```ts
wordForwardBigPosition(...)      // W
wordBackwardBigPosition(...)     // B
wordEndBigPosition(...)          // E
wordPreviousEndBigPosition(...)  // gE
```

`motionTargetOffset` chooses the correct implementation for each motion:

```ts
if (motion === "w") return nextWordStartOffset(text, offset);
if (motion === "W") return nextWORDStartOffset(text, offset);
if (motion === "e") return wordEndOffset(text, offset);
if (motion === "E") return wordEndWORDOffset(text, offset);
if (motion === "ge") return previousWordEndOffset(text, offset);
if (motion === "gE") return previousWordEndWORDOffset(text, offset);
if (motion === "B") return previousWORDStartOffset(text, offset);
return previousWordStartOffset(text, offset);
```

### Stop delegating lowercase word motion to adapter commands

`src/modal/normal.ts` no longer maps lowercase semantic motions to native adapter commands. Remove prior `wordForward -> wordRight` and `wordBackward -> wordLeft` adapter mappings for Vim lowercase word semantics.

Instead, it restores the cursor using pure buffer motion helpers:

```ts
if (motion === "wordForward") {
  return {
    type: "restoreCursor",
    position: wordForwardPosition(snapshot.text, snapshot.cursor, count),
  };
}

if (motion === "wordBackward") {
  return {
    type: "restoreCursor",
    position: wordBackwardPosition(snapshot.text, snapshot.cursor, count),
  };
}
```

### Add punctuation-heavy regression tests

`test/buffer.test.ts` now locks the user-reported example:

```ts
const text = "foo/bar baz qux";
expect(wordForwardPosition(text, p(0, 0))).toEqual(p(0, 3)); // slash
expect(wordForwardPosition(text, p(0, 3))).toEqual(p(0, 4)); // bar
expect(wordForwardPosition(text, p(0, 4))).toEqual(p(0, 8)); // baz
expect(wordForwardPosition(text, p(0, 8))).toEqual(p(0, 12)); // qux
```

The same fixture covers backward and end motions for `b` and `e`; adjacent previous-end tests cover `ge` so it cannot silently reuse WORD semantics.

## Why This Works

Vim has two word models:

- `word` (`w`, `b`, `e`, `ge`) moves across keyword-word runs, punctuation runs, and whitespace.
- `WORD` (`W`, `B`, `E`, `gE`) moves across whitespace-delimited non-whitespace spans.

Native editor word commands are not a stable contract for either model. They may treat punctuation, paths, and whitespace differently from Vim. Moving the semantics into pure buffer helpers makes normal, visual, and operator motions share one implementation and keeps adapter behavior limited to generic cursor commands such as arrows and line start/end.

This also preserves the layering used elsewhere in `pi-vimmode`: parser resolves finite semantic commands, `src/buffer.ts` owns text semantics, modal code emits cursor/edit effects, and the adapter applies those effects.

## Prevention

- Test lowercase `w/b/e/ge` and uppercase `W/B/E/gE` side-by-side whenever word motion behavior changes.
- Include punctuation-heavy fixtures, not only prose:
  - `foo/bar baz qux`
  - `--flag value`
  - `/tmp/a-b next`
  - `alpha beta.gamma /tmp/file`
- Do not delegate Vim-specific word semantics to editor-native `wordRight` / `wordLeft` commands.
- Add seam coverage only where behavior crosses that seam:
  - parser/keymap tests for binding changes,
  - buffer tests for cursor/range semantics,
  - modal or live editor tests for runtime effect wiring changes,
  - operator-motion tests when `d`, `c`, or `y` can use the motion.
- When manual testing finds a cursor-position bug, preserve the exact typed example as a small regression test before broadening fixtures.

## Related Documentation

- [`docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md`](../architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md) — broader parser/buffer/helper layering pattern. This fix is a concrete example of why Vim text semantics belong in pure buffer helpers.
- [`docs/solutions/architecture-patterns/pi-vimmode-prompt-buffer-operation-api-2026-05-27.md`](../architecture-patterns/pi-vimmode-prompt-buffer-operation-api-2026-05-27.md) — broader operation-level buffer API guidance. This fix adds another operation-level boundary: word motion helpers, not adapter-native word movement.
- [`docs/solutions/logic-errors/vim-behavior-contract-drift-2026-05-28.md`](vim-behavior-contract-drift-2026-05-28.md) — related drift pattern where pure tests passed while live runtime behavior diverged.
