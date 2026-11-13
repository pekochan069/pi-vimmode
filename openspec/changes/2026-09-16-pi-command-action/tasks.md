## 1. Registry and configuration

- [x] 1.1 Add the finite `pi.command` registry entry and required command validator.
- [x] 1.2 Extend JSON action bindings, types, metadata, and trusted JavaScript descriptors.
- [x] 1.3 Add tests for valid command args, malformed args, and Normal-only scopes.

## 2. Semantic and modal dispatch

- [x] 2.1 Resolve `pi.command` through the existing semantic keymap grammar.
- [x] 2.2 Emit `dispatchPiCommand` only from a Normal-mode action result.
- [x] 2.3 Add resolver and modal effect tests.

## 3. Pi editor adapter

- [x] 3.1 Submit through the inherited editor callback and report an unavailable callback.
- [x] 3.2 Restore draft, cursor, local redo, and guarded host undo depth in `finally`.
- [x] 3.3 Restore an asynchronously cleared draft after thenable settlement without overwriting non-empty later input.
- [x] 3.4 Limit command dispatch to one active submit per editor and report competing triggers.
- [x] 3.5 Surface synchronous and asynchronous submit failures as runtime errors and test restoration.

## 4. Prompt-command draft session

- [x] 4.1 Add the finite `pi.commandPrompt` registry entry and Normal-only JSON/JavaScript bindings.
- [x] 4.2 Prepare a temporary editable slash-command draft and restore it on Escape or submit.
- [x] 4.3 Preserve autocomplete Escape behavior and guard temporary submits with existing single-flight dispatch.
- [x] 4.4 Add configuration, resolver, editor restoration, and unavailable-dispatch tests.

## 5. Documentation and validation

- [x] 5.1 Document JSON and trusted JavaScript examples.
- [x] 5.2 Regenerate the config reference and run repository validation gates.
