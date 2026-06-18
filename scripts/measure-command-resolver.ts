import type { ResolvedVimKeymap } from "../src/types.ts";

import { resolveNormalCommand } from "../src/commands.ts";
import { DEFAULT_VIM_KEYMAP, resolveVimOptions } from "../src/config.ts";

type Step = { key: string; pending?: string };

type Scenario = {
  name: string;
  keymap: ResolvedVimKeymap;
  steps: readonly Step[];
};

const configuredKeymap =
  resolveVimOptions({
    piVimMode: {
      keymap: {
        operators: { delete: ["qq"], change: ["cc"] },
        motions: { left: ["H"], wordForward: ["ef"] },
        commands: {
          startSearch: ["ss"],
          findCharForward: ["gf"],
          repeatCharSearch: ["rr"],
          showKeybindings: ["gk"],
        },
        textObjects: {
          kinds: { inner: ["I"] },
          targets: { codeFence: ["F"] },
        },
        actions: { "prompt.transform.reflow": ["gq", { key: "gQ", args: { width: 72 } }] },
      },
    },
  }).options.keymap ?? DEFAULT_VIM_KEYMAP;

const scenarios: readonly Scenario[] = [
  {
    name: "default keymap",
    keymap: DEFAULT_VIM_KEYMAP,
    steps: [
      { key: "g" },
      { key: "g", pending: "g" },
      { key: "w" },
      { key: "d" },
      { key: "w", pending: "d" },
      { key: "/", pending: "d" },
      { key: "f", pending: "d" },
      { key: ";", pending: "d" },
      { key: "i", pending: "c" },
      { key: "w", pending: "c\u0000textobj\u0000inner\u0000" },
      { key: "3" },
      { key: "w", pending: "3\u0000count\u0000" },
      { key: "r" },
      { key: "x", pending: "replaceChar\u0000char\u0000" },
      { key: "x", pending: "g" },
    ],
  },
  {
    name: "configured keymap",
    keymap: configuredKeymap,
    steps: [
      { key: "q" },
      { key: "q", pending: "q" },
      { key: "e", pending: "qq" },
      { key: "f", pending: "qq\u0000motion\u0000e\u0000motion\u0000" },
      { key: "g" },
      { key: "q", pending: "g" },
      { key: "Q", pending: "g" },
      { key: "s" },
      { key: "s", pending: "s" },
      { key: "g", pending: "qq" },
      {
        key: "f",
        pending: "qq\u0000opchar\u0000g\u0000opchar\u0000\u0000opchar\u0000\u0000opchar\u0000",
      },
      { key: "r", pending: "qq" },
      { key: "r", pending: "qq\u0000opcharrepeat\u0000r\u0000opcharrepeat\u0000" },
      { key: "I", pending: "cc" },
      { key: "F", pending: "cc\u0000textobj\u0000inner\u0000" },
    ],
  },
];

const iterations = Number(process.env.ITERATIONS ?? 100_000);
const warmupIterations = Math.max(1_000, Math.floor(iterations / 10));

function runScenario(scenario: Scenario, count: number): void {
  for (let index = 0; index < count; index += 1) {
    const step = scenario.steps[index % scenario.steps.length]!;
    resolveNormalCommand(step.key, step.pending, scenario.keymap);
  }
}

function measure(scenario: Scenario): void {
  runScenario(scenario, warmupIterations);
  const started = performance.now();
  runScenario(scenario, iterations);
  const elapsed = performance.now() - started;
  const opsPerSecond = Math.round(iterations / (elapsed / 1000));
  console.log(
    `${scenario.name}: ${elapsed.toFixed(2)}ms for ${iterations.toLocaleString()} resolutions (${opsPerSecond.toLocaleString()} ops/sec)`,
  );
}

console.log("pi-vimmode normal command resolver local measurement");
console.log(`iterations: ${iterations.toLocaleString()}`);
for (const scenario of scenarios) measure(scenario);
