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
  },
});
