import { defineConfig, devices } from "@playwright/test";

// Screenshot baselines, kept separate from the functional e2e config.
//
// Rendering is host-dependent — font hinting and antialiasing differ between Windows, macOS
// and the CI runner — so baselines are only meaningful when they are produced and compared in
// one fixed environment. That environment is the official Playwright image pinned to the
// version in package.json:
//
//   npm run test:visual           # compare
//   npm run test:visual:update    # re-record after an intended visual change
//
// Both wrap docker; CI runs this config inside the same image (see the `visual` job).
export default defineConfig({
  testDir: "./e2e/visual",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // No retries: a screenshot diff is deterministic, so a retry only hides flakiness.
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  expect: {
    toHaveScreenshot: {
      // Zero, not a percentage. A 1% allowance sounds harmless but scales with page height:
      // the same broken component was 3% of the admin page and under 1% of the taller home
      // page, so home passed while admin failed. Per-pixel antialiasing is already absorbed by
      // `threshold`; this one only decides how many pixels may differ outright, and the answer
      // is none.
      maxDiffPixelRatio: 0,
      animations: "disabled",
      caret: "hide",
      scale: "css",
      // Neutralises sticky positioning, which otherwise never settles on a full-page shot.
      stylePath: "./e2e/visual/screenshot.css",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: "npm run build && npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
