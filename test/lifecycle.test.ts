import { describe, expect, test } from "bun:test";

import type { ResolvedVimEditorOptions, VimDiagnostics } from "../src/types.ts";

import {
  createVimConfigPlan,
  DEFAULT_VIM_OPTIONS,
  type VimConfigLoadResult,
} from "../src/config.ts";
import { registerVimLifecycle } from "../src/lifecycle.ts";

type HookName =
  | "session_start"
  | "resources_discover"
  | "agent_start"
  | "agent_end"
  | "session_shutdown";
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
  shutdownCalls: number;
  shutdown: () => void;
};

type FakeEditor = {
  options: ResolvedVimEditorOptions;
  diagnostics: VimDiagnostics;
  busyCalls: boolean[];
  resetCount: number;
  resetTerminalCursorStyle: () => void;
  setAgentBusy: (active: boolean) => void;
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
  const ctx: FakeContext = {
    cwd,
    ui: createUi(),
    shutdownCalls: 0,
    shutdown: () => {
      ctx.shutdownCalls += 1;
    },
  };
  return ctx;
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
  const shutdownCallbacks: Array<(() => void) | undefined> = [];
  const warnings: string[][] = [];
  const fatalLoads: boolean[] = [];
  const asyncLoads = new Set<number>();
  const rejectedLoads = new Set<number>();
  const deferredLoads = new Set<number>();
  const resolveDeferred = new Map<number, (result: VimConfigLoadResult) => void>();
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
      const load = loadIndex;
      const index = Math.min(load, options.length - 1);
      const option = options[index]!;
      const warning = warnings[Math.min(load, warnings.length - 1)] ?? [];
      const fatal = fatalLoads[load] ?? false;
      loadIndex += 1;
      if (rejectedLoads.has(load)) return Promise.reject(new Error("async load failed"));
      const result = {
        plan: createVimConfigPlan(option, warning),
        options: option,
        warnings: warning,
        fatal,
      };
      if (deferredLoads.has(load)) {
        return new Promise<VimConfigLoadResult>((resolve) => resolveDeferred.set(load, resolve));
      }
      return asyncLoads.has(load) ? Promise.resolve(result) : result;
    },
    createEditor: (_tui, _theme, _keybindings, editorOptions, diagnostics, vimOptions) => {
      shutdownCallbacks.push(vimOptions?.onShutdown);
      const editor: FakeEditor = {
        options: editorOptions,
        diagnostics,
        busyCalls: [],
        resetCount: 0,
        resetTerminalCursorStyle: () => {
          editor.resetCount += 1;
        },
        setAgentBusy: (active) => {
          editor.busyCalls.push(active);
        },
      };
      createdEditors.push(editor);
      return editor;
    },
    schedule: (callback) => {
      scheduled.push(callback);
    },
  });

  return {
    hooks,
    commands,
    scheduled,
    loadCalls,
    createdEditors,
    shutdownCallbacks,
    warnings,
    fatalLoads,
    asyncLoads,
    rejectedLoads,
    deferredLoads,
    resolveDeferred,
  };
}

describe("vim extension lifecycle", () => {
  test("registers Pi lifecycle hooks", () => {
    const { hooks } = createLifecycleHarness();

    expect([...hooks.keys()].sort()).toEqual([
      "agent_end",
      "agent_start",
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

  test("agent start marks existing editors busy without installing", () => {
    const { hooks, createdEditors, loadCalls } = createLifecycleHarness();
    const ctx = createContext("/repo");

    expect(() => hooks.get("agent_start")?.({}, ctx)).not.toThrow();
    expect(ctx.ui.setCalls).toEqual([]);
    expect(loadCalls).toEqual([]);

    hooks.get("agent_end")?.({}, ctx);
    const factory = ctx.ui.setCalls[0]!;
    const first = factory({}, {}, {});
    const second = factory({}, {}, {});

    hooks.get("agent_start")?.({}, ctx);

    expect(createdEditors).toEqual([first, second]);
    expect(first.busyCalls).toEqual([true]);
    expect(second.busyCalls).toEqual([true]);
    expect(ctx.ui.setCalls).toEqual([factory]);
  });

  test("editors created during agent busy state start busy", () => {
    const { hooks, createdEditors } = createLifecycleHarness();
    const ctx = createContext("/repo");

    hooks.get("agent_end")?.({}, ctx);
    const factory = ctx.ui.setCalls[0]!;
    hooks.get("agent_start")?.({}, ctx);
    factory({}, {}, {});

    expect(createdEditors[0]!.busyCalls).toEqual([true]);
  });

  test("agent end marks tracked editors idle while preserving install behavior", () => {
    const { hooks, createdEditors, loadCalls } = createLifecycleHarness();
    const ctx = createContext("/repo");

    hooks.get("agent_end")?.({}, ctx);
    const factory = ctx.ui.setCalls[0]!;
    factory({}, {}, {});
    hooks.get("agent_start")?.({}, ctx);
    hooks.get("agent_end")?.({}, ctx);

    expect(createdEditors[0]!.busyCalls).toEqual([true, false]);
    expect(ctx.ui.setCalls).toEqual([factory]);
    expect(loadCalls).toEqual([{ cwd: "/repo" }, { cwd: "/repo" }]);
  });

  test("uses public editor factory API without inspecting foreign wrappers", async () => {
    const { hooks, commands } = createLifecycleHarness();
    const ctx = createContext("/repo");
    const foreignFactory = (() => ({
      resetTerminalCursorStyle: () => {},
      setAgentBusy: () => {},
    })) as unknown as FakeEditorComponent;
    ctx.ui.component = foreignFactory;

    hooks.get("session_start")?.({}, ctx);
    expect(ctx.ui.component).not.toBe(foreignFactory);

    await commands.get("vimmode")?.handler("off", ctx);
    expect(ctx.ui.component).toBe(foreignFactory);
  });

  test("does not overwrite a foreign factory installed after Vim", async () => {
    const { hooks, commands } = createLifecycleHarness();
    const ctx = createContext("/repo");
    const foreignFactory = (() => ({
      resetTerminalCursorStyle: () => {},
      setAgentBusy: () => {},
    })) as unknown as FakeEditorComponent;

    hooks.get("session_start")?.({}, ctx);
    ctx.ui.component = foreignFactory;
    hooks.get("agent_end")?.({}, ctx);

    expect(ctx.ui.component).toBe(foreignFactory);
    await commands.get("vimmode")?.handler("off", ctx);
    expect(ctx.ui.component).toBe(foreignFactory);
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

  test("editor factory wires shutdown requests to ExtensionContext.shutdown", () => {
    const { hooks, shutdownCallbacks } = createLifecycleHarness();
    const ctx = createContext("/repo");

    hooks.get("agent_end")?.({}, ctx);
    const factory = ctx.ui.setCalls[0]!;
    factory({}, {}, {});

    shutdownCallbacks[0]?.();

    expect(ctx.shutdownCalls).toBe(1);
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

  test("fatal first load commits its usable JSON-backed plan", () => {
    const { hooks, fatalLoads, warnings, createdEditors } = createLifecycleHarness([
      { ...DEFAULT_VIM_OPTIONS, startMode: "normal" },
    ]);
    fatalLoads.push(true);
    warnings.push(["fatal JS config"]);
    const ctx = createContext("/repo");

    hooks.get("agent_end")?.({}, ctx);
    ctx.ui.setCalls[0]!({}, {}, {});

    expect(createdEditors[0]?.options.startMode).toBe("normal");
    expect(createdEditors[0]?.diagnostics.warnings).toEqual(["fatal JS config"]);
    expect(ctx.ui.statuses.at(-1)).toEqual(["pi-vimmode", "vim ⚠"]);
  });

  test("async loads commit success and preserve it after rejection", async () => {
    const { hooks, asyncLoads, rejectedLoads, createdEditors } = createLifecycleHarness([
      { ...DEFAULT_VIM_OPTIONS, startMode: "normal" },
      DEFAULT_VIM_OPTIONS,
    ]);
    asyncLoads.add(0);
    rejectedLoads.add(1);
    const ctx = createContext("/repo");

    hooks.get("agent_end")?.({}, ctx);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const factory = ctx.ui.setCalls[0]!;
    factory({}, {}, {});

    hooks.get("agent_end")?.({}, ctx);
    await new Promise((resolve) => setTimeout(resolve, 0));
    factory({}, {}, {});

    expect(createdEditors.map((editor) => editor.options.startMode)).toEqual(["normal", "normal"]);
    expect(createdEditors[1]?.diagnostics.warnings).toEqual([
      "global JS config: failed to load (async load failed)",
    ]);
    expect(ctx.ui.statuses.at(-1)).toEqual(["pi-vimmode", "vim ⚠"]);
  });

  test("newer async refresh stays authoritative when loads resolve out of order", async () => {
    const normal = { ...DEFAULT_VIM_OPTIONS, startMode: "normal" as const };
    const insert = { ...DEFAULT_VIM_OPTIONS, startMode: "insert" as const };
    const { hooks, deferredLoads, resolveDeferred, createdEditors } = createLifecycleHarness([
      normal,
      insert,
    ]);
    deferredLoads.add(0).add(1);
    const ctx = createContext("/repo");

    hooks.get("agent_end")?.({}, ctx);
    hooks.get("agent_end")?.({}, ctx);
    resolveDeferred.get(1)?.({
      plan: createVimConfigPlan(insert, []),
      options: insert,
      warnings: [],
      fatal: false,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    resolveDeferred.get(0)?.({
      plan: createVimConfigPlan(normal, []),
      options: normal,
      warnings: [],
      fatal: false,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    ctx.ui.component?.({}, {}, {});
    expect(createdEditors[0]?.options.startMode).toBe("insert");
  });

  test("stale async refresh cannot install into an older context", async () => {
    const { hooks, deferredLoads, resolveDeferred, shutdownCallbacks } = createLifecycleHarness();
    deferredLoads.add(0).add(1);
    const older = createContext("/older");
    const newer = createContext("/newer");

    hooks.get("agent_end")?.({}, older);
    hooks.get("agent_end")?.({}, newer);
    const result = {
      plan: createVimConfigPlan(DEFAULT_VIM_OPTIONS, []),
      options: DEFAULT_VIM_OPTIONS,
      warnings: [],
      fatal: false,
    };
    resolveDeferred.get(1)?.(result);
    await new Promise((resolve) => setTimeout(resolve, 0));
    resolveDeferred.get(0)?.(result);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(older.ui.component).toBeUndefined();
    newer.ui.component?.({}, {}, {});
    shutdownCallbacks[0]?.();
    expect(older.shutdownCalls).toBe(0);
    expect(newer.shutdownCalls).toBe(1);
  });

  test("async install cannot reactivate editor after vimmode off", async () => {
    const { hooks, commands, deferredLoads, resolveDeferred } = createLifecycleHarness();
    deferredLoads.add(0);
    const ctx = createContext("/repo");

    hooks.get("agent_end")?.({}, ctx);
    await commands.get("vimmode")?.handler("off", ctx);
    resolveDeferred.get(0)?.({
      plan: createVimConfigPlan(DEFAULT_VIM_OPTIONS, []),
      options: DEFAULT_VIM_OPTIONS,
      warnings: [],
      fatal: false,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctx.ui.component).toBeUndefined();
    expect(ctx.ui.statuses.at(-1)).toEqual(["pi-vimmode", "vim off"]);
  });

  test("fatal reload updates diagnostics but preserves last-known-good options", () => {
    const { hooks, fatalLoads, warnings, createdEditors } = createLifecycleHarness();
    fatalLoads.push(false, true);
    warnings.push([], ["fatal JS config"]);
    const ctx = createContext("/repo");

    hooks.get("agent_end")?.({}, ctx);
    const factory = ctx.ui.setCalls[0]!;
    factory({}, {}, {});
    hooks.get("agent_end")?.({}, ctx);
    factory({}, {}, {});

    expect(createdEditors.map((editor) => editor.options.startMode)).toEqual(["insert", "insert"]);
    expect(createdEditors.map((editor) => editor.diagnostics.warnings)).toEqual([
      [],
      ["fatal JS config"],
    ]);
    expect(ctx.ui.statuses.at(-1)).toEqual(["pi-vimmode", "vim ⚠"]);
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
    hooks.get("agent_start")?.({}, ctx);

    hooks.get("session_shutdown")?.({}, ctx);
    hooks.get("session_shutdown")?.({}, ctx);

    expect(createdEditors.map((editor) => editor.busyCalls)).toEqual([[true], [true]]);
    expect(createdEditors.map((editor) => editor.resetCount)).toEqual([1, 1]);
  });

  test("vimmode command reloads options without toggling", async () => {
    const { hooks, commands, createdEditors, loadCalls } = createLifecycleHarness();
    const ctx = createContext("/repo");

    hooks.get("session_start")?.({}, ctx);
    const factory = ctx.ui.setCalls[0]!;
    factory({}, {}, {});

    await commands.get("vimmode")?.handler("reload", ctx);
    factory({}, {}, {});

    expect(loadCalls).toEqual([{ cwd: "/repo" }, { cwd: "/repo" }]);
    expect(ctx.ui.component).toBe(factory);
    expect(ctx.ui.notifications.at(-1)).toEqual(["pi-vimmode reloaded", "info"]);
    expect(createdEditors.map((editor) => editor.options.startMode)).toEqual(["insert", "normal"]);
  });

  test("vimmode reload stays disabled after refreshing options", async () => {
    const { hooks, commands, loadCalls } = createLifecycleHarness();
    const ctx = createContext("/repo");

    hooks.get("session_start")?.({}, ctx);
    await commands.get("vimmode")?.handler("off", ctx);
    await commands.get("vimmode")?.handler("reload", ctx);

    expect(loadCalls).toEqual([{ cwd: "/repo" }, { cwd: "/repo" }]);
    expect(ctx.ui.component).toBeUndefined();
    expect(ctx.ui.notifications.at(-1)).toEqual(["pi-vimmode config reloaded (disabled)", "info"]);
  });

  test("stale vimmode reload cannot reinstall an older context", async () => {
    const { hooks, commands, deferredLoads, resolveDeferred, shutdownCallbacks } =
      createLifecycleHarness();
    const older = createContext("/older");
    const newer = createContext("/newer");

    hooks.get("session_start")?.({}, older);
    deferredLoads.add(1);
    const reload = commands.get("vimmode")?.handler("reload", older);
    hooks.get("agent_end")?.({}, newer);
    resolveDeferred.get(1)?.({
      plan: createVimConfigPlan(DEFAULT_VIM_OPTIONS, []),
      options: DEFAULT_VIM_OPTIONS,
      warnings: [],
      fatal: false,
    });
    await reload;

    newer.ui.component?.({}, {}, {});
    shutdownCallbacks[0]?.();
    expect(older.shutdownCalls).toBe(0);
    expect(newer.shutdownCalls).toBe(1);
    expect(older.ui.notifications).toEqual([]);
  });

  test("vimmode command toggles editor off and on", async () => {
    const { hooks, commands, createdEditors } = createLifecycleHarness();
    const ctx = createContext("/repo");

    hooks.get("agent_end")?.({}, ctx);
    const factory = ctx.ui.setCalls[0]!;
    factory({}, {}, {});
    hooks.get("agent_start")?.({}, ctx);

    await commands.get("vimmode")?.handler("", ctx);

    expect(createdEditors[0]!.busyCalls).toEqual([true]);
    expect(createdEditors[0]!.resetCount).toBe(1);
    expect(ctx.ui.component).toBeUndefined();
    expect(ctx.ui.statuses.at(-1)).toEqual(["pi-vimmode", "vim off"]);
    expect(ctx.ui.notifications.at(-1)).toEqual(["pi-vimmode disabled", "info"]);

    hooks.get("session_shutdown")?.({}, ctx);
    expect(createdEditors[0]!.resetCount).toBe(1);

    await commands.get("vimmode")?.handler("", ctx);

    expect(ctx.ui.component).toBe(factory);
    expect(ctx.ui.statuses.at(-1)).toEqual(["pi-vimmode", "vim"]);
    expect(ctx.ui.notifications.at(-1)).toEqual(["pi-vimmode enabled", "info"]);
  });
});
