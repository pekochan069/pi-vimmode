import { type ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { registerVimLifecycle } from "./lifecycle.ts";

export default function piVimMode(pi: ExtensionAPI) {
  registerVimLifecycle(pi);
}
