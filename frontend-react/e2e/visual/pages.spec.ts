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
      owner_handle: "palette",
      visibility: "public",
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
      owner_handle: "palette",
      visibility: "public",
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
  await page.route("**/api/v1/users/*/palettes/*", (r) =>
    r.fulfill({ json: PALETTES.items[0] }),
  );
  await page.route("**/api/v1/tags", (r) => r.fulfill({ json: TAGS }));
  await page.route("**/api/v1/favorites", (r) => r.fulfill({ json: PALETTES.items }));
  await page.route("**/api/v1/auth/verify*", (r) =>
    r.fulfill({ status: 400, json: { detail: "Invalid or expired verification link" } }),
  );
  await page.route("**/api/v1/auth/me", (r) =>
    loggedIn
      ? r.fulfill({ json: ADMIN })
      : r.fulfill({ status: 401, json: { detail: "Not authenticated" } }),
  );
}

/**
 * Pins anything sticky for the duration of the capture.
 *
 * A full-page screenshot is stitched while Playwright scrolls, so a sticky element travels
 * with the viewport and lands somewhere different in each pass — the shot never settles, and
 * even when it does the text rasterises slightly differently.
 *
 * Found by computed style rather than by class name. The stylesheet version of this named
 * `.site-header`, `.export-panel` and `.admin-form`, and each one silently stopped matching
 * the moment its component moved to a generated class.
 */
async function unstick(page: Page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>("*")) {
      if (getComputedStyle(el).position === "sticky") el.style.position = "static";
    }
  });
}

// Web fonts arrive asynchronously; screenshotting before they settle swaps the typeface
// mid-capture and produces a diff on every run.
//
// Scroll is pinned to the top, because a viewport screenshot captures wherever the window
// happens to be scrolled to, and opening a control near the bottom of the fold makes the
// browser bring its list back into view.
//
// The pin has to defeat `scroll-behavior: smooth`, which the app sets on the document root.
// Under it `scrollTo(0, 0)` starts an animation instead of moving, so the capture lands at
// whatever position the animation had reached — a different one on every machine. That is the
// whole bug: `state: sort select open` reported 48080, then 62233, then 94591 differing pixels
// across three attempts at one assertion, and aligning the CI capture against the baseline row
// by row gave a mean absolute difference of exactly 0.0000 at a six-row offset. The images were
// identical. The page was six pixels lower.
//
// Playwright's `animations: "disabled"` does not cover this; it stops CSS animations and
// transitions, and smooth scrolling is neither.
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await unstick(page);
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
  });
  // Named, so a recurrence says "the page scrolled" rather than showing a 48000-pixel diff and
  // leaving the next person to measure the offset themselves.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
}

/**
 * The home page shuffles its tag filters with Math.random, so two runs render different chips
 * and a screenshot can never settle. Replace it with a fixed sequence before any app code
 * runs — the alternative is a tolerance wide enough to hide real breakage, which is exactly
 * what a 1% allowance did here.
 */
async function freezeRandom(page: Page) {
  await page.addInitScript(() => {
    let seed = 42;
    Math.random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
  });
}

async function open(page: Page, path: string, loggedIn = false) {
  await freezeRandom(page);
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
  { name: "palette-detail", path: "/u/palette/sea-breeze" },
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
  // The control sits at the bottom of the fold and its open list runs past it, so the click
  // itself scrolls the page. settle() puts it back.
  await settle(page);
  await expect(page).toHaveScreenshot("state-select-open.png");
});

test("state: password revealed", async ({ page }) => {
  await open(page, "/login");
  // A password input has no implicit ARIA role, so it is not reachable by getByRole.
  const input = page.locator('input[type="password"]').first();
  await input.fill("hunter2");
  await page.getByRole("button", { name: "Show password" }).first().click();
  await expect(page.getByRole("button", { name: "Hide password" }).first()).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("state-password-revealed.png");
});

test("state: home with no results", async ({ page }) => {
  // The home grid has its own empty branches. They went unstyled for several commits because
  // no baseline stubs an empty palette list — the page shot always has results.
  await freezeRandom(page);
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
  await freezeRandom(page);
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

  // The same message lands inline and in the toast, and role="status" no longer identifies the
  // toast on its own: the route announcer is a second live region with the same role. Both
  // belong on the page, so the locator narrows by text rather than the markup weakening.
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Invalid or expired password reset link" }),
  ).toBeVisible();
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
  await freezeRandom(page);
  await stub(page, { loggedIn: true });
  await page.route("**/api/v1/favorites", (r) => r.fulfill({ json: [] }));
  await page.goto("/favorites", { waitUntil: "networkidle" });
  await settle(page);
  await expect(page.getByRole("heading", { name: "No favorites yet" })).toBeVisible();
  await expect(page).toHaveScreenshot("state-empty-list.png", { fullPage: true });
});
