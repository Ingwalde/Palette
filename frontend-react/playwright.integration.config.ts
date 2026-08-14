import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end against the real stack: nginx, the FastAPI backend, PostgreSQL and Redis.
 *
 * The specs under e2e/ intercept every request with page.route. That makes them fast and
 * independent, and it means they cannot notice when the front end and the API stop agreeing —
 * a renamed field, a changed status code, a cookie that is no longer set. The stub says what
 * the test author believed the API does. These say what it does.
 *
 * No webServer here: scripts/integration.sh owns the stack's lifetime, because bringing up
 * Compose and tearing it down again is not something a per-process webServer can do.
 * Serial, single worker, because these tests share one database and create real rows in it.
 */
export default defineConfig({
  testDir: "./e2e/integration",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  use: {
    baseURL: process.env.INTEGRATION_BASE_URL ?? "http://localhost:5500",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
