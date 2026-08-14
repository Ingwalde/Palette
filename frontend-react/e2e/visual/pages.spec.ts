import { test, expect, type Page } from "@playwright/test";

/**
 * Baselines recorded before the CSS migration to vanilla-extract.
 *
 * The functional specs assert that markup and accessibility survive; they say nothing about a
 * shifted margin, a lost shadow or a broken grid — which is exactly what rewriting 2300 lines
 * of global CSS puts at risk. These do.
 *
 * A failure here is a question, not a chore: open the diff in playwright-report and decide
 * whether the change was intended before re-recording.
 */

const ADMIN = {
  id: 1,
  username: "admin",
  email: "admin@example.com",
  is_admin: true,
  email_verified: true,
  created_at: "2026-01-01T00:00:00Z",
};

const PALETTES = {
  items: [
    {
      id: 1,
      slug: "sea-breeze",
      name: "Sea Breeze",
      description: "Fresh blue and green colors inspired by the sea.",
      colors: ["#006D77", "#0F9199", "#83C5BE", "#EDE7C8"],
      tags: ["cold", "sea", "calm"],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: 2,
      slug: "desert-clay",
      name: "Desert Clay",
      description: "Warm earthy browns fading into soft sand.",
      colors: ["#6A4A32", "#A9744F", "#C89B7B"],
      tags: ["earth", "warm"],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
  total: 2,
  limit: 100,
  offset: 0,
};

const TAGS = [
  { name: "cold", kind: "free", count: 1 },
  { name: "warm", kind: "purpose", count: 1 },
];

async function stub(page: Page, { loggedIn }: { loggedIn: boolean }) {
  await page.route("**/api/v1/palettes*", (r) => r.fulfill({ json: PALETTES }));
  await page.route("**/api/v1/tags", (r) => r.fulfill({ json: TAGS }));
  await page.route("**/api/v1/favorites", (r) => r.fulfill({ json: PALETTES.items }));
  await page.route("**/api/v1/favorites/keys", (r) =>
    r.fulfill({ json: ["sea-breeze"] }),
  );
  await page.route("**/api/v1/auth/verify*", (r) =>
    r.fulfill({ status: 400, json: { detail: "Invalid or expired verification link" } }),
  );
  await page.route("**/api/v1/auth/me", (r) =>
    loggedIn
      ? r.fulfill({ json: ADMIN })
      : r.fulfill({ status: 401, json: { detail: "Not authenticated" } }),
  );
}

// Web fonts arrive asynchronously; screenshotting before they settle swaps the typeface
// mid-capture and produces a diff on every run.
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

async function open(page: Page, path: string, loggedIn = false) {
  await stub(page, { loggedIn });
  await page.goto(path, { waitUntil: "networkidle" });
  await settle(page);
}

// fullPage by default. The changelog is the exception: it is one card component repeated
// down the entire version history, so a full-page baseline is 700 KB of the same five CSS
// rules proving themselves over and over. The viewport covers it.
type Route = { name: string; path: string; fullPage?: boolean };

const GUEST_ROUTES: Route[] = [
  { name: "home", path: "/" },
  { name: "login", path: "/login" },
  { name: "favorites-logged-out", path: "/favorites" },
  { name: "export", path: "/export" },
  { name: "changelog", path: "/changelog", fullPage: false },
  { name: "forgot-password", path: "/forgot-password" },
  { name: "reset-password", path: "/reset-password?token=baseline" },
  { name: "verify-failed", path: "/verify?token=baseline" },
  { name: "not-found", path: "/no-such-page" },
];

for (const { name, path, fullPage = true } of GUEST_ROUTES) {
  test(`guest ${name}`, async ({ page }) => {
    await open(page, path);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage });
  });
}

const ADMIN_ROUTES: Route[] = [
  { name: "profile", path: "/profile" },
  { name: "admin", path: "/admin" },
];

for (const { name, path, fullPage = true } of ADMIN_ROUTES) {
  test(`admin ${name}`, async ({ page }) => {
    await open(page, path, true);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage });
  });
}

// --- States only reachable through interaction -----------------------------------------
// Coverage tools and route-level screenshots both miss these, and they carry some of the
// fiddliest CSS in the project.
//
// Located by role and accessible name, never by CSS class: the whole point of the migration
// is that class names become generated hashes, so a class-based locator would break on the
// commit that moves its component.

test("state: sort select open", async ({ page }) => {
  await open(page, "/");
  const sort = page.getByRole("button", { name: "Sort palettes" });
  await sort.click();
  await expect(sort).toHaveAttribute("aria-expanded", "true");
  await expect(page).toHaveScreenshot("state-select-open.png");
});

test("state: password revealed", async ({ page }) => {
  await open(page, "/login");
  // A password input has no implicit ARIA role, so it is not reachable by getByRole.
  const input = page.locator('input[type="password"]').first();
  await input.fill("hunter2");
  await page.getByRole("button", { name: "Show password" }).first().click();
  await expect(page.getByRole("button", { name: "Hide password" }).first()).toBeVisible();
  await expect(page).toHaveScreenshot("state-password-revealed.png");
});

test("state: home with no results", async ({ page }) => {
  // The home grid has its own empty branches. They went unstyled for several commits because
  // no baseline stubs an empty palette list — the page shot always has results.
  await stub(page, { loggedIn: false });
  await page.route("**/api/v1/palettes*", (r) =>
    r.fulfill({ json: { items: [], total: 0, limit: 100, offset: 0 } }),
  );
  await page.goto("/", { waitUntil: "networkidle" });
  await settle(page);
  await expect(page.getByRole("heading", { name: "No palettes found" })).toBeVisible();
  await expect(page).toHaveScreenshot("state-home-empty.png", { fullPage: true });
});

test("state: error toast", async ({ page }) => {
  // Nothing else in the suite renders a toast, so without this the toast styles migrate
  // with no visual cover at all.
  await stub(page, { loggedIn: false });
  await page.route("**/api/v1/auth/reset-password", (r) =>
    r.fulfill({
      status: 400,
      json: { detail: "Invalid or expired password reset link" },
    }),
  );
  await page.goto("/reset-password?token=baseline", { waitUntil: "networkidle" });
  await settle(page);

  const passwords = page.locator('input[type="password"]');
  await passwords.nth(0).fill("newpassword1");
  await passwords.nth(1).fill("newpassword1");
  await page.getByRole("button", { name: "Reset password" }).click();

  // The same message lands inline and in the toast; role="status" is the toast.
  await expect(page.getByRole("status")).toHaveText(
    "Invalid or expired password reset link",
  );
  await settle(page);
  await expect(page).toHaveScreenshot("state-error-toast.png");
});

test("admin tags view", async ({ page }) => {
  // The tag editor, chips, suggestions and badges live only behind this tab, and nothing
  // else in the suite renders them. Recorded before their rules move.
  await open(page, "/admin", true);
  await page.getByRole("tab", { name: "Tags" }).click();
  await expect(page.getByRole("heading", { name: /tags/i }).first()).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("admin-tags.png", { fullPage: true });
});

test("state: palette editor with colours", async ({ page }) => {
  // The colour-row editor: pickers, hex inputs, remove buttons and the tag chips beside them.
  await open(page, "/admin", true);
  await page.getByRole("button", { name: "Edit" }).first().click();
  await settle(page);
  await expect(page).toHaveScreenshot("state-palette-editor.png", { fullPage: true });
});

test("state: confirm modal", async ({ page }) => {
  // The other route where a whole overlay appears. Reached only from the admin list, so no
  // page-level screenshot covers it.
  await open(page, "/admin", true);
  await page.getByRole("button", { name: "Delete" }).first().click();
  await expect(page.getByRole("dialog", { name: "Delete palette" })).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("state-confirm-modal.png");
});

test("state: empty list", async ({ page }) => {
  // EmptyState is rendered by Favorites and Admin, not the home grid.
  await stub(page, { loggedIn: true });
  await page.route("**/api/v1/favorites", (r) => r.fulfill({ json: [] }));
  await page.goto("/favorites", { waitUntil: "networkidle" });
  await settle(page);
  await expect(page.getByRole("heading", { name: "No favorites yet" })).toBeVisible();
  await expect(page).toHaveScreenshot("state-empty-list.png", { fullPage: true });
});
