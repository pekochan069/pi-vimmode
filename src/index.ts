import { type ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { registerVimLifecycle } from "./lifecycle.ts";

export { loadCurrentRelease } from "./release-notes.ts";

export default function piVimMode(pi: ExtensionAPI) {
  registerVimLifecycle(pi);
}
