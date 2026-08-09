/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Emit source maps so Sentry can symbolicate minified stack traces back to the TS source.
  build: { sourcemap: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
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
