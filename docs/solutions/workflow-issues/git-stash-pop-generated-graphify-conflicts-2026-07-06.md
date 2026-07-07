---
title: Recover git stash pop conflicts in generated graphify artifacts
date: 2026-07-06
category: docs/solutions/workflow-issues
module: pi-vimmode
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - "git stash pop leaves graphify-out generated files in UU conflict state"
  - "generated graph artifacts conflict with source or documentation changes"
  - "graphify artifacts must be consistent after conflict recovery"
tags:
  - git-stash
  - merge-conflicts
  - graphify
  - generated-artifacts
  - workflow-recovery
---

# Recover git stash pop conflicts in generated graphify artifacts

## Context

`git stash pop` can leave generated Graphify outputs conflicted while the real source change is already present. In this case, the conflicted files were all under `graphify-out/`:

- `graphify-out/.graphify_labels.json`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.json`
- `graphify-out/manifest.json`

The useful work was in source/docs files. The graph files were derived artifacts with conflict markers, so hand-merging them would be slow and easy to corrupt.

Session-history search found no relevant prior sessions for this exact problem.

## Guidance

Treat generated graph artifacts as rebuildable output. Resolve the Git conflict state, regenerate the graph from the current checkout, then stage the regenerated files.

```sh
git checkout --theirs -- \
  graphify-out/.graphify_labels.json \
  graphify-out/GRAPH_REPORT.md \
  graphify-out/graph.json \
  graphify-out/manifest.json

git add \
  graphify-out/.graphify_labels.json \
  graphify-out/GRAPH_REPORT.md \
  graphify-out/graph.json \
  graphify-out/manifest.json

graphify update .

git add \
  graphify-out/.graphify_labels.json \
  graphify-out/GRAPH_REPORT.md \
  graphify-out/graph.json \
  graphify-out/manifest.json
```

Verify conflict state and markers are gone:

```sh
git diff --name-only --diff-filter=U

grep -RIn '<<<<<<<\|=======\|>>>>>>>' \
  graphify-out/.graphify_labels.json \
  graphify-out/GRAPH_REPORT.md \
  graphify-out/graph.json \
  graphify-out/manifest.json
```

Expected result: both commands produce no conflict output.

If `graphify update .` creates a dated backup directory such as `graphify-out/2026-07-06/`, review whether it should be kept or removed before committing.

After a conflicted `stash pop`, the stash entry remains. Drop it only after confirming the recovered checkout contains everything needed:

```sh
git stash list
git stash drop stash@{0}
```

## Why This Matters

Generated JSON/report conflicts are high-noise and low-value to merge manually. The stable source of truth is the current codebase plus `graphify update .`. Regenerating produces a consistent graph and avoids leaving partial conflict resolutions inside large generated files.

The double `git add` is intentional: the first clears the unmerged index state so `graphify update .` can run against normal files; the second stages the regenerated artifacts.

## When to Apply

- `git status` shows `UU graphify-out/*` after `git stash pop` or `git stash apply`.
- Conflict markers appear in generated Graphify files.
- Source/docs changes are the real work, and graph artifacts only need to match the final checkout.

Do not use this blindly for hand-authored files. For source code, specs, docs, or OpenSpec files, inspect and merge the content deliberately.

## Examples

Before recovery:

```text
UU graphify-out/.graphify_labels.json
UU graphify-out/GRAPH_REPORT.md
UU graphify-out/graph.json
UU graphify-out/manifest.json
```

After recovery:

```sh
git diff --name-only --diff-filter=U
# no output
```

## Related

- [Pi vimmode read-only popup shared seam](../architecture-patterns/pi-vimmode-read-only-popup-shared-seam-2026-06-12.md) — related only because it uses `graphify update .` as validation.
- [Pi vimmode UI config single source of truth](../tooling-decisions/pi-vimmode-ui-config-single-source-of-truth-2026-05-27.md) — adjacent generated-artifact hygiene guidance.
- [Do not touch agent settings JSON](../conventions/do-not-touch-agent-settings-json-2026-05-28.md) — adjacent workflow guardrail for not bulk-editing generated/config state.
