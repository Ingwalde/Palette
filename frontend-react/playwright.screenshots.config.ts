import { defineConfig, devices } from "@playwright/test";

/**
 * Capture config for the README and wiki images — a generator, not a test suite.
 *
 * Kept apart from playwright.config.ts because these specs write into docs/assets/ and would
 * be actively wrong to run on a pull request. The default config ignores this directory, the
 * same way it ignores visual/ and integration/.
 *
 * Serial, because the admin capture signs in and the three share one running stack.
 */
export default defineConfig({
  testDir: "./e2e/screenshots",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: process.env.SCREENSHOT_BASE_URL ?? "http://localhost:5500",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
