import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { resolveNormalCommand } from "../src/commands.ts";
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

  test("keeps command leaf and nested EasyMotion descriptor factories callable", async () => {
    const f = fixture();
    try {
      f.write(`
export default (vim) => {
  vim.keymap.set("n", "e", vim.action.command.easymotion());
  vim.keymap.set("n", "g", vim.action.command.easymotion.goToChar());
};`);
      const result = await loadVimJsConfig(f.path);
      expect(result.warnings).toEqual([]);
      expect(operations(result)).toEqual([
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "command.easymotion",
            key: "e",
            modes: ["normal"],
          },
        },
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "command.easymotion",
            key: "g",
            modes: ["normal"],
          },
        },
      ]);
    } finally {
      f.cleanup();
    }
  });

  test("runtime prefixes exclude scoped unmap tombstones and normal-only commands", () => {
    const normalWithoutLastDescendant = resolveVimOptions(undefined, undefined, {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "motion.wordForward",
            key: "zx",
            modes: ["normal"],
          },
        },
        { kind: "unmap", key: "zx", modes: ["normal"] },
      ],
    }).options.keymap!;
    expect(resolveNormalCommand("z", undefined, normalWithoutLastDescendant, "normal")).toEqual({
      type: "none",
    });

    const normalWithSibling = resolveVimOptions(undefined, undefined, {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "motion.wordForward",
            key: "zx",
            modes: ["normal"],
          },
        },
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "motion.wordBackward",
            key: "zy",
            modes: ["normal"],
          },
        },
        { kind: "unmap", key: "zx", modes: ["normal"] },
      ],
    }).options.keymap!;
    const normalPrefix = resolveNormalCommand("z", undefined, normalWithSibling, "normal");
    expect(normalPrefix).toEqual({ type: "pending", pending: "z" });
    if (normalPrefix.type !== "pending") throw new Error("expected normal prefix");
    expect(
      resolveNormalCommand("y", normalPrefix.pending, normalWithSibling, "normal"),
    ).toMatchObject({
      type: "motion",
      motion: "wordBackward",
    });

    const operatorWithoutLastDescendant = resolveVimOptions(undefined, undefined, {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "motion.wordForward",
            key: "zx",
            modes: ["operatorPending"],
          },
        },
        { kind: "unmap", key: "zx", modes: ["operatorPending"] },
      ],
    }).options.keymap!;
    const deletePrefix = resolveNormalCommand(
      "d",
      undefined,
      operatorWithoutLastDescendant,
      "normal",
    );
    expect(deletePrefix.type).toBe("pending");
    if (deletePrefix.type !== "pending") throw new Error("expected delete pending");
    expect(resolveNormalCommand("z", deletePrefix.pending, operatorWithoutLastDescendant)).toEqual({
      type: "invalid",
    });

    const operatorWithSibling = resolveVimOptions(undefined, undefined, {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "motion.wordForward",
            key: "zx",
            modes: ["operatorPending"],
          },
        },
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "motion.wordBackward",
            key: "zy",
            modes: ["operatorPending"],
          },
        },
        { kind: "unmap", key: "zx", modes: ["operatorPending"] },
      ],
    }).options.keymap!;
    const operatorPrefix = resolveNormalCommand("d", undefined, operatorWithSibling, "normal");
    expect(operatorPrefix.type).toBe("pending");
    if (operatorPrefix.type !== "pending") throw new Error("expected delete pending");
    const motionPrefix = resolveNormalCommand("z", operatorPrefix.pending, operatorWithSibling);
    expect(motionPrefix.type).toBe("pending");
    if (motionPrefix.type !== "pending") throw new Error("expected motion pending");
    expect(resolveNormalCommand("y", motionPrefix.pending, operatorWithSibling)).toMatchObject({
      type: "operatorMotion",
      motion: "wordBackward",
    });

    const tombstonedRepeat = resolveVimOptions(undefined, undefined, {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "operator.delete",
            key: "z",
            modes: ["normal"],
          },
        },
        { kind: "unmap", key: "z", modes: ["operatorPending"] },
      ],
    }).options.keymap!;
    const customDelete = resolveNormalCommand("z", undefined, tombstonedRepeat, "normal");
    expect(customDelete.type).toBe("pending");
    if (customDelete.type !== "pending") throw new Error("expected custom delete pending");
    expect(resolveNormalCommand("z", customDelete.pending, tombstonedRepeat)).toEqual({
      type: "invalid",
    });

    const normalOnlyCommand = resolveVimOptions(undefined, undefined, {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "command.undo",
            key: "zx",
            modes: ["normal"],
          },
        },
      ],
    }).options.keymap!;
    const pendingDelete = resolveNormalCommand("d", undefined, normalOnlyCommand, "normal");
    expect(pendingDelete.type).toBe("pending");
    if (pendingDelete.type !== "pending") throw new Error("expected delete pending");
    expect(resolveNormalCommand("z", pendingDelete.pending, normalOnlyCommand)).toEqual({
      type: "invalid",
    });
  });

  test("loads opaque finite action descriptors in canonical scopes", async () => {
    const f = fixture();
    try {
      f.write(`
export default (vim) => {
  vim.keymap.set("n", "H", vim.action.motion.wordForward(), { desc: "Next word" });
  vim.keymap.set("x", "Q", vim.action.motion.wordBackward());
  vim.keymap.set("o", "W", vim.action.textObject.target.word());
  vim.keymap.set("n", "undo", "undo");
};
`);
      const result = await loadVimJsConfig(f.path);
      expect(result.warnings).toEqual([]);
      expect(operations(result)).toEqual([
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "motion.wordForward",
            key: "H",
            modes: ["normal"],
            desc: "Next word",
          },
        },
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "motion.wordBackward",
            key: "Q",
            modes: ["visual", "visualLine", "visualBlock"],
          },
        },
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "textObject.target.word",
            key: "W",
            modes: ["operatorPending"],
          },
        },
        {
          kind: "map",
          mapping: { kind: "remap", key: "undo", inputs: ["u", "n", "d", "o"], modes: ["normal"] },
        },
      ]);
      const resolved = resolveVimOptions(undefined, undefined, result);
      expect(resolved.plan.scopes.normal.exact.H).toEqual({
        kind: "keymap",
        id: "motion.wordForward",
      });
      expect(resolved.plan.scopes.visual.exact.Q).toEqual({
        kind: "keymap",
        id: "motion.wordBackward",
      });
      expect(resolved.plan.scopes.operatorPending.exact.W).toEqual({
        kind: "keymap",
        id: "textObject.target.word",
      });
      const keymap = resolved.options.keymap!;
      expect(resolveNormalCommand("H", undefined, keymap, "normal")).toMatchObject({
        type: "motion",
        motion: "wordForward",
      });
      const operator = resolveNormalCommand("d", undefined, keymap, "normal");
      expect(operator.type).toBe("pending");
      if (operator.type !== "pending") throw new Error("expected operator pending state");
      const kind = resolveNormalCommand("i", operator.pending, keymap, "normal");
      expect(kind.type).toBe("pending");
      if (kind.type !== "pending") throw new Error("expected text object pending state");
      expect(resolveNormalCommand("W", kind.pending, keymap, "normal")).toMatchObject({
        type: "operatorTextObject",
        textObject: { kind: "inner", target: "word" },
      });

      const customOperator = resolveVimOptions(undefined, undefined, {
        kind: "success",
        warnings: [],
        operations: [
          {
            kind: "map",
            mapping: {
              kind: "descriptor",
              actionId: "operator.delete",
              key: "Z",
              modes: ["normal"],
            },
          },
        ],
      }).options.keymap!;
      const pendingDelete = resolveNormalCommand("Z", undefined, customOperator, "normal");
      expect(pendingDelete.type).toBe("pending");
      if (pendingDelete.type !== "pending")
        throw new Error("expected custom operator pending state");
      expect(
        resolveNormalCommand("w", pendingDelete.pending, customOperator, "normal"),
      ).toMatchObject({
        type: "operatorMotion",
        operator: "delete",
        motion: "wordForward",
      });
    } finally {
      f.cleanup();
    }
  });

  test("insert descriptors reject multi-key lhs", async () => {
    const f = fixture();
    try {
      f.write(`
export default (vim) => {
  vim.keymap.set("i", "<A-x><A-y>", vim.action.insert.deleteWordBackward());
};
`);
      const result = await loadVimJsConfig(f.path);
      expect(result.warnings).toEqual([]);
      expect(operations(result)).toEqual([
        {
          kind: "map",
          mapping: {
            kind: "insert",
            action: "deleteWordBackward",
            key: "alt+xalt+y",
          },
        },
      ]);
      const resolved = resolveVimOptions(undefined, undefined, result);
      expect(resolved.warnings).toContain(
        "global JS config: piVimMode.keymap.insert.deleteWordBackward contains unsupported printable text sequence alt+xalt+y",
      );
      expect(resolved.plan.scopes.insert.exact).not.toHaveProperty("alt+xalt+y");
    } finally {
      f.cleanup();
    }
  });

  test("visual aliases reject commands not executable across every selected scope", async () => {
    const f = fixture();
    try {
      f.write(`
export default (vim) => {
  vim.keymap.set("v", "I", vim.action.command.insertLineStart());
  vim.keymap.set("visualBlock", "I", vim.action.command.insertLineStart());
};
`);
      const result = await loadVimJsConfig(f.path);
      expect(result.warnings).toEqual([
        "global JS config: command.insertLineStart does not support selected mode",
      ]);
      expect(operations(result)).toHaveLength(1);
    } finally {
      f.cleanup();
    }
  });

  test("operator-pending rejects mark descriptors", async () => {
    const f = fixture();
    try {
      f.write(`
export default (vim) => {
  vim.keymap.set("o", "M", vim.action.mark.jumpExact());
};
`);
      const result = await loadVimJsConfig(f.path);
      expect(result.warnings).toEqual([
        "global JS config: mark.jumpExact does not support selected mode",
      ]);
      expect(operations(result)).toEqual([]);
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

  test("project empty action removes JS descriptor across canonical scopes", () => {
    const result = resolveVimOptions(
      undefined,
      { piVimMode: { keymap: { motions: { wordForward: [] } } } },
      {
        kind: "success",
        warnings: [],
        operations: [
          {
            kind: "map",
            mapping: {
              kind: "descriptor",
              actionId: "motion.wordForward",
              key: "H",
              modes: ["normal", "operatorPending"],
            },
          },
        ],
      },
    );

    expect(result.plan.scopes.normal.exact.H).toBeUndefined();
    expect(result.plan.scopes.operatorPending.exact.H).toBeUndefined();
  });

  test("operator-pending unmaps suppress inherited motions and text objects", () => {
    const result = resolveVimOptions(undefined, undefined, {
      kind: "success",
      warnings: [],
      operations: [
        { kind: "unmap", key: "w", modes: ["operatorPending"] },
        { kind: "unmap", key: "i", modes: ["operatorPending"] },
        { kind: "unmap", key: "/", modes: ["operatorPending"] },
      ],
    });
    const keymap = result.options.keymap!;
    const pending = resolveNormalCommand("d", undefined, keymap, "normal");
    expect(pending.type).toBe("pending");
    if (pending.type !== "pending") throw new Error("expected operator pending state");
    expect(resolveNormalCommand("w", pending.pending, keymap, "normal").type).toBe("invalid");
    expect(resolveNormalCommand("i", pending.pending, keymap, "normal").type).toBe("invalid");
    expect(resolveNormalCommand("/", pending.pending, keymap, "normal").type).toBe("invalid");
  });

  test("project exact mappings restore lower JS unmaps", () => {
    const result = resolveVimOptions(
      undefined,
      { piVimMode: { keymap: { motions: { wordForward: ["w"] } } } },
      {
        kind: "success",
        warnings: [],
        operations: [{ kind: "unmap", key: "w", modes: ["normal"] }],
      },
    );

    expect(result.plan.scopes.normal.exact.w?.id).toBe("motion.wordForward");
  });

  test("project action replaces JS descriptor across canonical scopes", () => {
    const result = resolveVimOptions(
      undefined,
      { piVimMode: { keymap: { motions: { wordForward: ["L"] } } } },
      {
        kind: "success",
        warnings: [],
        operations: [
          {
            kind: "map",
            mapping: {
              kind: "descriptor",
              actionId: "motion.wordForward",
              key: "H",
              modes: ["normal", "operatorPending"],
            },
          },
        ],
      },
    );

    expect(result.plan.scopes.normal.exact.H).toBeUndefined();
    expect(result.plan.scopes.operatorPending.exact.H).toBeUndefined();
    expect(result.plan.scopes.normal.exact.L?.id).toBe("motion.wordForward");
    expect(result.plan.scopes.operatorPending.exact.L?.id).toBe("motion.wordForward");
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

  test("JS escape descriptors stay in selected scopes", () => {
    const result = resolveVimOptions(undefined, undefined, {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "escape",
            key: "alt+z",
            modes: ["insert"],
          },
        },
      ],
    });

    expect(result.plan.scopes.insert.exact["alt+z"]?.kind).toBe("escape");
    for (const scope of ["visual", "visualLine", "visualBlock", "operatorPending"] as const) {
      expect(result.plan.scopes[scope].exact["alt+z"]).toBeUndefined();
    }
  });

  test("project command mappings replace JS descriptors in visual scopes", () => {
    const result = resolveVimOptions(
      undefined,
      { piVimMode: { keymap: { commands: { toggleCase: ["Q"] } } } },
      {
        kind: "success",
        warnings: [],
        operations: [
          {
            kind: "map",
            mapping: {
              kind: "descriptor",
              actionId: "command.toggleCase",
              key: "X",
              modes: ["visual", "visualLine", "visualBlock"],
            },
          },
        ],
      },
    );

    expect(result.plan.scopes.visual.exact.X).toBeUndefined();
    expect(result.plan.scopes.visual.exact.Q?.id).toBe("command.toggleCase");
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

  test("rejected insert descriptors do not reappear in scoped plan", () => {
    const result = resolveVimOptions(undefined, undefined, {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "insert.deleteWordBackward",
            key: "a",
            modes: ["insert"],
          },
        },
      ],
    });

    expect(result.options.keymap?.scoped).toEqual([]);
    expect(result.plan.scopes.insert.exact.a).toBeUndefined();
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

  test("rejects null and empty arguments for no-argument descriptors", async () => {
    const f = fixture();
    try {
      f.write(`export default (vim) => {
  vim.keymap.set("n", "H", vim.action.motion.wordForward(null));
  vim.keymap.set("n", "L", vim.action.motion.wordForward({}));
};`);
      const result = await loadVimJsConfig(f.path);
      expect(operations(result)).toEqual([]);
      expect(result.warnings).toEqual([
        "global JS config: motion.wordForward does not accept these arguments",
        "global JS config: motion.wordForward does not accept these arguments",
      ]);
    } finally {
      f.cleanup();
    }
  });

  test("per-binding protected overrides survive prompt and insert descriptor compilation", async () => {
    const f = fixture();
    try {
      f.write(`
export default (vim) => {
  vim.keymap.set("n", "<C-p>", vim.prompt.quote(), { allowProtected: true });
  vim.keymap.set("i", "<C-v>", vim.prompt.deleteWordBackward(), { allowProtected: true });
  vim.keymap.set("n", "<C-t>", vim.prompt.reflow());
};`);
      const loaded = await loadVimJsConfig(f.path);
      const resolved = resolveVimOptions(undefined, undefined, loaded);
      expect(resolved.options.keymap?.actions.accepted).toEqual([
        {
          actionId: "prompt.transform.quote",
          key: "ctrl+p",
          args: { action: "quote" },
          modes: ["normal"],
          allowProtected: true,
        },
      ]);
      expect(resolved.options.keymap?.insert.deleteWordBackward).toContain("ctrl+v");
      expect(resolved.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining("protected key ctrl+t")]),
      );
      expect(resolved.options.keymap?.actions.accepted).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ key: "ctrl+t" })]),
      );
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

  test("leader-form unmaps suppress inherited bindings after expansion", async () => {
    const f = fixture();
    try {
      f.write(`export default (vim) => {
  vim.g.mapleader = ",";
  vim.keymap.set("n", "<leader>x", null);
};`);
      const loaded = await loadVimJsConfig(f.path);
      const resolved = resolveVimOptions(
        {
          piVimMode: {
            leader: ",",
            keymap: { commands: { undo: ["<leader>x"] } },
          },
        },
        undefined,
        loaded,
      );
      expect(resolved.plan.scopes.normal.exact[",x"]).toBeUndefined();
      expect(resolved.options.keymap?.unmaps).toEqual([{ key: ",x", modes: ["normal"] }]);
    } finally {
      f.cleanup();
    }
  });

  test("leader-form scoped descriptors reserve the expanded leader prefix", async () => {
    const f = fixture();
    try {
      f.write(`export default (vim) => {
  vim.g.mapleader = ",";
  vim.keymap.set("n", "<leader>u", vim.action.command.undo());
};`);
      const resolved = resolveVimOptions(undefined, undefined, await loadVimJsConfig(f.path));
      expect(resolved.options.keymap?.leader).toBe(",");
      expect(resolved.options.keymap?.scoped).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ actionId: "command.undo", key: ",u", modes: ["normal"] }),
        ]),
      );
    } finally {
      f.cleanup();
    }
  });

  test("project text-object bindings replace matching JS descriptors", () => {
    const resolved = resolveVimOptions(
      undefined,
      {
        piVimMode: {
          keymap: { textObjects: { kinds: { inner: ["z"] } } },
        },
      },
      {
        kind: "success",
        warnings: [],
        operations: [
          {
            kind: "map",
            mapping: {
              kind: "descriptor",
              actionId: "textObject.kind.inner",
              key: "i",
              modes: ["operatorPending"],
            },
          },
        ],
      },
    );
    expect(resolved.options.keymap?.scoped).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ actionId: "textObject.kind.inner" })]),
    );
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

  test("unmaps inherited grammar in only selected scopes", async () => {
    const f = fixture();
    try {
      f.write(`export default (vim) => vim.keymap.set("n", "w", null);`);
      const resolved = resolveVimOptions(undefined, undefined, await loadVimJsConfig(f.path));
      const keymap = resolved.options.keymap;
      expect(resolved.plan.scopes.normal.exact.w).toBeUndefined();
      expect(resolved.plan.scopes.visual.exact.w?.id).toBe("motion.wordForward");
      expect(resolveNormalCommand("w", undefined, keymap, "normal").type).toBe("none");
      expect(resolveNormalCommand("w", undefined, keymap, "visual")).toMatchObject({
        type: "motion",
        motion: "wordForward",
      });
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

  test("applies presets to staged reads and replaces UI mode label records", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pi-vimmode-js-ui-labels-"));
    try {
      const globalPath = join(dir, "settings.json");
      const jsConfigPath = join(dir, "pi-vimmode.config.js");
      writeFileSync(
        globalPath,
        JSON.stringify({
          piVimMode: {
            ui: {
              mode: {
                labels: { insert: "GLOBAL-INSERT" },
                narrowLabels: { insert: "GI" },
              },
            },
          },
        }),
      );
      writeFileSync(
        jsConfigPath,
        `export default (vim) => {
  vim.preset = "vim-heavy";
  if (vim.startMode !== "normal") throw new Error("preset did not update staged reads");
  vim.ui.mode.labels = { normal: "JS-NORMAL" };
  vim.ui.mode.narrowLabels = { normal: "JN" };
};`,
      );

      const result = await loadVimOptions({
        globalSettingsPath: globalPath,
        projectSettingsPath: join(dir, "missing-project-settings.json"),
        jsConfigPath,
      });
      expect(result.options.ui?.mode.labels).toMatchObject({ normal: "JS-NORMAL" });
      expect(Object.keys(result.options.ui?.mode.labels ?? {})).toEqual(["normal"]);
      expect(result.options.ui?.mode.narrowLabels).toMatchObject({ normal: "JN" });
      expect(Object.keys(result.options.ui?.mode.narrowLabels ?? {})).toEqual(["normal"]);
      expect(result.warnings).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
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

  test("replaces action presets on each assignment", async () => {
    const f = fixture();
    try {
      f.write(`export default (vim) => {
  vim.keymap.set("n", "za", vim.prompt.quote());
  vim.keymap.actionPresets = ["paragraph-editing"];
  vim.keymap.set("n", "zq", vim.prompt.reflow());
  vim.keymap.actionPresets = [];
};`);
      const result = await loadVimOptions({
        globalSettingsPath: join(tmpdir(), "missing-settings.json"),
        projectSettingsPath: join(tmpdir(), "missing-project-settings.json"),
        jsConfigPath: f.path,
      });

      expect(result.options.keymap?.actions.accepted).toEqual([
        {
          key: "za",
          actionId: "prompt.transform.quote",
          args: { action: "quote" },
          modes: ["normal"],
        },
        {
          key: "zq",
          actionId: "prompt.transform.reflow",
          args: { action: "reflow" },
          modes: ["normal"],
        },
      ]);
      expect(result.warnings).toEqual([]);
    } finally {
      f.cleanup();
    }
  });

  test("JS action preset assignment replaces global JSON preset bindings", () => {
    const result = resolveVimOptions(
      { piVimMode: { keymap: { actionPresets: ["paragraph-editing"] } } },
      undefined,
      {
        kind: "success",
        warnings: [],
        operations: [{ kind: "leaf", path: "keymap.actionPresets", value: [] }],
      },
    );

    expect(result.options.keymap?.actions.accepted).toEqual([]);
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

  test("exposes every finite option path through trusted JavaScript", async () => {
    const f = fixture();
    try {
      f.write(`export default (vim) => {
  vim.leader = ",";
  vim.startMode = "normal";
  vim.cursor.insert = "underline";
  vim.cursor.normal = "bar";
  vim.cursor.visual = "block";
  vim.cursor.visualLine = "underline";
  vim.cursor.visualBlock = "bar";
  vim.keymap.actionPresets = [];
  vim.keymap.operatorMotions = { delete: ["wordForward"] };
  vim.ui.status.enabled = false;
  vim.ui.status.position = "right";
  vim.ui.status.items = ["mode"];
  vim.ui.mode.enabled = false;
  vim.ui.mode.labels = { normal: "NORMAL" };
  vim.ui.mode.narrowLabels = { normal: "N" };
  vim.ui.selection.enabled = false;
  vim.ui.selection.previewMaxChars = 24;
  vim.ui.cursorPosition.enabled = false;
  vim.ui.cursorPosition.base = 1;
  vim.ui.cursorPosition.format = "{line}:{column}";
  vim.ui.workbench.reservedRows = 3;
  vim.macros.enabled = false;
  vim.macros.slots = ["a"];
  vim.macros.maxReplaySteps = 12;
  vim.marks.enabled = false;
  vim.marks.slots = ["a"];
  vim.search.highlight = false;
  vim.search.highlightCurrent = false;
  vim.search.clearOnCancel = false;
  vim.search.clearOnInsert = true;
  vim.search.maxHighlights = 12;
  vim.exCommand.autocomplete = false;
  vim.feedback.noop = "status";
  vim.promptStructures.enabled = false;
  vim.promptStructures.targets = { codeFence: false };
  vim.promptTransforms.enabled = false;
  vim.promptTransforms.actions = { quote: false };
  vim.promptTransforms.commands = { quote: ["quoteit"] };
};`);
      const result = await loadVimOptions({
        globalSettingsPath: join(tmpdir(), "missing-settings.json"),
        projectSettingsPath: join(tmpdir(), "missing-project-settings.json"),
        jsConfigPath: f.path,
      });

      expect(result.options).toMatchObject({
        leader: ",",
        startMode: "normal",
        cursor: {
          insert: "underline",
          normal: "bar",
          visual: "block",
          visualLine: "underline",
          visualBlock: "bar",
        },
        keymap: { operatorMotions: { delete: ["wordForward"] } },
        ui: {
          status: { enabled: false, position: "right", items: ["mode"] },
          mode: { enabled: false, labels: { normal: "NORMAL" }, narrowLabels: { normal: "N" } },
          selection: { enabled: false, previewMaxChars: 24 },
          cursorPosition: { enabled: false, base: 1, format: "{line}:{column}" },
          workbench: { reservedRows: 3 },
        },
        macros: { enabled: false, slots: ["a"], maxReplaySteps: 12 },
        marks: { enabled: false, slots: ["a"] },
        search: {
          highlight: false,
          highlightCurrent: false,
          clearOnCancel: false,
          clearOnInsert: true,
          maxHighlights: 12,
        },
        exCommand: { autocomplete: false },
        feedback: { noop: "status" },
        promptStructures: { enabled: false, targets: { codeFence: false } },
        promptTransforms: {
          enabled: false,
          actions: { quote: false },
          commands: { quote: ["quoteit"] },
        },
      });
      expect(result.warnings).toEqual([]);
    } finally {
      f.cleanup();
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

  test("rejects invalid prompt records and accepts empty replacements", async () => {
    const f = fixture();
    try {
      f.write(`export default (vim) => {
  vim.promptStructures.targets = { codeFence: false };
  vim.promptTransforms.actions = { quote: false };
  vim.promptTransforms.commands = { quote: ["quoteit"] };
  vim.promptStructures.targets = { codeFence: true, unknown: true };
  vim.promptTransforms.actions = { quote: true, unknown: true };
  vim.promptTransforms.commands = { quote: ["valid", "not-valid!"] };
};`);
      const rejected = await loadVimOptions({
        globalSettingsPath: join(tmpdir(), "missing-settings.json"),
        projectSettingsPath: join(tmpdir(), "missing-project-settings.json"),
        jsConfigPath: f.path,
      });
      expect(rejected.options.promptStructures?.targets).toMatchObject({ codeFence: false });
      expect(rejected.options.promptTransforms?.actions).toMatchObject({ quote: false });
      expect(rejected.options.promptTransforms?.commands).toMatchObject({ quote: ["quoteit"] });

      const empty = fixture();
      try {
        empty.write(`export default (vim) => {
  vim.promptStructures.targets = {};
  vim.promptTransforms.actions = {};
  vim.promptTransforms.commands = {};
};`);
        const cleared = await loadVimOptions({
          globalSettingsPath: join(tmpdir(), "missing-settings.json"),
          projectSettingsPath: join(tmpdir(), "missing-project-settings.json"),
          jsConfigPath: empty.path,
        });
        expect(Object.keys(cleared.options.promptStructures?.targets ?? {})).toEqual([]);
        expect(Object.keys(cleared.options.promptTransforms?.actions ?? {})).toEqual([]);
        expect(Object.keys(cleared.options.promptTransforms?.commands ?? {})).toEqual([]);
      } finally {
        empty.cleanup();
      }
    } finally {
      f.cleanup();
    }
  });

  test("keeps valid prompt records from JSON when siblings are invalid", () => {
    const result = resolveVimOptions({
      piVimMode: {
        promptStructures: { targets: { codeFence: false, unknown: true } },
        promptTransforms: { commands: { quote: ["quoteit", "not-valid!"], unknown: ["ignored"] } },
      },
    });

    expect(result.options.promptStructures?.targets).toMatchObject({ codeFence: false });
    expect(result.options.promptTransforms?.commands).toMatchObject({ quote: ["quoteit"] });
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
