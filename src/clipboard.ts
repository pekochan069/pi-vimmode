import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { platform } from "os";

export type ClipboardTextReader = () => Promise<string>;
type ClipboardCommandRunner = (command: string, args: string[], input?: string) => string;

type ClipboardRuntime = {
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  procVersion?: string;
  run: ClipboardCommandRunner;
};

let clipboardTextReaderForTesting: ClipboardTextReader | undefined;
let clipboardCommandRunnerForTesting: ClipboardCommandRunner | undefined;
let clipboardRuntimeForTesting: Partial<Omit<ClipboardRuntime, "run">> | undefined;

export function setClipboardTextReaderForTesting(reader: ClipboardTextReader | undefined): void {
  clipboardTextReaderForTesting = reader;
}

export function setClipboardRuntimeForTesting(
  runtime: Partial<Omit<ClipboardRuntime, "run">> | undefined,
  runner: ClipboardCommandRunner | undefined,
): void {
  clipboardRuntimeForTesting = runtime;
  clipboardCommandRunnerForTesting = runner;
}

function readWith(command: string, args: string[], input?: string): string {
  return execFileSync(command, args, {
    encoding: "utf8",
    input,
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "ignore"],
    timeout: 5000,
  });
}

function readProcVersion(): string | undefined {
  try {
    return existsSync("/proc/version") ? readFileSync("/proc/version", "utf8") : undefined;
  } catch {
    return undefined;
  }
}

function createClipboardRuntime(): ClipboardRuntime {
  return {
    env: clipboardRuntimeForTesting?.env ?? process.env,
    platform: clipboardRuntimeForTesting?.platform ?? platform(),
    procVersion: clipboardRuntimeForTesting?.procVersion ?? readProcVersion(),
    run: clipboardCommandRunnerForTesting ?? readWith,
  };
}

function isWsl(runtime: ClipboardRuntime): boolean {
  if (runtime.platform !== "linux") return false;
  if (runtime.env.WSL_DISTRO_NAME || runtime.env.WSL_INTEROP) return true;
  return /microsoft|wsl/i.test(runtime.procVersion ?? "");
}

function readWin32YankClipboard(runtime: ClipboardRuntime): string {
  return runtime.run("win32yank.exe", ["-o", "--lf"]);
}

function readWindowsClipboard(runtime: ClipboardRuntime): string {
  return runtime.run("powershell.exe", [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    "Get-Clipboard -Raw",
  ]);
}

function readClipboardTextSync(): string {
  const runtime = createClipboardRuntime();
  if (runtime.platform === "darwin") return runtime.run("pbpaste", []);
  if (runtime.platform === "win32") return readWindowsClipboard(runtime);

  const attempts: Array<() => string> = [];
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

  for (const attempt of attempts) {
    try {
      return attempt();
    } catch {
      // Try the next platform clipboard backend.
    }
  }
  throw new Error("Failed to read clipboard");
}

export async function readClipboardText(): Promise<string> {
  if (clipboardTextReaderForTesting) return clipboardTextReaderForTesting();
  return readClipboardTextSync();
}
