import { describe, expect, test } from "bun:test";

import { buildCorpora, summarize } from "../benchmark/run.ts";

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
  });
});
