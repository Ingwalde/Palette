/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  // "hidden": emit source maps for Sentry to symbolicate with, but omit the sourceMappingURL
  // comment so browsers never request them. The Dockerfile deletes them before they reach
  // nginx — a plain `true` published the entire TypeScript source at /assets/*.map.
  build: { sourcemap: "hidden" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Has to exceed the 5s asyncUtilTimeout set in the setup file, or a slow `findBy` would
    // fail the test on the runner's budget before its own wait expired.
    testTimeout: 15000,
    // Playwright specs live under e2e/ and run with their own runner, not Vitest.
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/main.tsx",
        "src/**/*.d.ts",
        "src/types/**",
        // Canvas PNG rendering is verified by the Playwright/axe E2E — jsdom has no 2D context,
        // so unit-"covering" it would just execute draw calls against a fake ctx (vanity coverage).
        "src/lib/exportGenerators.ts",
      ],
      // Floor for everything except the canvas renderer (E2E-covered). Kept just under the
      // achieved numbers so it ratchets against regressions.
      thresholds: { lines: 78, functions: 70, statements: 75, branches: 68 },
    },
  },
});
