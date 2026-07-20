import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadVimJsConfig } from "../src/config-js.ts";
import { loadVimOptions, resolveVimOptions } from "../src/config.ts";

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "pi-vimmode-js-config-"));
  const path = join(dir, "pi-vimmode.config.js");
  return {
    path,
    write: (content: string) => writeFileSync(path, content),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function operations(result: Awaited<ReturnType<typeof loadVimJsConfig>>) {
  expect(result.kind).toBe("success");
  if (result.kind !== "success") throw new Error("expected successful JS config");
  return result.operations;
}

describe("vim JS config loading", () => {
  test("missing JS config is quiet", async () => {
    const result = await loadVimJsConfig(join(tmpdir(), "missing-pi-vimmode.config.js"));
    expect(result).toEqual({ kind: "missing", warnings: [] });
  });

  test("loads vim.prompt builtins through string keybindings", async () => {
    const f = fixture();
    try {
      f.write(`
export default (vim) => {
  vim.keymap.set("i", "<A-w>", vim.prompt.deleteWordBackward());
  vim.keymap.set("n", "zq", vim.prompt.reflow({ width: 88 }));
  vim.keymap.set("v", "z>", vim.prompt.quote());
};
`);
      const result = await loadVimJsConfig(f.path);
      expect(result.warnings).toEqual([]);
      expect(operations(result)).toEqual([
        { kind: "map", mapping: { kind: "insert", action: "deleteWordBackward", key: "alt+w" } },
        {
          kind: "map",
          mapping: {
            kind: "action",
            actionId: "prompt.transform.reflow",
            key: "zq",
            args: { width: 88 },
            modes: ["normal"],
          },
        },
        {
          kind: "map",
          mapping: {
            kind: "action",
            actionId: "prompt.transform.quote",
            key: "z>",
            modes: ["visual", "visualLine", "visualBlock"],
          },
        },
      ]);
    } finally {
      f.cleanup();
    }
  });

  test("vim.g.mapleader uses final assignment for leader lhs without expanding rhs", async () => {
    const f = fixture();
    try {
      f.write(`
export default (vim) => {
  vim.g.mapleader = ",";
  vim.keymap.set("n", "<Leader>q", vim.prompt.quote());
  vim.g.mapleader = " ";
  vim.keymap.set("n", "<leader>r", vim.prompt.reflow());
  vim.keymap.set("n", "<leader>x", "<leader>");
};
`);
      const loaded = await loadVimJsConfig(f.path);
      expect(loaded.warnings).toEqual([]);
      expect(operations(loaded)).toEqual([
        { kind: "leaf", path: "leader", value: "," },
        {
          kind: "map",
          mapping: {
            kind: "action",
            actionId: "prompt.transform.quote",
            key: "<leader>q",
            args: undefined,
            modes: ["normal"],
          },
        },
        { kind: "leaf", path: "leader", value: " " },
        {
          kind: "map",
          mapping: {
            kind: "action",
            actionId: "prompt.transform.reflow",
            key: "<leader>r",
            args: {},
            modes: ["normal"],
          },
        },
        {
          kind: "map",
          mapping: { kind: "remap", key: "<leader>x", inputs: ["leader"], modes: ["normal"] },
        },
      ]);

      const resolved = resolveVimOptions(undefined, undefined, loaded);
      expect(resolved.options.leader).toBe(" ");
      expect(resolved.options.keymap?.actions.accepted.map((binding) => binding.key)).toEqual([
        " q",
        " r",
      ]);
      expect(resolved.options.keymap?.remaps.accepted).toEqual([
        { key: " x", inputs: ["leader"], modes: ["normal"] },
      ]);
    } finally {
      f.cleanup();
    }
  });

  test("invalid and null vim.g.mapleader assignments are field-local", async () => {
    const f = fixture();
    try {
      f.write(`
export default (vim) => {
  vim.g.mapleader = ",";
  vim.g.mapleader = "too-long";
  if (vim.g.mapleader !== ",") throw new Error("invalid write replaced staged leader");
  vim.keymap.set("n", "<leader>q", vim.prompt.quote());
  vim.g.mapleader = null;
};
`);
      const loaded = await loadVimJsConfig(f.path);
      expect(operations(loaded).at(-1)).toEqual({ kind: "leaf", path: "leader", value: null });
      expect(loaded.warnings).toEqual([
        "global JS config: vim.g.mapleader must be one printable character or null",
      ]);
      const resolved = resolveVimOptions(undefined, undefined, loaded);
      expect(resolved.options.leader).toBeUndefined();
      expect(resolved.options.keymap?.leader).toBeUndefined();
      expect(resolved.options.keymap?.actions.accepted).toEqual([]);
    } finally {
      f.cleanup();
    }
  });

  test("JS leader additions stay raw through project override and clear", () => {
    const jsConfig = {
      appendKeymap: true,
      warnings: [],
      partial: {
        leader: ",",
        keymap: {
          actions: {
            "prompt.transform.reflow": [{ key: "<leader>j" }],
          },
        },
      },
    };
    const moved = resolveVimOptions(
      {
        piVimMode: {
          leader: ",",
          keymap: { actions: { "prompt.transform.reflow": ["<leader>g"] } },
        },
      },
      { piVimMode: { leader: " " } },
      jsConfig,
    );
    expect(moved.options.keymap?.actions.accepted.map((binding) => binding.key)).toEqual([
      " g",
      " j",
    ]);

    const cleared = resolveVimOptions(
      {
        piVimMode: {
          leader: ",",
          keymap: { actions: { "prompt.transform.reflow": ["<leader>g"] } },
        },
      },
      { piVimMode: { leader: null, keymap: { actions: { "prompt.transform.reflow": [] } } } },
      jsConfig,
    );
    expect(cleared.options.keymap?.actions.accepted).toEqual([]);
    expect(cleared.options.keymap?.leader).toBeUndefined();
  });

  test("builder mappings add to existing preset bindings instead of replacing them", () => {
    const result = resolveVimOptions(
      { piVimMode: { keymap: { actionPresets: ["paragraph-editing"] } } },
      undefined,
      {
        appendKeymap: true,
        warnings: [],
        partial: {
          keymap: {
            actions: {
              "prompt.transform.reflow": [{ key: "zq" }],
            },
          },
        },
      },
    );

    const reflowKeys = result.options.keymap?.actions.accepted
      .filter((binding) => binding.actionId === "prompt.transform.reflow")
      .map((binding) => binding.key);
    expect(result.warnings).toEqual([]);
    expect(reflowKeys).toEqual(["gq", "zq"]);
  });

  test("project JSON can override JS string remaps", () => {
    const result = resolveVimOptions(
      undefined,
      { piVimMode: { keymap: { commands: { insertBefore: ["z"] } } } },
      {
        appendKeymap: true,
        warnings: [],
        partial: {
          keymap: {
            remaps: { accepted: [{ key: "z", inputs: ["l"], modes: ["normal"] }] },
          },
        },
      },
    );

    expect(result.options.keymap?.remaps.accepted).toEqual([]);
    expect(result.options.keymap?.commands.insertBefore).toEqual(["z"]);
  });

  test("project exact action replaces inherited JS remap", () => {
    const result = resolveVimOptions(
      undefined,
      {
        piVimMode: {
          keymap: { actions: { "prompt.transform.quote": [{ key: "zq", modes: ["normal"] }] } },
        },
      },
      {
        kind: "success",
        warnings: [],
        operations: [
          {
            kind: "map",
            mapping: { kind: "remap", key: "zq", inputs: ["l"], modes: ["normal"] },
          },
        ],
      },
    );

    expect(result.options.keymap?.remaps.accepted).toEqual([]);
    expect(result.plan.scopes.normal.exact.zq?.id).toBe("prompt.transform.quote");
  });

  test("later JS remap replaces lower action in only claimed scopes", () => {
    const result = resolveVimOptions(
      {
        piVimMode: {
          keymap: {
            actions: {
              "prompt.transform.quote": [{ key: "zq", modes: ["normal", "visual"] }],
            },
          },
        },
      },
      undefined,
      {
        kind: "success",
        warnings: [],
        operations: [
          {
            kind: "map",
            mapping: { kind: "remap", key: "zq", inputs: ["l"], modes: ["normal"] },
          },
        ],
      },
    );

    expect(result.plan.scopes.normal.exact.zq?.kind).toBe("remap");
    expect(result.plan.scopes.visual.exact.zq?.kind).toBe("action");
    expect(result.options.keymap?.actions.accepted).toEqual([
      expect.objectContaining({ actionId: "prompt.transform.quote", modes: ["visual"] }),
    ]);
    expect(result.options.keymap?.remaps.accepted).toEqual([
      { key: "zq", inputs: ["l"], modes: ["normal"] },
    ]);
  });

  test("action bindings on same key survive in disjoint modes", () => {
    const result = resolveVimOptions(undefined, undefined, {
      appendKeymap: true,
      warnings: [],
      partial: {
        keymap: {
          actions: {
            "prompt.transform.quote": [{ key: "zq", modes: ["normal"] }],
            "prompt.transform.unquote": [{ key: "zq", modes: ["visual"] }],
          },
        },
      },
    });

    expect(result.warnings).toEqual([]);
    expect(result.options.keymap?.actions.accepted).toEqual([
      {
        actionId: "prompt.transform.quote",
        key: "zq",
        args: { action: "quote" },
        modes: ["normal"],
      },
      {
        actionId: "prompt.transform.unquote",
        key: "zq",
        args: { action: "unquote" },
        modes: ["visual"],
      },
    ]);
  });

  test("plan preflights remap strict-prefix conflicts in concrete scope", () => {
    const result = resolveVimOptions(
      { piVimMode: { keymap: { commands: { undo: ["za"] } } } },
      undefined,
      {
        kind: "success",
        warnings: [],
        operations: [
          {
            kind: "map",
            mapping: {
              kind: "remap",
              key: "zab",
              inputs: ["l"],
              modes: ["normal", "visual"],
            },
          },
        ],
      },
    );

    expect(result.plan.scopes.normal.exact.za?.id).toBe("command.undo");
    expect(result.plan.scopes.normal.exact.zab).toBeUndefined();
    expect(result.plan.scopes.visual.exact.zab?.kind).toBe("remap");
    expect(result.options.keymap?.remaps.accepted).toEqual([
      { key: "zab", inputs: ["l"], modes: ["visual"] },
    ]);
    expect(result.warnings).toEqual([
      expect.stringContaining("remap.zab in normal: strict-prefix conflict with command.undo.za"),
    ]);
  });

  test("printable plus sequences participate in strict-prefix preflight", () => {
    const result = resolveVimOptions(
      { piVimMode: { keymap: { commands: { undo: ["g+"] } } } },
      undefined,
      {
        kind: "success",
        warnings: [],
        operations: [
          {
            kind: "map",
            mapping: { kind: "remap", key: "g+x", inputs: ["l"], modes: ["normal"] },
          },
        ],
      },
    );

    expect(result.plan.scopes.normal.exact["g+"]?.id).toBe("command.undo");
    expect(result.plan.scopes.normal.exact["g+x"]).toBeUndefined();
    expect(result.plan.scopes.normal.prefixes["g+"]).toBeUndefined();
    expect(result.warnings).toEqual([
      expect.stringContaining("remap.g+x in normal: strict-prefix conflict with command.undo.g+"),
    ]);
  });

  test("latest same-scope JS exact mapping wins", () => {
    const result = resolveVimOptions(undefined, undefined, {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "action",
            actionId: "prompt.transform.quote",
            key: "zq",
            modes: ["normal"],
          },
        },
        {
          kind: "map",
          mapping: {
            kind: "action",
            actionId: "prompt.transform.reflow",
            key: "zq",
            args: {},
            modes: ["normal"],
          },
        },
      ],
    });

    expect(result.warnings).toEqual([]);
    expect(result.options.keymap?.actions.accepted).toEqual([
      {
        actionId: "prompt.transform.reflow",
        key: "zq",
        args: { action: "reflow" },
        modes: ["normal"],
      },
    ]);
    expect(result.plan.scopes.normal.exact.zq?.id).toBe("prompt.transform.reflow");
  });

  test("project leader actions override lower JS remaps after final expansion", () => {
    const result = resolveVimOptions(
      undefined,
      {
        piVimMode: {
          leader: ",",
          keymap: {
            actions: { "prompt.transform.quote": [{ key: "<leader>u", modes: ["normal"] }] },
          },
        },
      },
      {
        kind: "success",
        warnings: [],
        operations: [
          {
            kind: "map",
            mapping: { kind: "remap", key: ",u", inputs: ["l"], modes: ["normal"] },
          },
        ],
      },
    );

    expect(result.options.keymap?.remaps.accepted).toEqual([]);
    expect(result.plan.scopes.normal.exact[",u"]?.id).toBe("prompt.transform.quote");
  });

  test("project escape mappings override lower JS mappings in escape scopes", () => {
    const result = resolveVimOptions(
      undefined,
      { piVimMode: { keymap: { escape: ["<D-j>"] } } },
      {
        kind: "success",
        warnings: [],
        operations: [
          {
            kind: "map",
            mapping: {
              kind: "remap",
              key: "super+j",
              inputs: ["l"],
              modes: ["visual", "visualLine", "visualBlock"],
            },
          },
          {
            kind: "map",
            mapping: { kind: "insert", action: "openLineBelow", key: "super+j" },
          },
        ],
      },
    );

    expect(result.options.keymap?.remaps.accepted).toEqual([]);
    expect(result.options.keymap?.insert.openLineBelow).not.toContain("super+j");
    for (const scope of ["insert", "visual", "visualLine", "visualBlock"] as const) {
      expect(result.plan.scopes[scope].exact["super+j"]?.kind).toBe("escape");
    }
  });

  test("invalid remap modes are dropped", () => {
    const result = resolveVimOptions(undefined, undefined, {
      appendKeymap: true,
      warnings: [],
      partial: {
        keymap: {
          remaps: {
            accepted: [{ key: "zz", inputs: ["l"], modes: ["insert" as never] }],
          },
        },
      },
    });

    expect(result.options.keymap?.remaps.accepted).toEqual([]);
  });

  test("project JSON can still clear JS-added bindings", () => {
    const result = resolveVimOptions(
      undefined,
      { piVimMode: { keymap: { actions: { "prompt.transform.reflow": [] } } } },
      {
        appendKeymap: true,
        warnings: [],
        partial: {
          keymap: {
            actions: {
              "prompt.transform.reflow": [{ key: "zq" }],
            },
          },
        },
      },
    );

    expect(result.options.keymap?.actions.accepted).toEqual([]);
  });

  test("string rhs maps to replayed key inputs", async () => {
    const f = fixture();
    try {
      f.write(`
export default (vim) => {
  vim.keymap.set("n", "zz", "llll");
  vim.keymap.set("n", "ZD", ":vimdoctor<CR>");
  vim.keymap.set("n", "ZE", "i<Esc><Tab>");
};
`);
      const result = await loadVimJsConfig(f.path);
      expect(operations(result)).toEqual([
        {
          kind: "map",
          mapping: { kind: "remap", key: "zz", inputs: ["l", "l", "l", "l"], modes: ["normal"] },
        },
        {
          kind: "map",
          mapping: {
            kind: "remap",
            key: "ZD",
            inputs: [":", "v", "i", "m", "d", "o", "c", "t", "o", "r", "\r"],
            modes: ["normal"],
          },
        },
        {
          kind: "map",
          mapping: { kind: "remap", key: "ZE", inputs: ["i", "\x1b", "\t"], modes: ["normal"] },
        },
      ]);
      expect(result.warnings).toEqual([]);
    } finally {
      f.cleanup();
    }
  });

  test("protected lhs warns without registering", async () => {
    const f = fixture();
    try {
      f.write(`
export default (vim) => {
  vim.g.mapleader = ",";
  vim.keymap.set("n", "<C-p>", "j");
  vim.keymap.set("n", "<leader><C-p>", vim.prompt.quote());
};
`);
      const result = await loadVimJsConfig(f.path);
      expect(operations(result)).toEqual([{ kind: "leaf", path: "leader", value: "," }]);
      expect(result.warnings).toEqual([
        expect.stringContaining("keymap lhs contains protected key ctrl+p"),
        expect.stringContaining("keymap lhs contains protected key ctrl+p"),
      ]);
    } finally {
      f.cleanup();
    }
  });

  test("invalid default export and rhs warn without throwing", async () => {
    const f = fixture();
    try {
      f.write(`export default (vim) => vim.keymap.set("i", "aa", "bb");`);
      const result = await loadVimJsConfig(f.path);
      expect(operations(result)).toEqual([]);
      expect(result.warnings).toEqual([
        "global JS config: string rhs keymaps only support normal and visual modes",
      ]);
    } finally {
      f.cleanup();
    }
  });

  test("unknown leaf writes warn without discarding valid staged siblings", async () => {
    const f = fixture();
    try {
      f.write(`
export default (vim) => {
  vim.g.mapleader = ",";
  vim.g.unknown = true;
  vim.keymap.set("n", "zq", vim.prompt.quote());
};
`);
      const loaded = await loadVimJsConfig(f.path);
      expect(loaded.warnings).toEqual(["global JS config: unknown vim.g property unknown"]);
      expect(operations(loaded)).toEqual([
        { kind: "leaf", path: "leader", value: "," },
        {
          kind: "map",
          mapping: {
            kind: "action",
            actionId: "prompt.transform.quote",
            key: "zq",
            args: undefined,
            modes: ["normal"],
          },
        },
      ]);
    } finally {
      f.cleanup();
    }
  });

  test("stages preset and scoped unmap operations in source order", async () => {
    const f = fixture();
    try {
      f.write(`
export default (vim) => {
  vim.preset = "minimal";
  vim.g.mapleader = ",";
  vim.keymap.set("n", "zq", vim.prompt.quote());
  vim.keymap.set("v", "zq", vim.prompt.reflow());
  vim.keymap.set("n", "zq", null);
};
`);
      const loaded = await loadVimJsConfig(f.path);
      expect(operations(loaded)).toEqual([
        { kind: "preset", preset: "minimal" },
        { kind: "leaf", path: "leader", value: "," },
        {
          kind: "map",
          mapping: {
            kind: "action",
            actionId: "prompt.transform.quote",
            key: "zq",
            args: undefined,
            modes: ["normal"],
          },
        },
        {
          kind: "map",
          mapping: {
            kind: "action",
            actionId: "prompt.transform.reflow",
            key: "zq",
            args: {},
            modes: ["visual", "visualLine", "visualBlock"],
          },
        },
        { kind: "unmap", key: "zq", modes: ["normal"] },
      ]);

      const resolved = resolveVimOptions(undefined, undefined, loaded);
      expect(resolved.options.macros?.enabled).toBe(false);
      expect(resolved.options.marks?.enabled).toBe(false);
      expect(resolved.options.keymap?.actions.accepted).toEqual([
        {
          actionId: "prompt.transform.reflow",
          key: "zq",
          args: { action: "reflow" },
          modes: ["visual", "visualLine", "visualBlock"],
        },
      ]);
    } finally {
      f.cleanup();
    }
  });

  test("unmaps inherited mappings in only selected scopes", async () => {
    const f = fixture();
    try {
      f.write(`export default (vim) => vim.keymap.set("n", "zq", null);`);
      const loaded = await loadVimJsConfig(f.path);
      const resolved = resolveVimOptions(
        {
          piVimMode: {
            keymap: { actions: { "prompt.transform.quote": [{ key: "zq" }] } },
          },
        },
        undefined,
        loaded,
      );
      expect(resolved.options.keymap?.actions.accepted).toEqual([
        {
          actionId: "prompt.transform.quote",
          key: "zq",
          args: { action: "quote" },
          modes: ["visual", "visualLine", "visualBlock"],
        },
      ]);
    } finally {
      f.cleanup();
    }
  });

  test("keeps mappings declared after an unmap", async () => {
    const f = fixture();
    try {
      f.write(`export default (vim) => {
  vim.keymap.set("n", "zq", null);
  vim.keymap.set("n", "zq", vim.prompt.quote());
};`);
      const resolved = resolveVimOptions(undefined, undefined, await loadVimJsConfig(f.path));
      expect(resolved.options.keymap?.actions.accepted).toEqual([
        {
          actionId: "prompt.transform.quote",
          key: "zq",
          args: { action: "quote" },
          modes: ["normal"],
        },
      ]);
    } finally {
      f.cleanup();
    }
  });

  test("re-evaluates root config on every load", async () => {
    const f = fixture();
    const loadKey = "__piVimModeRootLoadCount";
    try {
      f.write(`
export default (vim) => {
  globalThis[${JSON.stringify(loadKey)}] = (globalThis[${JSON.stringify(loadKey)}] ?? 0) + 1;
  vim.g.mapleader = globalThis[${JSON.stringify(loadKey)}] === 1 ? "," : " ";
};
`);
      const first = await loadVimJsConfig(f.path);
      const second = await loadVimJsConfig(f.path);
      expect(operations(first)).toEqual([{ kind: "leaf", path: "leader", value: "," }]);
      expect(operations(second)).toEqual([{ kind: "leaf", path: "leader", value: " " }]);
    } finally {
      Reflect.deleteProperty(globalThis, loadKey);
      f.cleanup();
    }
  });

  test("returns fatal results without staged operations after import or export failure", async () => {
    const importFailure = fixture();
    const syntaxFailure = fixture();
    const exportFailure = fixture();
    try {
      importFailure.write(`import "./missing-helper.js"; export default () => {};`);
      const failedImport = await loadVimJsConfig(importFailure.path);
      expect(failedImport.kind).toBe("fatal");
      expect(failedImport.warnings[0]).toContain("failed to load");

      syntaxFailure.write(`export default (`);
      const failedSyntax = await loadVimJsConfig(syntaxFailure.path);
      expect(failedSyntax.kind).toBe("fatal");
      expect(failedSyntax.warnings[0]).toContain("failed to load");

      exportFailure.write(`
export default async (vim) => {
  vim.g.mapleader = ",";
  await Promise.resolve();
  throw new Error("export failure");
};
`);
      const failedExport = await loadVimJsConfig(exportFailure.path);
      expect(failedExport).toEqual({
        kind: "fatal",
        warnings: ["global JS config: failed to load (export failure)"],
      });

      const resolved = resolveVimOptions(
        { piVimMode: { startMode: "normal" } },
        { piVimMode: { leader: " " } },
        failedExport,
      );
      expect(resolved.options.startMode).toBe("normal");
      expect(resolved.options.leader).toBe(" ");
      expect(resolved.options.keymap?.actions.accepted).toEqual([]);
    } finally {
      importFailure.cleanup();
      syntaxFailure.cleanup();
      exportFailure.cleanup();
    }
  });

  test("closes retained APIs after synchronous and asynchronous exports", async () => {
    for (const asyncExport of [false, true]) {
      const f = fixture();
      const retainedKey = `__piVimModeRetained${asyncExport}`;
      try {
        f.write(`
export default ${asyncExport ? "async " : ""}(vim) => {
  globalThis[${JSON.stringify(retainedKey)}] = vim;
  vim.g.mapleader = ",";
  ${asyncExport ? "return Promise.resolve();" : ""}
};
`);
        const loaded = await loadVimJsConfig(f.path);
        const retained = Reflect.get(globalThis, retainedKey) as {
          g: { mapleader: string | null };
          keymap: { set(mode: string, lhs: string, rhs: string): void };
        };
        expect(() => {
          retained.g.mapleader = " ";
        }).toThrow("config session closed");
        expect(() => retained.keymap.set("n", "zq", "q")).toThrow("config session closed");
        expect(() => Object.defineProperty(retained.g, "mapleader", { value: " " })).toThrow(
          "config session closed",
        );
        expect(operations(loaded)).toEqual([{ kind: "leaf", path: "leader", value: "," }]);
      } finally {
        Reflect.deleteProperty(globalThis, retainedKey);
        f.cleanup();
      }
    }
  });

  test("closes synchronous exports before queued writes run", async () => {
    const f = fixture();
    const errorKey = "__piVimModeQueuedWriteError";
    try {
      f.write(`
export default (vim) => {
  vim.g.mapleader = ",";
  queueMicrotask(() => {
    try {
      vim.g.mapleader = " ";
    } catch (error) {
      globalThis[${JSON.stringify(errorKey)}] = error.message;
    }
  });
};
`);
      const loaded = await loadVimJsConfig(f.path);
      expect(Reflect.get(globalThis, errorKey)).toBe("config session closed");
      expect(operations(loaded)).toEqual([{ kind: "leaf", path: "leader", value: "," }]);
    } finally {
      Reflect.deleteProperty(globalThis, errorKey);
      f.cleanup();
    }
  });

  test("uses global JSON leader as staged read seed and freezes operation snapshots", async () => {
    const f = fixture();
    try {
      f.write(`
export default (vim) => {
  if (vim.g.mapleader !== ",") throw new Error("missing global seed");
  vim.keymap.set("n", "zq", vim.prompt.quote());
};
`);
      const loaded = await loadVimJsConfig(f.path, { leader: "," });
      const stagedOperations = operations(loaded);
      expect(Object.isFrozen(stagedOperations)).toBe(true);
      expect(Object.isFrozen(stagedOperations[0])).toBe(true);
      expect(
        Object.isFrozen(stagedOperations[0]?.kind === "map" ? stagedOperations[0].mapping : {}),
      ).toBe(true);
    } finally {
      f.cleanup();
    }
  });

  test("replays preset and leaf operations in source order", () => {
    const afterLeaf = resolveVimOptions(undefined, undefined, {
      kind: "success",
      warnings: [],
      operations: [
        { kind: "leaf", path: "startMode", value: "insert" },
        { kind: "preset", preset: "vim-heavy" },
      ],
    });
    const afterPreset = resolveVimOptions(undefined, undefined, {
      kind: "success",
      warnings: [],
      operations: [
        { kind: "preset", preset: "vim-heavy" },
        { kind: "leaf", path: "startMode", value: "insert" },
      ],
    });

    expect(afterLeaf.options.startMode).toBe("normal");
    expect(afterPreset.options.startMode).toBe("insert");
  });

  test("exposes validated domain options from global JSON without project settings", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pi-vimmode-js-options-"));
    try {
      const globalPath = join(dir, "settings.json");
      const projectPath = join(dir, "project-settings.json");
      const jsConfigPath = join(dir, "pi-vimmode.config.js");
      writeFileSync(globalPath, JSON.stringify({ piVimMode: { startMode: "normal" } }));
      writeFileSync(projectPath, JSON.stringify({ piVimMode: { startMode: "insert" } }));
      writeFileSync(
        jsConfigPath,
        `export default (vim) => {
  if (vim.startMode !== "normal") throw new Error("missing global seed");
  vim.cursor.normal = "bar";
  vim.ui.status.items = ["mode"];
  vim.macros.enabled = false;
  vim.marks.enabled = false;
  vim.search.maxHighlights = 10;
  vim.exCommand.autocomplete = false;
  vim.feedback.noop = "status";
  vim.promptStructures.targets = { codeFence: false };
  vim.promptTransforms.commands = { quote: ["quoteit"] };
  vim.keymap.actionPresets = ["paragraph-editing"];
  vim.keymap.operatorMotions = { delete: ["wordForward"] };
};`,
      );

      const result = await loadVimOptions({
        globalSettingsPath: globalPath,
        projectSettingsPath: projectPath,
        jsConfigPath,
      });
      expect(result.options.startMode).toBe("insert");
      expect(result.options.cursor.normal).toBe("bar");
      expect(result.options.ui?.status.items).toEqual(["mode"]);
      expect(result.options.macros?.enabled).toBe(false);
      expect(result.options.marks?.enabled).toBe(false);
      expect(result.options.search?.maxHighlights).toBe(10);
      expect(result.options.exCommand?.autocomplete).toBe(false);
      expect(result.options.feedback?.noop).toBe("status");
      expect(result.options.promptStructures?.targets).toMatchObject({ codeFence: false });
      expect(Object.keys(result.options.promptStructures?.targets ?? [])).toEqual(["codeFence"]);
      expect(result.options.promptTransforms?.commands).toMatchObject({ quote: ["quoteit"] });
      expect(Object.keys(result.options.promptTransforms?.commands ?? [])).toEqual(["quote"]);
      expect(result.options.keymap?.operatorMotions).toMatchObject({ delete: ["wordForward"] });
      expect(Object.keys(result.options.keymap?.operatorMotions ?? [])).toEqual(["delete"]);
      expect(result.warnings).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects invalid composite writes without changing frozen staged reads", async () => {
    const f = fixture();
    try {
      f.write(`export default (vim) => {
  const slots = vim.macros.slots;
  if (!Object.isFrozen(slots)) throw new Error("slots must be frozen");
  vim.macros.slots = ["a", "!"];
  if (vim.macros.slots.join(",") !== slots.join(",")) throw new Error("invalid slots replaced staged value");
  vim.macros.enabled = false;
  vim.search.unknown = true;
};`);
      const result = await loadVimOptions({
        globalSettingsPath: join(tmpdir(), "missing-settings.json"),
        projectSettingsPath: join(tmpdir(), "missing-project-settings.json"),
        jsConfigPath: f.path,
      });
      expect(result.options.macros?.enabled).toBe(false);
      expect(result.warnings).toEqual([
        "global JS config: piVimMode.macros.slots only supports lowercase a-z slots",
        "global JS config: unknown vim.search property unknown",
      ]);
    } finally {
      f.cleanup();
    }
  });

  test("loadVimOptions includes JS string remaps", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pi-vimmode-js-remap-load-"));
    try {
      const jsConfigPath = join(dir, "pi-vimmode.config.js");
      writeFileSync(jsConfigPath, `export default (vim) => vim.keymap.set("n", "zz", "llll");`);
      const result = await loadVimOptions({
        globalSettingsPath: join(dir, "missing-settings.json"),
        projectSettingsPath: join(dir, "project-settings.json"),
        jsConfigPath,
      });
      expect(result.options.keymap?.remaps.accepted).toEqual([
        { key: "zz", inputs: ["l", "l", "l", "l"], modes: ["normal"] },
      ]);
      expect(result.warnings).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("loadVimOptions includes the trusted global JS config layer", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pi-vimmode-js-config-load-"));
    try {
      const globalPath = join(dir, "settings.json");
      const jsConfigPath = join(dir, "pi-vimmode.config.js");
      writeFileSync(globalPath, JSON.stringify({ piVimMode: { startMode: "normal" } }));
      writeFileSync(
        jsConfigPath,
        `export default (vim) => vim.keymap.set("n", "zq", vim.prompt.reflow());`,
      );
      const result = await loadVimOptions({
        globalSettingsPath: globalPath,
        projectSettingsPath: join(dir, "project-settings.json"),
        jsConfigPath,
      });
      expect(result.options.startMode).toBe("normal");
      expect(result.options.keymap?.actions.accepted.map((binding) => binding.key)).toEqual(["zq"]);
      expect(result.warnings).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
