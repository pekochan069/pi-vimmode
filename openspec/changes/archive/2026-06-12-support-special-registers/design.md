## Context

pi-vimmode currently has one unnamed register plus alphabetic named edit registers in `ModalState`. `src/modal/registers.ts` validates only `a-z`/`A-Z`, `writeRegisters()` always writes the unnamed register first, and `registerToRead()` selects a pending named register only for paste. Normal, visual, and Ex line commands already route register-producing operations through modal helpers, while `VimEditor` only applies modal effects.

The user request is for Vim/Neovim special-register muscle memory, especially clipboard copy and paste. Pi exposes an async `copyToClipboard(text)` helper, while clipboard text reads require platform clipboard tools. Design therefore supports clipboard writes through Pi, normal-mode clipboard paste through platform text reads, and prompt-local typed clipboard mirrors as fallback.

## Goals / Non-Goals

**Goals:**

- Support selected special register targets: explicit unnamed `""`, black-hole `"_`, and clipboard `"+`/`"*`.
- Preserve existing unnamed and alphabetic named-register behavior, including uppercase append for `A-Z`.
- Apply special registers consistently for normal mode, visual modes, and Ex `:delete`/`:yank`/`:put` register operands.
- Keep text semantics in buffer helpers and register-target semantics in modal register helpers.
- Keep host clipboard writes and reads adapter-owned through `ModalEffect`, not performed inside pure modal code.
- Document finite support and unsupported special registers clearly.

**Non-Goals:**

- Full Vim/Neovim register parity.
- Expression register evaluation (`"=`), numbered registers, yank register `"0`, small-delete register, read-only filename/command/search registers, or register persistence.
- Full typed Vim metadata for arbitrary OS clipboard text; host clipboard reads are charwise because OS clipboard text does not carry Vim register type.
- New settings, runtime dependencies, recursive mappings, or Vimscript grammar.

## Decisions

### Model register targets as typed targets, not slot strings

Change `PendingRegisterTarget` from `{ slot, append } | "awaitingSlot"` to a discriminated union covering:

- `{ kind: "named"; slot: "a".."z"; append: boolean }`
- `{ kind: "unnamed" }`
- `{ kind: "blackHole" }`
- `{ kind: "clipboard"; slot: "+" | "*" }`
- `"awaitingSlot"`

Target seams: `src/modal/types.ts`, `src/modal/registers.ts`, `src/ex.ts`, `src/modal/inspect.ts`.

Rationale: special registers have different write/read behavior. Encoding `+`, `*`, `_`, or `"` as fake named slots would leak invalid append/read semantics into named-register storage and inspect output.

Alternative considered: keep `RegisterSlot = string` and branch on string values in `writeRegisters()`. Rejected because every caller would need to remember which strings are named registers versus side-effecting special registers.

### Return register-write effects through modal update helpers

Split register writing into a helper that returns state plus effects, for example `applyRegisterWrite(state, register): { state; effects }`. Existing state-only helpers can delegate to it where no side effects are possible, but edit/yank update paths that can target clipboard must merge emitted effects into their `ModalUpdate`.

Target seams: `src/modal/registers.ts`, `src/modal/core.ts`, `src/modal/normal.ts`, `src/modal/visual.ts`, `src/modal/ex-command-line.ts`, `src/modal/types.ts`.

Rationale: clipboard copy is a host side effect. Pure modal code may decide that a clipboard write is needed, but only the adapter should call Pi runtime APIs.

Alternative considered: call `copyToClipboard()` directly in register helpers. Rejected because modal helpers are pure/testable and currently do not import Pi adapter/runtime APIs.

### Add a clipboard-copy modal effect

Extend `ModalEffect` with a narrow adapter intent such as `{ type: "copyClipboard"; text: string; register: "+" | "*" }`. `VimEditor.applyEffect()` imports Pi's existing `copyToClipboard` helper and starts the async copy. Failure is surfaced as a bounded runtime warning/message; prompt text, cursor, registers, and mode are not rolled back after a failed host copy.

Target seams: `src/modal/types.ts`, `src/vim-editor.ts`, `test/modal-effects.test.ts`, adapter tests.

Rationale: existing `ModalEffect` is the boundary for adapter-applied intents (`edit`, `delegate`, `playMacro`, popup, cursor). Clipboard copy fits that model and avoids adding a new dependency.

Alternative considered: use terminal OSC 52 directly from pi-vimmode. Rejected because Pi already centralizes clipboard behavior and platform fallbacks.

### Keep clipboard registers as prompt-local typed mirrors and paste fallback

Add `clipboardRegisters?: Partial<Record<"+" | "*", VimRegister>>` to modal state. Writing `"+` or `"*` updates unnamed register, updates the matching prompt-local clipboard mirror, and emits a copy effect containing the register text. Normal-mode paste from `"+p` or `"*p` emits a host clipboard read effect; if the read succeeds, adapter pastes the OS text as a charwise register and refreshes the mirror. If host clipboard read fails, adapter falls back to the typed mirror when present. Missing/empty clipboard data remains a safe no-op/error shape.

Target seams: `src/modal/types.ts`, `src/modal/registers.ts`, `src/modal/state.ts`, `src/modal/inspect.ts`, `src/clipboard.ts`, `src/vim-editor.ts`.

Rationale: `VimRegister` carries linewise/charwise type, while plain OS clipboard text does not. A mirror preserves existing paste placement rules after pi-vimmode itself wrote the clipboard and provides fallback when platform reads are unavailable.

Alternative considered: read host clipboard in pure modal code. Rejected because modal helpers are testable/pure and adapter owns host side effects.

### Define black-hole as discard plus unnamed preservation

When active target is `blackHole`, yank/delete/change consumes the produced register but does not update unnamed, named, or clipboard registers and emits no clipboard effect. Prompt edits from delete/change still happen. `"_p`/`"_P` and `:put _` read no register and therefore no-op or report the existing missing-register Ex error.

Target seams: `src/modal/registers.ts`, normal/visual/Ex write and read call sites.

Rationale: Vim users use black-hole specifically to avoid clobbering the default register. This is a clear special case worth supporting.

Alternative considered: update unnamed while also discarding named storage. Rejected because it defeats black-hole's primary use.

### Treat explicit unnamed as current default behavior

`""` resolves to `kind: "unnamed"`. Writes update only the unnamed register, pastes read the unnamed register, and the target is still one-shot/consumed like other register prefixes.

Target seams: `src/modal/registers.ts`, normal/visual/Ex register parsers.

Rationale: explicit unnamed support gives Vim-compatible syntax without new behavior and helps users who compose repeatable register workflows.

Alternative considered: reject `""` because unprefixed commands already work. Rejected because supporting it is low-risk once special target parsing exists.

### Keep Ex operands finite and unquoted

Extend `parseRegisterOperand()` to accept exactly one operand from `[A-Za-z_+*"]`. `:delete +` and `:yank *` write clipboard registers; `:put +`/`:put *` read prompt-local mirrors; `:delete _`/`:yank _` discard; `:put _` reports missing register. Quoted Ex forms like `:delete "+` remain invalid.

Target seams: `src/ex.ts`, `src/modal/ex-command-line.ts`, `test/ex.test.ts`.

Rationale: current Ex grammar already accepts bare one-character register operands. Keeping that shape avoids a broader Vimscript command-line parser.

Alternative considered: parse Vim's quoted Ex register syntax. Rejected because existing project scope intentionally keeps Ex grammar finite and explicit.

## Risks / Trade-offs

- Clipboard write failure after state update → surface a runtime warning/message and keep register state/prompt edit complete; do not roll back user edits.
- Clipboard read availability varies by platform tools (`pbpaste`, `win32yank.exe`/PowerShell `Get-Clipboard`, Termux, `wl-paste`, `xclip`, `xsel`) → surface bounded failure and fall back to prompt-local mirror.
- Register write helper signature churn touches many modal paths → update shared `editUpdate`, `yankUpdate`, visual, Ex, and golden effect tests together.
- Special-target parsing could swallow future quote commands → keep `"` reserved only for register prefixes and reject unsupported targets safely.
- Docs/spec drift is likely because previous docs explicitly list special registers as unsupported → update `docs/features.md`, runtime help, docs drift tests, and OpenSpec delta in one implementation slice.

## Migration Plan

1. Add discriminated register target types, clipboard mirror state, target parser, target display, read/write helpers, and state preservation/reset handling.
2. Add `copyClipboard` modal effect and adapter integration using Pi `copyToClipboard`, with test injection or adapter smoke coverage for effect application.
3. Update normal and visual mode register-prefix handling so `""`, `"_`, `"+`, and `"*` compose with existing register-aware commands and clear safely after unsupported commands.
4. Extend Ex register operand parsing/execution for bare `_`, `+`, `*`, and `"` operands.
5. Add tests for helper behavior, normal mode, visual modes, Ex parse/execute, inspect output, clipboard effects, missing mirrors, and unsupported targets such as `"=`.
6. Update feature docs/runtime help and drift tests to describe supported subset and non-goals.
7. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, `openspec validate support-special-registers --type change --strict`, and `openspec validate --specs --strict`.

Rollback: remove special-target union members, clipboard mirror state, copyClipboard effect, Ex special operands, tests, and docs. Existing alphabetic named-register behavior should remain covered by current tests.

## Open Questions

- None blocking. If Pi later exposes clipboard text reads, a follow-up change can replace the local platform reader with the official Pi API.
