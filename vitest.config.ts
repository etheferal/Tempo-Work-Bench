import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    // NOTE: no setupFiles & plain pools — DOM matchers are imported directly
    // by the component test. On some Windows machines whose project path
    // contains non-ASCII characters, `npm test` can hit a Vite URL-resolution
    // bug inside jsdom setup; in that case run pure-logic tests with:
    //   npx vitest run --environment=node src/lib
    // CI (GitHub Actions, Ubuntu) runs the full suite without any issues.
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
