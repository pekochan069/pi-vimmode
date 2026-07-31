import { describe, expect, test } from "bun:test";

import {
  buildCases,
  buildCorpora,
  createOutput,
  measureCase,
  selectCases,
  summarize,
  type BenchmarkCase,
} from "../benchmark/run.ts";

describe("benchmark corpus", () => {
  test("covers exact production corpus sizes", () => {
    expect(buildCorpora().map(({ name, codeUnits }) => [name, codeUnits])).toEqual([
      ["ascii-single-100k", 100_000],
      ["ascii-single-1m", 1_000_000],
      ["mixed-single-100k", 100_000],
      ["mixed-single-1m", 1_000_000],
      ["ascii-multiline-100k", 100_000],
      ["ascii-multiline-1m", 1_000_000],
    ]);
  });

  test("summarizes nearest-rank percentiles", () => {
    expect(summarize([4, 1, 3, 2])).toEqual({ min: 1, p50: 2, p95: 4, max: 4 });
    expect(summarize([1, 2, 3, 4, 5, 6])).toEqual({ min: 1, p50: 3, p95: 6, max: 6 });
  });

  test("selects exact cases within profile", () => {
    const cases = buildCases(buildCorpora());
    const name = "cursor-restoration/prompt-search-repeat/ascii-single-100k";
    expect(selectCases(cases, "cursor-restoration", [name]).map((item) => item.name)).toEqual([
      name,
    ]);
    expect(selectCases(cases, "long-line-render", [name])).toEqual([]);
  });

  test("emits release-gate metadata", () => {
    const output = createOutput(
      { cases: [], runs: 30, warmup: 10 },
      buildCorpora(),
      [
        {
          name: "case",
          corpus: { name: "corpus", kind: "ascii-single", codeUnits: 100_000, lines: 1 },
          runs: 30,
          warmup: 10,
          correctness: "passed",
          milliseconds: { min: 1, p50: 2, p95: 3, max: 4 },
        },
      ],
      {
        revision: "revision",
        runtime: { bun: "1.0", os: "test", cpu: "test" },
        viewport: { columns: 80, rows: 40 },
      },
    );
    expect(output).toMatchObject({
      revision: "revision",
      environment: { runtime: { bun: "1.0", os: "test", cpu: "test" } },
      samples: 30,
      warmups: 10,
      results: [{ runs: 30, warmup: 10, correctness: "passed", milliseconds: { p50: 2, p95: 3 } }],
    });
  });

  test("stops on correctness assertion failure", () => {
    const item: BenchmarkCase = {
      name: "broken",
      corpus: { name: "corpus", kind: "ascii-single", text: "text", codeUnits: 4, lines: 1 },
      setup: () => {},
      measure: () => undefined,
      assert: () => {
        throw new Error("incorrect result");
      },
    };
    expect(() => measureCase(item, 1, 0)).toThrow("incorrect result");
  });
});
