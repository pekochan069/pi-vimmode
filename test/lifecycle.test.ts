import { describe, expect, test } from "bun:test";

import type { ResolvedVimEditorOptions, VimDiagnostics } from "../src/types.ts";

import { DEFAULT_VIM_OPTIONS } from "../src/config.ts";
import { registerVimLifecycle } from "../src/lifecycle.ts";

type HookName = "session_start" | "resources_discover" | "agent_end" | "session_shutdown";
type Hook = (event: unknown, ctx: FakeContext) => void;
type Command = {
  description: string;
  handler: (args: string, ctx: FakeContext) => Promise<void> | void;
};

type FakeEditorComponent = (...args: unknown[]) => FakeEditor;

type FakeUi = {
  component?: FakeEditorComponent;
  setCalls: Array<FakeEditorComponent | undefined>;
  statuses: Array<[string, string]>;
  notifications: Array<[string, string]>;
  getEditorComponent: () => FakeEditorComponent | undefined;
  setEditorComponent: (component: FakeEditorComponent | undefined) => void;
  setStatus: (key: string, value: string) => void;
  notify: (message: string, level: string) => void;
};

type FakeContext = {
  cwd: string;
  ui: FakeUi;
};

type FakeEditor = {
  options: ResolvedVimEditorOptions;
  diagnostics: VimDiagnostics;
  resetCount: number;
  resetTerminalCursorStyle: () => void;
};

function createUi(): FakeUi {
  const ui: FakeUi = {
    setCalls: [],
    statuses: [],
    notifications: [],
    getEditorComponent: () => ui.component,
    setEditorComponent: (component) => {
      ui.component = component;
      ui.setCalls.push(component);
    },
    setStatus: (key, value) => {
      ui.statuses.push([key, value]);
    },
    notify: (message, level) => {
      ui.notifications.push([message, level]);
    },
  };
  return ui;
}

function createContext(cwd = "/workspace"): FakeContext {
  return { cwd, ui: createUi() };
}

function createLifecycleHarness(
  options: ResolvedVimEditorOptions[] = [
    DEFAULT_VIM_OPTIONS,
    { ...DEFAULT_VIM_OPTIONS, startMode: "normal" },
  ],
) {
  const hooks = new Map<HookName, Hook>();
  const commands = new Map<string, Command>();
  const scheduled: Array<() => void> = [];
  const loadCalls: Array<{ cwd?: string }> = [];
  const createdEditors: FakeEditor[] = [];
  const warnings: string[][] = [];
  let loadIndex = 0;

  const pi = {
    on: (name: HookName, hook: Hook) => {
      hooks.set(name, hook);
    },
    registerCommand: (name: string, command: Command) => {
      commands.set(name, command);
    },
  };

  registerVimLifecycle(pi as never, {
    loadOptions: (paths) => {
      loadCalls.push(paths);
      const option = options[Math.min(loadIndex, options.length - 1)]!;
      const warning = warnings[Math.min(loadIndex, warnings.length - 1)] ?? [];
      loadIndex += 1;
      return { options: option, warnings: warning };
    },
    createEditor: (_tui, _theme, _keybindings, editorOptions, diagnostics) => {
      const editor: FakeEditor = {
        options: editorOptions,
        diagnostics,
        resetCount: 0,
        resetTerminalCursorStyle: () => {
          editor.resetCount += 1;
        },
      };
      createdEditors.push(editor);
      return editor;
    },
    schedule: (callback) => {
      scheduled.push(callback);
    },
  });

  return { hooks, commands, scheduled, loadCalls, createdEditors, warnings };
}

describe("vim extension lifecycle", () => {
  test("registers Pi lifecycle hooks", () => {
    const { hooks } = createLifecycleHarness();

    expect([...hooks.keys()].sort()).toEqual([
      "agent_end",
      "resources_discover",
      "session_shutdown",
      "session_start",
    ]);
  });

  test("session start installs immediately and schedules one delayed reinstall", () => {
    const { hooks, scheduled, loadCalls } = createLifecycleHarness();
    const ctx = createContext("/repo");

    hooks.get("session_start")?.({}, ctx);

    expect(ctx.ui.setCalls).toHaveLength(1);
    expect(ctx.ui.statuses).toEqual([["pi-vimmode", "vim"]]);
    expect(scheduled).toHaveLength(1);
    expect(loadCalls).toEqual([{ cwd: "/repo" }]);
  });

  test("resource discovery installs immediately and schedules one delayed reinstall", () => {
    const { hooks, scheduled, loadCalls } = createLifecycleHarness();
    const ctx = createContext("/repo");

    hooks.get("resources_discover")?.({}, ctx);

    expect(ctx.ui.setCalls).toHaveLength(1);
    expect(scheduled).toHaveLength(1);
    expect(loadCalls).toEqual([{ cwd: "/repo" }]);
  });

  test("agent end installs immediately without delayed reinstall", () => {
    const { hooks, scheduled, loadCalls } = createLifecycleHarness();
    const ctx = createContext("/repo");

    hooks.get("agent_end")?.({}, ctx);

    expect(ctx.ui.setCalls).toHaveLength(1);
    expect(scheduled).toHaveLength(0);
    expect(loadCalls).toEqual([{ cwd: "/repo" }]);
  });

  test("stable factory avoids component churn", () => {
    const { hooks } = createLifecycleHarness();
    const ctx = createContext("/repo");

    hooks.get("agent_end")?.({}, ctx);
    const factory = ctx.ui.setCalls[0]!;
    hooks.get("agent_end")?.({}, ctx);

    expect(ctx.ui.setCalls).toEqual([factory]);
    expect(ctx.ui.statuses).toEqual([
      ["pi-vimmode", "vim"],
      ["pi-vimmode", "vim"],
    ]);
  });

  test("multiple installs reuse one editor factory reference", () => {
    const { hooks } = createLifecycleHarness();
    const ctx = createContext("/repo");

    hooks.get("agent_end")?.({}, ctx);
    ctx.ui.component = undefined;
    hooks.get("agent_end")?.({}, ctx);

    expect(ctx.ui.setCalls).toHaveLength(2);
    expect(ctx.ui.setCalls[0]).toBe(ctx.ui.setCalls[1]);
  });

  test("settings refresh updates status and new editor options", () => {
    const { hooks, warnings, createdEditors, loadCalls } = createLifecycleHarness();
    warnings.push([], ["bad config"]);
    const ctx = createContext("/repo");

    hooks.get("agent_end")?.({}, ctx);
    const factory = ctx.ui.setCalls[0]!;
    factory({}, {}, {});
    hooks.get("agent_end")?.({}, ctx);
    factory({}, {}, {});

    expect(loadCalls).toEqual([{ cwd: "/repo" }, { cwd: "/repo" }]);
    expect(ctx.ui.statuses).toEqual([
      ["pi-vimmode", "vim"],
      ["pi-vimmode", "vim ⚠"],
    ]);
    expect(createdEditors.map((editor) => editor.options.startMode)).toEqual(["insert", "normal"]);
    expect(createdEditors.map((editor) => editor.diagnostics.warnings)).toEqual([
      [],
      ["bad config"],
    ]);
  });

  test("delayed reinstall refreshes settings and catches stale context failures", () => {
    const { hooks, scheduled, loadCalls } = createLifecycleHarness();
    const ctx = createContext("/repo");

    hooks.get("session_start")?.({}, ctx);
    scheduled[0]!();

    expect(loadCalls).toEqual([{ cwd: "/repo" }, { cwd: "/repo" }]);

    let failStatus = false;
    ctx.ui.setStatus = () => {
      if (failStatus) throw new Error("stale context");
    };
    hooks.get("session_start")?.({}, ctx);
    failStatus = true;

    expect(() => scheduled[1]!()).not.toThrow();
  });

  test("immediate install failures surface", () => {
    const { hooks } = createLifecycleHarness();
    const ctx = createContext("/repo");
    ctx.ui.setStatus = () => {
      throw new Error("startup failed");
    };

    expect(() => hooks.get("agent_end")?.({}, ctx)).toThrow("startup failed");
  });

  test("session shutdown resets tracked editors once and tolerates none", () => {
    const { hooks, createdEditors } = createLifecycleHarness();
    const ctx = createContext("/repo");

    expect(() => hooks.get("session_shutdown")?.({}, ctx)).not.toThrow();

    hooks.get("agent_end")?.({}, ctx);
    const factory = ctx.ui.setCalls[0]!;
    factory({}, {}, {});
    factory({}, {}, {});

    hooks.get("session_shutdown")?.({}, ctx);
    hooks.get("session_shutdown")?.({}, ctx);

    expect(createdEditors.map((editor) => editor.resetCount)).toEqual([1, 1]);
  });

  test("vimmode command toggles editor off and on", async () => {
    const { hooks, commands } = createLifecycleHarness();
    const ctx = createContext("/repo");

    hooks.get("agent_end")?.({}, ctx);
    const factory = ctx.ui.setCalls[0]!;

    await commands.get("vimmode")?.handler("", ctx);

    expect(ctx.ui.component).toBeUndefined();
    expect(ctx.ui.statuses.at(-1)).toEqual(["pi-vimmode", "vim off"]);
    expect(ctx.ui.notifications.at(-1)).toEqual(["pi-vimmode disabled", "info"]);

    await commands.get("vimmode")?.handler("", ctx);

    expect(ctx.ui.component).toBe(factory);
    expect(ctx.ui.statuses.at(-1)).toEqual(["pi-vimmode", "vim"]);
    expect(ctx.ui.notifications.at(-1)).toEqual(["pi-vimmode enabled", "info"]);
  });
});
