import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["eslint", "jsdoc", "node", "oxc", "promise", "typescript", "unicorn"],
  jsPlugins: ["oxlint-plugin-complexity"],
  rules: {
    "typescript/no-deprecated": "error",
    "complexity/complexity": [
      "error",
      {
        cyclomatic: 20,
        cognitive: 15,
      },
    ],
  },
  categories: {
    correctness: "error",
  },
  env: {
    builtin: true,
  },
});
