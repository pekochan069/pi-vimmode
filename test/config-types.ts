import type {
  VimActionDescriptor,
  VimConfig,
  VimConfigApi,
  VimModeAlias,
} from "../src/vim-config.d.ts";

const allModes: readonly VimModeAlias[] = [
  "i",
  "insert",
  "n",
  "normal",
  "v",
  "x",
  "visual",
  "visualLine",
  "visualBlock",
  "o",
  "operatorPending",
  "operator-pending",
];

const helper = (vim: VimConfigApi): void => {
  vim.preset = "minimal";
  vim.leader = ",";
  vim.g.mapleader = null;
  vim.startMode = "insert";
  vim.cursor.insert = "underline";
  vim.cursor.normal = "block";
  vim.cursor.visual = "bar";
  vim.cursor.visualLine = "underline";
  vim.cursor.visualBlock = "block";

  vim.keymap.actionPresets = ["paragraph-editing", "markdown-wrapping"];
  vim.keymap.operatorMotions = { delete: ["wordForward", "wordEnd"] };
  vim.keymap.set(allModes, "<leader>x", null, {
    allowProtected: true,
    desc: "unmap",
  });
  vim.keymap.set("n", "<esc>", vim.action.escape(), { desc: "escape" });
  vim.keymap.set("n", "zz", "j", { desc: "remap" });
  vim.keymap.set("n", "zu", null);

  vim.ui.status.enabled = false;
  vim.ui.status.position = "left";
  vim.ui.status.items = ["mode", "pendingOperator", "selection", "cursorPosition"];
  vim.ui.mode.enabled = true;
  vim.ui.mode.labels = { normal: "NORMAL" };
  vim.ui.mode.narrowLabels = { normal: "N" };
  vim.ui.selection.enabled = true;
  vim.ui.selection.previewMaxChars = 80;
  vim.ui.cursorPosition.enabled = true;
  vim.ui.cursorPosition.base = 1;
  vim.ui.cursorPosition.format = "{line}:{column}";
  vim.ui.workbench.reservedRows = 2;

  vim.macros.enabled = true;
  vim.macros.slots = ["a"];
  vim.macros.maxReplaySteps = 100;
  vim.marks.enabled = true;
  vim.marks.slots = ["a"];
  vim.search.highlight = true;
  vim.search.highlightCurrent = true;
  vim.search.clearOnCancel = true;
  vim.search.clearOnInsert = true;
  vim.search.maxHighlights = 20;
  vim.exCommand.autocomplete = true;
  vim.feedback.noop = "off";
  vim.promptStructures.enabled = true;
  vim.promptStructures.targets = { codeFence: true };
  vim.promptTransforms.enabled = true;
  vim.promptTransforms.actions = { quote: true };
  vim.promptTransforms.commands = { quote: ["quoteit"] };

  const descriptor: VimActionDescriptor = vim.action.operator.delete();
  vim.keymap.set("n", "dd", descriptor);
  vim.keymap.set("o", "w", vim.action.motion.wordForward());
  vim.keymap.set("n", "x", vim.action.command.deleteChar());
  vim.keymap.set("n", "q", vim.action.macro.record());
  vim.keymap.set("n", "m", vim.action.mark.set());
  vim.keymap.set("i", "x", vim.action.insert.deleteWordBackward());
  vim.keymap.set("o", "iw", vim.action.textObject.kind.inner());
  vim.keymap.set("o", "aw", vim.action.textObject.target.word());
  vim.keymap.set("v", "zq", vim.action.prompt.transform.reflow({ width: 88 }));
  vim.keymap.set("v", "zf", vim.prompt.fence({ language: "ts" }));
  vim.keymap.set("v", "zr", vim.prompt.reflow());
  vim.keymap.set("i", "<A-w>", vim.prompt.deleteWordBackward());
  vim.keymap.set("n", "e", vim.action.command.easymotion.goToChar());
};

const syncConfig: VimConfig = helper;
const asyncConfig: VimConfig = async (vim) => {
  helper(vim);
};

void syncConfig;
void asyncConfig;
