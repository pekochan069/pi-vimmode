# 0.9.0 performance baseline

Dependency-free production-path benchmark for pi-vimmode. Harness generates corpora in memory; no generated prompt files are committed.

Reproduce committed pre-change evidence:

```sh
bun benchmark/run.ts --runs=1 --warmup=0 \
  --case cursor-restoration/word-backward/ascii-single-1000 \
  --case cursor-restoration/word-backward/ascii-single-5000 \
  --case cursor-restoration/word-backward/ascii-single-10000 \
  --case cursor-restoration/left/ascii-single-100k \
  --case cursor-restoration/left/mixed-single-100k \
  --case long-line-render/warmed/ascii-single-100k \
  --case long-line-render/warmed/ascii-single-1m \
  --case long-line-render/warmed/mixed-single-100k \
  --case long-line-render/warmed/mixed-single-1m \
  --case long-line-render/warmed/ascii-multiline-100k \
  --case long-line-render/warmed/ascii-multiline-1m \
  > benchmark/results/0.9.0-pre-change.json
```

Harness measures `VimEditor.handleInput` through modal dispatch and installed Pi `CustomEditor`, plus warmed `VimEditor.render`, at an 80×40 viewport. Setup, corpus generation, warmup, editor construction, reset, and assertions stay outside timed regions. Each measured operation asserts text, cursor, mode, or rendered row width.

Corpus matrix:

- 100k and 1m UTF-16-code-unit ASCII single lines
- 100k and 1m mixed-width single lines (`界`, emoji, combining mark)
- 100k and 1m ASCII multi-line prompts; 1m uses 20k lines
- 1k, 5k, 10k, 25k, 50k, and 100k cursor-restoration scaling cases

Output records revision, Bun, OS, CPU, viewport, corpus code units, line count, run count, min, p50, p95, and max milliseconds. Percentiles use nearest rank. Absolute values are reference evidence for matching environments, not CI latency gates. `--case` selects exact cases; committed JSON records its selection. Full pre-change word restoration is intentionally slow under current implementation, so focused runs are available.

Focused CPU profiles use Bun's 100 µs sampling interval. Keep cursor restoration and rendering separate:

```sh
bun --cpu-prof --cpu-prof-interval=100 --cpu-prof-name=cursor-restoration.cpuprofile \
  benchmark/run.ts --profile cursor-restoration --runs=1

bun --cpu-prof --cpu-prof-interval=100 --cpu-prof-name=long-line-render.cpuprofile \
  benchmark/run.ts --profile long-line-render --runs=1
```

Benchmark, corpus, profile, and result assets are repository-only. Package build uses an explicit allowlist and package verification rejects these asset classes.
