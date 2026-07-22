import { CURSOR_MARKER, visibleWidth } from "@earendil-works/pi-tui";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, arch, platform, release } from "node:os";
import { dirname } from "node:path";

import { createVimConfigPlan, DEFAULT_VIM_OPTIONS } from "../src/config.ts";
import { VimEditor } from "../src/vim-editor.ts";

type CorpusKind = "ascii-single" | "ascii-multiline" | "mixed-single";

type CorpusMetadata = {
  name: string;
  kind: CorpusKind;
  codeUnits: number;
  lines: number;
};

type Corpus = CorpusMetadata & {
  text: string;
};

type Timings = {
  min: number;
  p50: number;
  p95: number;
  max: number;
};

type BenchmarkResult = {
  name: string;
  corpus: CorpusMetadata;
  runs: number;
  milliseconds: Timings;
};

type BenchmarkCase = {
  name: string;
  corpus: Corpus;
  setup: (editor: VimEditor) => void;
  measure: (editor: VimEditor) => unknown;
  assert: (editor: VimEditor, result: unknown) => void;
};

type Arguments = {
  output?: string;
  profile?: "cursor-restoration" | "long-line-render";
  cases: string[];
  runs: number;
  warmup: number;
};

const WIDTH = 80;
const ROWS = 40;
const EXPECTED_RENDER_ROWS = Math.max(5, Math.floor(ROWS * 0.3)) + 2;

function fillToken(target: number, token: string): string {
  let text = "";
  while (text.length + token.length <= target) text += token;
  return text + "x".repeat(target - text.length);
}

function corpusMetadata({ name, kind, codeUnits, lines }: Corpus): CorpusMetadata {
  return { name, kind, codeUnits, lines };
}

function makeCorpus(name: string, kind: CorpusKind, codeUnits: number, token: string): Corpus {
  const text = fillToken(codeUnits, token);
  return { name, kind, text, codeUnits: text.length, lines: 1 };
}

function makeMultilineCorpus(name: string, codeUnits: number): Corpus {
  const lineCount = codeUnits >= 1_000_000 ? 20_000 : 2_000;
  const lineWidth = Math.floor((codeUnits - (lineCount - 1)) / lineCount);
  const line = fillToken(lineWidth, "word ");
  const text = `${Array.from({ length: lineCount }, () => line).join("\n")}x`;
  if (text.length !== codeUnits) throw new Error(`${name}: generated wrong size`);
  return { name, kind: "ascii-multiline", text, codeUnits, lines: lineCount };
}

function createEditor(startMode: "insert" | "normal" = "normal"): VimEditor {
  const tui = {
    terminal: { columns: WIDTH, rows: ROWS, write: () => {} },
    requestRender: () => {},
    getShowHardwareCursor: () => false,
    setShowHardwareCursor: () => {},
  };
  const theme = {
    borderColor: (text: string) => text,
    selectList: {},
  };
  const keybindings = {
    matches: () => false,
    getKeys: () => [],
    getDefinition: () => ({ defaultKeys: [] }),
    getConflicts: () => [],
  };
  const options = { ...DEFAULT_VIM_OPTIONS, startMode };
  const plan = createVimConfigPlan(options, []);
  return new VimEditor(tui as never, theme as never, keybindings as never, {
    plan,
    diagnostics: { warnings: [] },
  });
}

function previousWordColumn(text: string, column: number): number {
  let index = column;
  while (index > 0 && /\s/.test(text[index - 1] ?? "")) index--;
  while (index > 0 && !/\s/.test(text[index - 1] ?? "")) index--;
  return index;
}

function wordBackwardCase(corpus: Corpus): BenchmarkCase {
  const expected = previousWordColumn(corpus.text, corpus.text.length);
  return {
    name: `cursor-restoration/word-backward/${corpus.name}`,
    corpus,
    setup: (editor) => {
      editor.setText(corpus.text);
      editor.handleInput("$");
    },
    measure: (editor) => editor.handleInput("b"),
    assert: (editor) => {
      if (editor.getText() !== corpus.text) throw new Error("word-backward changed text");
      if (editor.getCursor().col !== expected) throw new Error("word-backward cursor mismatch");
    },
  };
}

function bufferStartCase(corpus: Corpus): BenchmarkCase {
  return {
    name: `cursor-restoration/buffer-start/${corpus.name}`,
    corpus,
    setup: (editor) => {
      editor.setText(corpus.text);
      editor.handleInput("G");
    },
    measure: (editor) => {
      editor.handleInput("g");
      return editor.handleInput("g");
    },
    assert: (editor) => {
      const cursor = editor.getCursor();
      if (cursor.line !== 0 || cursor.col !== 0) throw new Error("buffer-start cursor mismatch");
      if (editor.getText() !== corpus.text) throw new Error("buffer-start changed text");
    },
  };
}

function leftCase(corpus: Corpus): BenchmarkCase {
  return {
    name: `cursor-restoration/left/${corpus.name}`,
    corpus,
    setup: (editor) => {
      editor.setText(corpus.text);
      editor.handleInput("$");
    },
    measure: (editor) => editor.handleInput("h"),
    assert: (editor) => {
      if (editor.getCursor().col !== corpus.text.length - 1)
        throw new Error("left cursor mismatch");
      if (editor.getText() !== corpus.text) throw new Error("left changed text");
    },
  };
}

function stripRenderFormatting(text: string): string {
  const escape = String.fromCharCode(27);
  return text
    .replaceAll(CURSOR_MARKER, "")
    .replaceAll(`${escape}[7m`, "")
    .replaceAll(`${escape}[0m`, "");
}

function renderCase(corpus: Corpus): BenchmarkCase {
  let expectedCursor: { line: number; col: number } | undefined;
  return {
    name: `long-line-render/warmed/${corpus.name}`,
    corpus,
    setup: (editor) => {
      editor.focused = true;
      editor.setText(corpus.text);
      editor.render(WIDTH);
      expectedCursor = editor.getCursor();
    },
    measure: (editor) => editor.render(WIDTH),
    assert: (editor, result) => {
      if (!Array.isArray(result) || result.length === 0) throw new Error("render returned no rows");
      if (result.length !== EXPECTED_RENDER_ROWS)
        throw new Error("render returned unexpected row count");
      const renderedText = result.map(stripRenderFormatting).join("\n");
      const expectedPrefix = corpus.kind === "mixed-single" ? "界🙂é" : "word";
      if (!renderedText.includes(expectedPrefix)) throw new Error("render omitted corpus content");
      for (const row of result) {
        if (visibleWidth(row) > WIDTH) throw new Error("render exceeded viewport width");
      }
      if (editor.getText() !== corpus.text) throw new Error("render changed text");
      if (!expectedCursor) throw new Error("render setup missing cursor");
      if (
        editor.getCursor().line !== expectedCursor.line ||
        editor.getCursor().col !== expectedCursor.col
      ) {
        throw new Error("render changed cursor");
      }
    },
  };
}

function buildCorpora(): Corpus[] {
  const asciiToken = "word ";
  const mixedToken = "界🙂é ";
  return [
    makeCorpus("ascii-single-100k", "ascii-single", 100_000, asciiToken),
    makeCorpus("ascii-single-1m", "ascii-single", 1_000_000, asciiToken),
    makeCorpus("mixed-single-100k", "mixed-single", 100_000, mixedToken),
    makeCorpus("mixed-single-1m", "mixed-single", 1_000_000, mixedToken),
    makeMultilineCorpus("ascii-multiline-100k", 100_000),
    makeMultilineCorpus("ascii-multiline-1m", 1_000_000),
  ];
}

function buildCases(corpora: Corpus[]): BenchmarkCase[] {
  const byName = new Map(corpora.map((corpus) => [corpus.name, corpus]));
  const scaling = [1_000, 5_000, 10_000, 25_000, 50_000].map((size) =>
    makeCorpus(`ascii-single-${size}`, "ascii-single", size, "word "),
  );
  const cases = scaling.map(wordBackwardCase);
  cases.push(wordBackwardCase(byName.get("ascii-single-100k")!));
  cases.push(wordBackwardCase(byName.get("mixed-single-100k")!));
  cases.push(leftCase(byName.get("ascii-single-100k")!));
  cases.push(leftCase(byName.get("mixed-single-100k")!));
  cases.push(bufferStartCase(byName.get("ascii-multiline-100k")!));
  cases.push(...corpora.map(renderCase));
  return cases;
}

function percentile(samples: number[], fraction: number): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
}

function summarize(samples: number[]): Timings {
  if (samples.length === 0) throw new Error("No benchmark samples");
  return {
    min: Math.min(...samples),
    p50: percentile(samples, 0.5),
    p95: percentile(samples, 0.95),
    max: Math.max(...samples),
  };
}

function measureCase(item: BenchmarkCase, runs: number, warmup: number): BenchmarkResult {
  for (let index = 0; index < warmup; index++) {
    const editor = createEditor();
    item.setup(editor);
    const result = item.measure(editor);
    item.assert(editor, result);
  }

  const samples: number[] = [];
  for (let index = 0; index < runs; index++) {
    const editor = createEditor();
    item.setup(editor);
    const start = Bun.nanoseconds();
    const result = item.measure(editor);
    const elapsed = Number(Bun.nanoseconds() - start) / 1_000_000;
    item.assert(editor, result);
    samples.push(elapsed);
  }

  return {
    name: item.name,
    corpus: corpusMetadata(item.corpus),
    runs,
    milliseconds: summarize(samples),
  };
}

function commandOutput(command: string[]): string {
  const result = Bun.spawnSync(command);
  if (result.exitCode !== 0) throw new Error(`Command failed: ${command.join(" ")}`);
  return new TextDecoder().decode(result.stdout).trim();
}

function parseArguments(argv: string[]): Arguments {
  const args: Arguments = { cases: [], runs: 3, warmup: 1 };
  for (let index = 0; index < argv.length; index++) {
    const value = argv[index];
    if (value === "--case") args.cases.push(argv[++index] ?? "");
    else if (value?.startsWith("--case=")) args.cases.push(value.slice("--case=".length));
    else if (value === "--output") args.output = argv[++index];
    else if (value?.startsWith("--output=")) args.output = value.slice("--output=".length);
    else if (value === "--profile") args.profile = argv[++index] as Arguments["profile"];
    else if (value?.startsWith("--profile="))
      args.profile = value.slice("--profile=".length) as Arguments["profile"];
    else if (value === "--runs") args.runs = Number(argv[++index]);
    else if (value?.startsWith("--runs=")) args.runs = Number(value.slice("--runs=".length));
    else if (value === "--warmup") args.warmup = Number(argv[++index]);
    else if (value?.startsWith("--warmup=")) args.warmup = Number(value.slice("--warmup=".length));
    else if (value === "--help") {
      console.log(
        "bun benchmark/run.ts [--case name] [--output path] [--runs n] [--warmup n] [--profile cursor-restoration|long-line-render]",
      );
      process.exit(0);
    } else if (value) throw new Error(`Unknown argument: ${value}`);
  }
  if (!Number.isInteger(args.runs) || args.runs < 1)
    throw new Error("--runs must be a positive integer");
  if (!Number.isInteger(args.warmup) || args.warmup < 0)
    throw new Error("--warmup must be non-negative");
  if (
    args.profile !== undefined &&
    !["cursor-restoration", "long-line-render"].includes(args.profile)
  ) {
    throw new Error(`Unsupported profile: ${args.profile}`);
  }
  return args;
}

function selectCases(
  cases: BenchmarkCase[],
  profile: Arguments["profile"],
  filters: string[],
): BenchmarkCase[] {
  const prefix = profile
    ? profile === "cursor-restoration"
      ? "cursor-restoration/"
      : "long-line-render/"
    : undefined;
  return cases.filter(
    (item) =>
      (!prefix || item.name.startsWith(prefix)) &&
      (filters.length === 0 || filters.some((filter) => item.name === filter)),
  );
}

async function run(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  const corpora = buildCorpora();
  const cases = selectCases(buildCases(corpora), args.profile, args.cases);
  if (cases.length === 0) throw new Error("No benchmark cases selected");
  const results = cases.map((item) => measureCase(item, args.runs, args.warmup));
  const output = {
    schemaVersion: 1,
    baseline: "pi-vimmode-0.9.0-pre-change",
    revision: commandOutput(["git", "rev-parse", "HEAD"]),
    runtime: {
      bun: Bun.version,
      os: `${platform()} ${release()} ${arch()}`,
      cpu: cpus()[0]?.model ?? "unknown",
    },
    viewport: { columns: WIDTH, rows: ROWS },
    profile: args.profile ?? "full",
    selection: args.cases.length > 0 ? args.cases : "all",
    corpora: corpora.map(corpusMetadata),
    results,
  };
  const json = `${JSON.stringify(output, null, 2)}\n`;
  if (args.output) {
    await mkdir(dirname(args.output), { recursive: true });
    await writeFile(args.output, json);
  } else {
    process.stdout.write(json);
  }
}

if (import.meta.main) await run();

export { buildCorpora, summarize };
