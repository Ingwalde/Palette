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
  await page.route("**/api/v1/tags", (r) => r.fulfill({ json: TAGS }));
  await page.route("**/api/v1/favorites", (r) => r.fulfill({ json: PALETTES.items }));
  await page.route("**/api/v1/auth/me", (r) =>
    loggedIn
      ? r.fulfill({ json: ADMIN })
      : r.fulfill({ status: 401, json: { detail: "no" } }),
  );
}

async function analyze(page: Page) {
  return new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
}

const GUEST_PAGES = [
  "/",
  "/login",
  "/favorites",
  "/export",
  "/changelog",
  "/forgot-password",
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
