# 0.9.0 performance baseline

Run from repository root:

```sh
bun run benchmark:baseline
```

This writes `benchmark/results/0.9.0-pre-change.json`. Harness uses production `VimEditor` entry points at an 80×40 viewport:

- normal-mode renders exercise pi-vimmode renderer;
- exact-mark jumps exercise modal engine and cursor restoration through Pi's installed editor base class;
- insert-mode input exercises `VimEditor` fast delegation into Pi's installed editor behavior.

Corpora include 100k and 1m UTF-16 code-unit ASCII single-line, equal-size ASCII multi-line, and mixed-width Unicode prompts. Cursor-restoration cases use 100, 1k, and 10k code units. Corpus/editor setup and correctness assertions stay outside timed regions. Default run records 20 samples after one warmup. Revision metadata also reports whether production source differed from that commit.

## CPU profiles

Use separate profiles with 100 µs sampling:

```sh
bun --cpu-prof --cpu-prof-interval=100 --cpu-prof-name=cursor-restoration.cpuprofile benchmark/perf-baseline.ts --only cursor-restoration/ascii-single/10000 --runs 1 --warmup 0 --output /tmp/pi-vimmode-cursor-profile.json
bun --cpu-prof --cpu-prof-interval=100 --cpu-prof-name=long-line-render.cpuprofile benchmark/perf-baseline.ts --only vim-render/ascii-single/1000000 --runs 1 --warmup 0 --output /tmp/pi-vimmode-render-profile.json
```

Profiles and benchmark assets remain repository-only. `package.json` uses an explicit publish allowlist, and package verification rejects benchmark/profile/result paths.
