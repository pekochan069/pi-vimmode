import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["eslint", "jsdoc", "node", "oxc", "promise", "typescript", "unicorn"],
  categories: {
    correctness: "error",
  },
  env: {
    builtin: true,
  },
});
