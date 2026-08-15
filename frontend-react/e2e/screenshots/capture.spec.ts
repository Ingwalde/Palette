import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Regenerates the three screenshots the README and the wiki embed.
 *
 * These are not assertions and nothing fails if the page looks different — that is what the
 * baselines under e2e/visual are for. This exists because the previous set was captured by
 * hand and then sat unchanged through eight releases: the hero in docs/assets/home.png still
 * advertised v4.7.1 and described features from that release. A capture nobody can reproduce
 * is a capture nobody updates.
 *
 * Against the real stack rather than stubs, because the point of these images is to show the
 * product with its actual seeded data — the palette names and the count are real.
 */

// __dirname does not exist in an ES module, and resolving from cwd would depend on where the
// runner was invoked. Derive it from this file instead.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../../../docs/assets");

const ADMIN_USER = process.env.SCREENSHOT_ADMIN_USER ?? "admin";
const ADMIN_PASSWORD = process.env.SCREENSHOT_ADMIN_PASSWORD ?? "";

// 2040x1500 on disk, matching the previous set and the README's table layout. The split
// matters as much as the product: at 1020 CSS pixels the layout hits a narrower breakpoint,
// the type scales up and the tag filters fall below the fold — the first attempt captured a
// page that stopped at the search field, which is not what the caption promises.
test.use({ viewport: { width: 1360, height: 1000 }, deviceScaleFactor: 1.5 });

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
}

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username/Email").fill(ADMIN_USER);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.getByRole("link", { name: ADMIN_USER, exact: true })).toBeVisible();
}

test("home", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("article").first()).toBeVisible();
  await settle(page);
  await page.screenshot({ path: path.join(OUT, "home.png") });
});

test("export", async ({ page }) => {
  await page.goto("/export", { waitUntil: "networkidle" });

  // A picked palette with its preview rendered — an empty export page shows nothing worth
  // putting in a README. The field is "Search palette", not the home page's search box.
  await page.getByLabel("Search palette").fill("Green Strawberry");
  await page
    .getByRole("button", { name: /Green Strawberry/i })
    .first()
    .click();
  await expect(page.getByText(/Green Strawberry/).first()).toBeVisible();

  // PNG, not the default CSS variables: the caption promises "a selected palette with the PNG
  // preview", and the code output is already visible on the page in every other form.
  await page.getByRole("button", { name: /format/i }).click();
  await page.getByRole("option", { name: "PNG image" }).click();
  await expect(
    page.getByRole("img", { name: /palette card|preview/i }).first(),
  ).toBeVisible();

  await settle(page);
  await page.screenshot({ path: path.join(OUT, "export.png") });
});

test("admin", async ({ page }) => {
  test.skip(!ADMIN_PASSWORD, "SCREENSHOT_ADMIN_PASSWORD not provided");

  await signInAsAdmin(page);
  await page.goto("/admin", { waitUntil: "networkidle" });

  // Open a palette in the colour-row editor: the empty create form does not show the thing the
  // README caption promises, "the dynamic HEX-row colour editor with tag chips".
  await page.getByRole("button", { name: "Edit" }).first().click();
  await expect(page.getByLabel(/^name$/i)).not.toHaveValue("");
  await settle(page);

  // settle() pins the page at the top, which frames the heading rather than the editor, so
  // bring the colour rows into view. The target has to be unique to the editor: "Tags" also
  // matches the Palettes/Tags tab near the top, and centring that scrolled nowhere — two
  // captures shipped identical to the previous frame before the assertion below caught it.
  await page
    .getByRole("button", { name: /add color/i })
    .evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  await page.screenshot({ path: path.join(OUT, "admin.png") });
});
