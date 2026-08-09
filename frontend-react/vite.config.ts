/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
        "src/vite-env.d.ts",
        "src/types/**",
        // DOM/canvas-heavy pages are covered by the Playwright E2E + axe suites, not unit tests
        // (jsdom can't meaningfully exercise the canvas export or the admin CRUD UI).
        "src/pages/AdminPage.tsx",
        "src/pages/ExportPage.tsx",
        "src/pages/ProfilePage.tsx",
        "src/pages/VerifyPage.tsx",
        "src/pages/ForgotPasswordPage.tsx",
        "src/pages/ResetPasswordPage.tsx",
        "src/pages/ChangelogPage.tsx",
        "src/pages/PlaceholderPage.tsx",
        "src/lib/exportGenerators.ts",
      ],
      // Floor for the unit-tested core (utils, hooks, api, auth, key components + pages).
      // The DOM/canvas-heavy pages excluded above are covered by the Playwright/axe E2E suites.
      thresholds: { lines: 60, functions: 52, statements: 58, branches: 42 },
    },
  },
});
