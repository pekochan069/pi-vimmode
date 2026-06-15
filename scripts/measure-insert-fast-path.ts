import type { ModalState } from "../src/modal/types.ts";

import { DEFAULT_VIM_OPTIONS } from "../src/config.ts";
import { handleModalInput } from "../src/modal/engine.ts";
import { VimEditor } from "../src/vim-editor.ts";

const ITERATIONS = Number(Bun.env.PI_VIMMODE_INSERT_MEASURE_ITERATIONS ?? 2_000);
const LONG_PROMPT = Array.from({ length: 250 }, (_, index) => {
  return `line ${index}: ${"prompt text ".repeat(12)}`;
}).join("\n");

function createEditor() {
  const tui = {
    terminal: { rows: 24, write() {} },
    requestRender() {},
    showOverlay() {
      return {
        hide() {},
        setHidden() {},
        isHidden() {
          return false;
        },
        focus() {},
        unfocus() {},
        isFocused() {
          return true;
        },
      };
    },
    getShowHardwareCursor() {
      return false;
    },
    setShowHardwareCursor() {},
  } as any;
  const theme = { borderColor: (text: string) => text, selectList: {} } as any;
  const keybindings = {
    matches() {
      return false;
    },
    getKeys() {
      return [];
    },
    getDefinition() {
      return { defaultKeys: [] };
    },
    getConflicts() {
      return [];
    },
  } as any;
  const editor = new VimEditor(tui, theme, keybindings, DEFAULT_VIM_OPTIONS, { warnings: [] });
  editor.setText(LONG_PROMPT);
  return editor;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function measure(name: string, run: () => void) {
  const samples: number[] = [];
  for (let sample = 0; sample < 5; sample += 1) {
    const started = performance.now();
    run();
    samples.push(performance.now() - started);
  }
  console.log(`${name}: ${median(samples).toFixed(2)}ms median (${ITERATIONS} iterations)`);
}

console.log("pi-vimmode insert input local measurement");
console.log(`prompt bytes: ${LONG_PROMPT.length}`);
console.log("No CI threshold: compare local before/after numbers only.\n");

measure("snapshot reads (getText/getLines/getCursor)", () => {
  const editor = createEditor();
  for (let index = 0; index < ITERATIONS; index += 1) {
    editor.getText();
    editor.getLines();
    editor.getCursor();
  }
});

measure("modal delegate routing with prebuilt snapshot", () => {
  const editor = createEditor();
  const snapshot = {
    text: editor.getText(),
    lines: editor.getLines(),
    cursor: editor.getCursor(),
    isAutocompleteOpen: false,
    isMacroReplaying: false,
    isRedoAvailable: false,
  };
  for (let index = 0; index < ITERATIONS; index += 1) {
    handleModalInput({ mode: "insert" }, snapshot, DEFAULT_VIM_OPTIONS, "x");
  }
});

measure("default editor insertion only", () => {
  const editor = createEditor() as unknown as { delegateDefaultInput(input: string): void };
  for (let index = 0; index < ITERATIONS; index += 1) editor.delegateDefaultInput("x");
});

measure("fast handleInput path", () => {
  const editor = createEditor();
  for (let index = 0; index < ITERATIONS; index += 1) editor.handleInput("x");
});

measure("full modal fallback handleInput path", () => {
  const editor = createEditor() as unknown as {
    modalState: ModalState;
    handleInput(input: string): void;
  };
  for (let index = 0; index < ITERATIONS; index += 1) {
    editor.modalState = { mode: "insert", exMessage: { kind: "info", text: "measure" } };
    editor.handleInput("x");
  }
});
