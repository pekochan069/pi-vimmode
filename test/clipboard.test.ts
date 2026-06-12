import { afterEach, describe, expect, test } from "bun:test";

import { readClipboardText, setClipboardRuntimeForTesting } from "../src/clipboard.ts";

describe("clipboard backends", () => {
  afterEach(() => {
    setClipboardRuntimeForTesting(undefined, undefined);
  });

  test("WSL reads Windows clipboard through win32yank before powershell.exe", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    setClipboardRuntimeForTesting(
      {
        platform: "linux",
        env: {},
        procVersion: "Linux version 6.18.26.1-microsoft-standard-WSL2",
      },
      (command, args) => {
        calls.push({ command, args });
        return "clip text\n";
      },
    );

    await expect(readClipboardText()).resolves.toBe("clip text\n");
    expect(calls).toEqual([{ command: "win32yank.exe", args: ["-o", "--lf"] }]);
  });

  test("WSL win32yank failure falls back to powershell.exe", async () => {
    const calls: string[] = [];
    setClipboardRuntimeForTesting(
      {
        platform: "linux",
        env: { WSL_DISTRO_NAME: "Ubuntu" },
        procVersion: "Linux version 6.18.26.1-microsoft-standard-WSL2",
      },
      (command) => {
        calls.push(command);
        if (command === "win32yank.exe") throw new Error("missing win32yank");
        if (command === "powershell.exe") return "clip text\r\n";
        throw new Error("unexpected backend");
      },
    );

    await expect(readClipboardText()).resolves.toBe("clip text\r\n");
    expect(calls).toEqual(["win32yank.exe", "powershell.exe"]);
  });

  test("WSL Windows clipboard failures fall through to Linux display clipboard backends", async () => {
    const calls: string[] = [];
    setClipboardRuntimeForTesting(
      {
        platform: "linux",
        env: { DISPLAY: ":0", WSL_DISTRO_NAME: "Ubuntu" },
        procVersion: "Linux version 6.18.26.1-microsoft-standard-WSL2",
      },
      (command) => {
        calls.push(command);
        if (command === "win32yank.exe") throw new Error("missing win32yank");
        if (command === "powershell.exe") throw new Error("missing powershell");
        if (command === "xclip") return "xclip text";
        throw new Error("unexpected backend");
      },
    );

    await expect(readClipboardText()).resolves.toBe("xclip text");
    expect(calls).toEqual(["win32yank.exe", "powershell.exe", "xclip"]);
  });
});
