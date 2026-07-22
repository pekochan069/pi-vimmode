import { visibleWidth } from "@earendil-works/pi-tui";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, platform, release } from "node:os";
import { dirname, resolve } from "node:path";

import { createVimConfigPlan, DEFAULT_VIM_OPTIONS } from "../src/config.ts";
import { VimEditor } from "../src/vim-editor.ts";

const VIEWPORT = { columns: 80, rows: 40 } as const;
const DEFAULT_OUTPUT = "benchmark/results/0.9.0-pre-change.json";

type BenchmarkCase = {
  name: string;
  corpus: string;
  codeUnits: number;
  setup: () => void;
  operation: () => unknown;
  assert: (result: unknown) => void;
};

type Options = { runs: number; warmup: number; only?: string; output: string };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function createDependencies() {
  const tui = {
    terminal: { rows: VIEWPORT.rows, columns: VIEWPORT.columns, write() {} },
    requestRender() {},
    getShowHardwareCursor: () => false,
    setShowHardwareCursor() {},
  } as any;
  const theme = {
    borderColor: (text: string) => text,
    selectList: {
      selectedText: (text: string) => text,
      description: (text: string) => text,
      noMatch: (text: string) => text,
      scrollInfo: (text: string) => text,
    },
  } as any;
  const keybindings = {
    matches: () => false,
    getKeys: () => [],
    getDefinition: () => ({ defaultKeys: [] }),
    getConflicts: () => [],
  } as any;
  return { tui, theme, keybindings };
}

function createVimEditor(startMode: "insert" | "normal"): VimEditor {
  const { tui, theme, keybindings } = createDependencies();
  const options = { ...DEFAULT_VIM_OPTIONS, startMode };
  const plan = createVimConfigPlan(options, []);
  return new VimEditor(tui, theme, keybindings, { plan, diagnostics: plan.diagnostics });
}

function corpus(kind: "ascii-single" | "ascii-multiline" | "mixed-width", size: number) {
  if (kind === "ascii-single") return "a".repeat(size);
  if (kind === "mixed-width") return "a界🙂".repeat(Math.ceil(size / 4)).slice(0, size);
  const line = `${"m".repeat(78)}\n`;
  return line.repeat(Math.ceil(size / line.length)).slice(0, size);
}

function assertRender(result: unknown, expectedTail: string): void {
  assert(Array.isArray(result) && result.length >= 3, "render returned too few rows");
  assert(
    result.every((row) => typeof row === "string" && visibleWidth(row) <= VIEWPORT.columns),
    "render exceeded viewport width",
  );
  assert(result.join("\n").includes(expectedTail), "render omitted corpus tail");
}

function renderCases(): BenchmarkCase[] {
  const cases: BenchmarkCase[] = [];
  for (const kind of ["ascii-single", "ascii-multiline", "mixed-width"] as const) {
    for (const size of [100_000, 1_000_000]) {
      const text = corpus(kind, size);
      const editor = createVimEditor("normal");
      editor.setText(text);
      cases.push({
        name: `vim-render/${kind}/${size}`,
        corpus: kind,
        codeUnits: text.length,
        setup() {},
        operation: () => editor.render(VIEWPORT.columns),
        assert: (result) => assertRender(result, text.slice(-8)),
      });
    }
  }
  return cases;
}

function cursorCases(): BenchmarkCase[] {
  return [100, 1_000, 10_000].map((size) => {
    const text = corpus("ascii-single", size);
    const editor = createVimEditor("normal");
    return {
      name: `cursor-restoration/ascii-single/${size}`,
      corpus: "ascii-single",
      codeUnits: text.length,
      setup() {
        editor.setText(text);
        editor.handleInput("m");
        editor.handleInput("a");
        editor.handleInput("0");
        assert(editor.getCursor().col === 0, "cursor setup missed line start");
      },
      operation() {
        editor.handleInput("`");
        editor.handleInput("a");
      },
      assert() {
        assert(editor.getCursor().col === text.length, "cursor restoration missed line end");
      },
    };
  });
}

function piEditorCases(): BenchmarkCase[] {
  return [100_000, 1_000_000].map((size) => {
    const text = corpus("ascii-single", size);
    const editor = createVimEditor("insert");
    return {
      name: `pi-editor-insert/ascii-single/${size}`,
      corpus: "ascii-single",
      codeUnits: text.length,
      setup: () => editor.setText(text),
      operation: () => editor.handleInput("x"),
      assert() {
        assert(editor.getText() === `${text}x`, "Pi editor inserted wrong text");
        assert(editor.getCursor().col === text.length + 1, "Pi editor cursor missed insert end");
      },
    };
  });
}

function parseOptions(args: string[]): Options {
  const value = (flag: string) => {
    const index = args.indexOf(flag);
    return index === -1 ? undefined : args[index + 1];
  };
  const runs = Number(value("--runs") ?? 20);
  const warmup = Number(value("--warmup") ?? 1);
  assert(Number.isInteger(runs) && runs > 0, "--runs must be a positive integer");
  assert(Number.isInteger(warmup) && warmup >= 0, "--warmup must be a non-negative integer");
  return { runs, warmup, only: value("--only"), output: value("--output") ?? DEFAULT_OUTPUT };
}

function percentile(sorted: number[], fraction: number): number {
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]!;
}

function measure(item: BenchmarkCase, options: Options) {
  for (let i = 0; i < options.warmup; i++) {
    item.setup();
    item.assert(item.operation());
  }
  const samples: number[] = [];
  for (let i = 0; i < options.runs; i++) {
    item.setup();
    const start = performance.now();
    const result = item.operation();
    samples.push(performance.now() - start);
    item.assert(result);
  }
  samples.sort((a, b) => a - b);
  return {
    name: item.name,
    corpus: item.corpus,
    codeUnits: item.codeUnits,
    runs: options.runs,
    milliseconds: {
      min: samples[0],
      p50: percentile(samples, 0.5),
      p95: percentile(samples, 0.95),
      max: samples.at(-1),
    },
  };
}

async function git(args: string[]): Promise<{ code: number; stdout: string }> {
  const child = Bun.spawn(["git", ...args], { stdout: "pipe", stderr: "ignore" });
  const [code, stdout] = await Promise.all([child.exited, new Response(child.stdout).text()]);
  return { code, stdout: stdout.trim() };
}

async function revision(): Promise<{ commit: string; sourceDirty: boolean }> {
  const head = await git(["rev-parse", "HEAD"]);
  assert(head.code === 0, "git rev-parse HEAD failed");
  const source = await git(["diff", "--quiet", "HEAD", "--", "src", "index.ts"]);
  assert(source.code === 0 || source.code === 1, "git diff failed");
  return { commit: head.stdout, sourceDirty: source.code === 1 };
}

async function main(): Promise<void> {
  const options = parseOptions(Bun.argv.slice(2));
  const allCases = [...renderCases(), ...cursorCases(), ...piEditorCases()];
  const selected = options.only ? allCases.filter((item) => item.name === options.only) : allCases;
  assert(selected.length > 0, `no benchmark matched --only ${options.only}`);
  const results = selected.map((item) => measure(item, options));
  const sourceRevision = await revision();
  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    revision: sourceRevision.commit,
    sourceDirty: sourceRevision.sourceDirty,
    runtime: { bun: Bun.version },
    system: { platform: platform(), release: release(), arch: process.arch, cpu: cpus()[0]?.model },
    viewport: VIEWPORT,
    results,
  };
  const path = resolve(options.output);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${results.length} results to ${options.output}`);
}

await main();
