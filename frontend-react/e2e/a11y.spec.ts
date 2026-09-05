import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ADMIN = {
  id: 1,
  username: "admin",
  email: "admin@example.com",
  is_admin: true,
  email_verified: true,
  created_at: "",
};
const PALETTES = {
  items: [
    {
      id: 1,
      slug: "sea-breeze",
      name: "Sea Breeze",
      description: "Fresh blue and green colors inspired by the sea.",
      colors: ["#006D77", "#0F9199", "#83C5BE", "#EDE7C8"],
      tags: ["cold", "sea"],
      owner_handle: "palette",
      visibility: "public",
      created_at: "",
      updated_at: "",
    },
  ],
  total: 1,
  limit: 100,
  offset: 0,
};
const TAGS = [{ name: "cold", kind: "free", count: 1 }];

async function stub(page: Page, loggedIn: boolean) {
  await page.route("**/api/v1/palettes*", (r) => r.fulfill({ json: PALETTES }));
  await page.route("**/api/v1/users/*/palettes/*", (r) =>
    r.fulfill({ json: PALETTES.items[0] }),
  );
  await page.route("**/api/v1/tags", (r) => r.fulfill({ json: TAGS }));
  await page.route("**/api/v1/favorites", (r) => r.fulfill({ json: PALETTES.items }));
  await page.route("**/api/v1/auth/me", (r) =>
    loggedIn
      ? r.fulfill({ json: ADMIN })
      : r.fulfill({ status: 401, json: { detail: "no" } }),
  );
  // The failed branch, deliberately: an expired link is the state a real visitor is most likely
  // to land on, and it is the one that renders an error the page has to describe accessibly.
  await page.route("**/api/v1/auth/verify*", (r) =>
    r.fulfill({ status: 400, json: { detail: "Invalid or expired verification link" } }),
  );
}

async function analyze(page: Page) {
  return new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
}

const GUEST_PAGES = [
  "/",
  "/u/palette/sea-breeze", // the palette page, with its color blocks and contrast table
  "/login",
  "/favorites",
  "/export",
  "/changelog",
  "/forgot-password",
  "/no-such-page", // the 404 is a real page now, so it gets audited like the rest
  // The two pages reached from an email link. They were the only routes the audit skipped,
  // and they are the ones a visitor arrives at cold, often on a phone, with no navigation
  // behind them: reset-password is a two-field credential form, and verify renders its own
  // bare shell rather than the app layout, so it is the page most free to drift.
  "/reset-password?token=audit",
  "/verify?token=audit",
];
const ADMIN_PAGES = ["/admin", "/profile"];

for (const path of GUEST_PAGES) {
  test(`a11y (guest) ${path}`, async ({ page }) => {
    await stub(page, false);
    await page.goto(path, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const { violations } = await analyze(page);
    if (violations.length) {
      console.log(
        path,
        JSON.stringify(
          violations.map((v) => ({ id: v.id, n: v.nodes.length, t: v.nodes[0]?.target })),
          null,
          1,
        ),
      );
    }
    expect(violations).toEqual([]);
  });
}

for (const path of ADMIN_PAGES) {
  test(`a11y (admin) ${path}`, async ({ page }) => {
    await stub(page, true);
    await page.goto(path, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const { violations } = await analyze(page);
    if (violations.length) {
      console.log(
        path,
        JSON.stringify(
          violations.map((v) => ({ id: v.id, n: v.nodes.length, t: v.nodes[0]?.target })),
          null,
          1,
        ),
      );
    }
    expect(violations).toEqual([]);
  });
}
