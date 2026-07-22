import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["eslint", "jsdoc", "node", "oxc", "promise", "typescript", "unicorn"],
  rules: {
    "typescript/no-deprecated": "error",
  },
  categories: {
    correctness: "error",
  },
  env: {
    builtin: true,
  },
});
