import { test, expect, type Page } from "@playwright/test";

/**
 * Walks the exact URLs the backend puts in outgoing email.
 *
 * These paths are built in backend/app/email_service.py. nginx serves index.html for any
 * unknown path, so a wrong one does not 404 — React Router falls through to its `path="*"`
 * catch-all and renders the "Not found" placeholder. Nothing in a status-code smoke check
 * would notice. That is exactly how /verify.html and /reset-password.html survived the
 * removal of the vanilla frontend and broke both flows in production.
 *
 * backend/tests/test_email_links.py pins the same paths from the other side.
 */
const EMAILED_PATHS = {
  verify: "/verify?token=e2e-token",
  resetPassword: "/reset-password?token=e2e-token",
};

async function stubApi(page: Page) {
  await page.route("**/api/v1/auth/me", (r) =>
    r.fulfill({ status: 401, json: { detail: "Not authenticated" } }),
  );
  // The token is fake, so the backend would reject it. The page still has to render.
  await page.route("**/api/v1/auth/verify*", (r) =>
    r.fulfill({ status: 400, json: { detail: "Invalid or expired verification link" } }),
  );
}

test.beforeEach(async ({ page }) => {
  await stubApi(page);
});

test("the verification link lands on the verify page", async ({ page }) => {
  await page.goto(EMAILED_PATHS.verify);

  await expect(page.getByRole("heading", { name: "Not found" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /verifying your email|verification failed/i }),
  ).toBeVisible();
});

test("the password reset link lands on the reset form", async ({ page }) => {
  await page.goto(EMAILED_PATHS.resetPassword);

  await expect(page.getByRole("heading", { name: "Not found" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /choose a new password/i }),
  ).toBeVisible();
  // The token reached the form: without one the page offers to request a new link instead.
  await expect(page.getByRole("heading", { name: /reset link is missing/i })).toHaveCount(
    0,
  );
});

test("the old vanilla paths would have failed this check", async ({ page }) => {
  // Documents what the regression looked like, and proves the assertion above can fail.
  await page.goto("/verify.html?token=e2e-token");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
});
