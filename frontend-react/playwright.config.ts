import { defineConfig, devices } from "@playwright/test";

// E2E specs live in e2e/. Playwright starts the Vite preview server and drives Chromium.
export default defineConfig({
  testDir: "./e2e",
  // Two sibling suites are deliberately not run from here, because both need something this
  // config does not provide. Screenshot baselines only mean anything inside the pinned
  // Playwright image (playwright.visual.config.ts); the integration specs need the whole
  // Compose stack rather than the preview server and a stubbed API
  // (playwright.integration.config.ts, started by scripts/integration.sh). The third,
  // screenshots/, is a generator: it writes into docs/assets and would be wrong to run on a PR.
  testIgnore: ["visual/**", "integration/**", "screenshots/**"],
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
