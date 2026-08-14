import { defineConfig, devices } from "@playwright/test";

// E2E specs live in e2e/. Playwright starts the Vite preview server and drives Chromium.
export default defineConfig({
  testDir: "./e2e",
  // Screenshot baselines live in e2e/visual and only mean anything inside the pinned
  // Playwright image — they run from playwright.visual.config.ts instead.
  testIgnore: "visual/**",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Locally the list output is enough; in CI also write the HTML report the workflow
  // uploads as an artifact when the suite fails.
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
