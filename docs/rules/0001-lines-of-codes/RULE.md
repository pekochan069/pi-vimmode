---
name: lines-of-codes
description: Keep functions small and readable
alwaysApply: true
globs: []
---

# Lines of Codes Rules

- Keep functions and methods at 100 lines or fewer whenever possible.
- This rule mainly applies to application code in `*.js` or `*.ts`.
- Count lines from the function declaration to its closing brace.
- Include blank lines, comments, template markup, and inline objects in the count.
- Do not treat extracted constants, hooks, or helpers in other files as part of the same line count.
- If a function approaches the limit, extract functions, helpers, types, or config objects instead of adding more branching inline.
- If a function approaches the limit, split responsibilities into smaller private helpers with clear names.
- Do not bypass this rule with large inline objects, deeply nested conditionals, or long blocks.
- Generated files, external vendor code, and snapshot-style outputs are excluded.
- If exceeding the limit is truly unavoidable, call it out explicitly and explain why the code should stay together.
