import type { EditorSnapshot, ModalOptions, ModalState } from "../src/modal/types.ts";
import type { ResolvedVimEditorOptions, VimDiagnostics } from "../src/types.ts";

import { createVimConfigPlan, DEFAULT_VIM_OPTIONS } from "../src/config.ts";
import { handleModalInput } from "../src/modal/engine.ts";

export function handleModalInputWithOptions(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
  diagnostics: VimDiagnostics = { warnings: [] },
) {
  const plan = createVimConfigPlan(
    { ...DEFAULT_VIM_OPTIONS, ...options } as ResolvedVimEditorOptions,
    diagnostics.warnings,
  );
  return handleModalInput(state, snapshot, plan, data, diagnostics);
}
