---
title: Pi vimmode WSL2 clipboard paste should prefer win32yank
date: 2026-06-12
category: docs/solutions/integration-issues
module: pi-vimmode
problem_type: integration_issue
component: tooling
symptoms:
  - 'Normal-mode `"+p` and `"*p` clipboard paste failed on WSL2'
  - "PowerShell clipboard reads worked but added visible paste latency"
  - "Neovim clipboard paste felt faster in the same WSL2 environment"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
related_components:
  - testing_framework
  - documentation
tags:
  - pi-vimmode
  - clipboard
  - wsl2
  - win32yank
  - powershell
  - neovim-parity
  - platform-tools
---

# Pi vimmode WSL2 clipboard paste should prefer win32yank

## Problem

`pi-vimmode` added host clipboard reads for normal-mode clipboard register paste (`"+p`, `"+P`, `"*p`, and `"*P`), but WSL2 users saw `Clipboard Paste Failed` or noticeable latency. The first fix treated WSL2 like generic Linux, then used PowerShell as the Windows clipboard fallback, which was correct but too slow for a Vim-style paste path.

## Symptoms

- User reported `Clipboard Paste Failed, wsl2` after trying `"+p`.
- Node reported WSL2 as `platform() === "linux"`, so Windows clipboard behavior was not selected by OS platform alone.
- `/proc/version` contained `microsoft-standard-WSL2`, confirming the hybrid Linux/Windows environment.
- `powershell.exe Get-Clipboard -Raw` could read the clipboard, but measured around 240-305ms per read.
- `win32yank.exe` was already installed with Neovim and available on `PATH`; it read clipboard text in roughly 47-76ms.

## What Didn't Work

- Treating WSL2 as generic Linux missed the Windows host clipboard bridge. In WSL2, Node's platform check alone only says `linux`, but clipboard expectations usually target the Windows clipboard.
- Making PowerShell the first WSL backend fixed correctness but kept paste latency visible. Starting PowerShell for every `"+p` is expensive compared with Neovim's clipboard provider path.
- Testing only the modal paste effect was insufficient. The failure lived in adapter-owned host clipboard backend selection, so it needed focused backend-order tests.

## Solution

Detect WSL separately, then prefer `win32yank.exe` before PowerShell and Linux display backends.

```ts
function isWsl(runtime: ClipboardRuntime): boolean {
  if (runtime.platform !== "linux") return false;
  if (runtime.env.WSL_DISTRO_NAME || runtime.env.WSL_INTEROP) return true;
  return /microsoft|wsl/i.test(runtime.procVersion ?? "");
}
```

Use the Neovim-compatible fast path first. The implementation calls `win32yank.exe` by command name and relies on `PATH`; it does not hard-code Neovim install paths.

```ts
function readWin32YankClipboard(runtime: ClipboardRuntime): string {
  return runtime.run("win32yank.exe", ["-o", "--lf"]);
}
```

Keep PowerShell as the Windows fallback:

```ts
function readWindowsClipboard(runtime: ClipboardRuntime): string {
  return runtime.run("powershell.exe", [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    "Get-Clipboard -Raw",
  ]);
}
```

Apply backend order explicitly in `src/clipboard.ts`:

```ts
if (isWsl(runtime)) {
  attempts.push(() => readWin32YankClipboard(runtime));
  attempts.push(() => readWindowsClipboard(runtime));
}
if (runtime.env.TERMUX_VERSION) attempts.push(() => runtime.run("termux-clipboard-get", []));
if (runtime.env.WAYLAND_DISPLAY) attempts.push(() => runtime.run("wl-paste", ["--no-newline"]));
if (runtime.env.DISPLAY) {
  attempts.push(() => runtime.run("xclip", ["-selection", "clipboard", "-out"]));
  attempts.push(() => runtime.run("xsel", ["--clipboard", "--output"]));
}
```

Add focused regression coverage in `test/clipboard.test.ts`:

- WSL reads with `win32yank.exe -o --lf` before `powershell.exe`.
- WSL falls back to PowerShell when `win32yank.exe` is unavailable.
- WSL falls through to Linux display clipboard tools if Windows clipboard backends fail.

Update user-facing docs in `docs/features.md` so the supported platform-tool order is discoverable. Each backend failure is swallowed until all attempts fail, preserving fallback behavior without making `win32yank.exe` a required dependency.

## Why This Works

WSL2 is a hybrid runtime: code runs under Linux, but the clipboard users expect is often the Windows host clipboard. `platform()` cannot distinguish that boundary; WSL env vars and `/proc/version` can.

`win32yank.exe` is purpose-built for Vim/Neovim clipboard integration on Windows and WSL. Calling it avoids PowerShell startup overhead while preserving a no-new-dependency fallback chain: environments with `win32yank.exe` on `PATH` get the fast path, environments without it still get PowerShell, and non-WSL Linux keeps Wayland/X11 behavior.

## Prevention

- Treat WSL as its own clipboard platform instead of folding it into generic Linux behavior.
- Prefer clipboard tools used by editors in the same environment (`win32yank.exe` for WSL/Neovim parity) before heavier shell fallbacks.
- Do not make `win32yank.exe` a required dependency; missing executables must fall through to PowerShell or Linux backends.
- Treat backend order as a tested contract, including exact command names and arguments.
- Add backend-order tests for platform adapters, not just modal effect tests.
- Measure external tool latency when the command sits on a hot interactive path like paste.
- Keep docs explicit about platform clipboard tool support and avoid implying full Vim/Neovim register parity.

## Related Issues

- [Pi vimmode runtime help docs drift guard](../architecture-patterns/pi-vimmode-runtime-help-docs-drift-guard-2026-06-05.md) — source-backed docs/test anchors for user-facing feature claims.
- [Vim behavior contracts drifted from live adapter behavior](../logic-errors/vim-behavior-contract-drift-2026-05-28.md) — similar prevention theme: live editor behavior must match documented Vim-style contracts.
