import { test, expect, type Page } from "@playwright/test";

/**
 * Keyboard and screen-reader behaviour that the axe suite cannot see.
 *
 * axe audits a rendered page. These assert what happens *between* pages, and what the keyboard
 * can reach while a dialog is open — behaviour, not markup, and the place where a single-page
 * app quietly diverges from what a full page load would have done for free.
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
      description: "Fresh.",
      colors: ["#006D77", "#83C5BE"],
      tags: ["cold"],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
  total: 1,
  limit: 100,
  offset: 0,
};

async function stub(page: Page, { loggedIn }: { loggedIn: boolean }) {
  await page.route("**/api/v1/palettes*", (r) => r.fulfill({ json: PALETTES }));
  await page.route("**/api/v1/tags", (r) => r.fulfill({ json: [] }));
  await page.route("**/api/v1/favorites/keys", (r) => r.fulfill({ json: [] }));
  await page.route("**/api/v1/auth/me", (r) =>
    loggedIn
      ? r.fulfill({ json: ADMIN })
      : r.fulfill({ status: 401, json: { detail: "Not authenticated" } }),
  );
}

const activeId = (page: Page) => page.evaluate(() => document.activeElement?.id ?? "");

test("navigating moves focus to the main landmark", async ({ page }) => {
  await stub(page, { loggedIn: false });
  await page.goto("/");

  // Not on first load: the browser already did this, and stealing focus would drop the user
  // past the skip link.
  expect(await activeId(page)).not.toBe("main-content");

  await page.getByRole("link", { name: "Export", exact: true }).click();
  await expect(page).toHaveURL(/\/export$/);
  expect(await activeId(page)).toBe("main-content");
});

test("the new page is announced", async ({ page }) => {
  await stub(page, { loggedIn: false });
  await page.goto("/");
  await page.getByRole("link", { name: "Favorites", exact: true }).click();

  // role=status is the live region; its text is what a screen reader speaks after the change.
  // The announcement carries the page's own <h1> ("Your favorite palettes"), not the nav label
  // that was clicked — that is the point: it names where you landed.
  await expect(page.getByRole("status").filter({ hasText: /page loaded/ })).toContainText(
    /favorite palettes/i,
  );
});

test("the skip link is the first thing the keyboard reaches, and it works", async ({
  page,
}) => {
  await stub(page, { loggedIn: false });
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();

  await page.keyboard.press("Enter");
  expect(await activeId(page)).toBe("main-content");
});

test("an open dialog keeps the keyboard inside it and gives focus back", async ({
  page,
}) => {
  await stub(page, { loggedIn: true });
  await page.route("**/api/v1/palettes/*", (r) => r.fulfill({ status: 204, body: "" }));
  await page.goto("/admin");

  const remove = page.getByRole("button", { name: "Delete" }).first();
  await remove.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Cancel, not confirm: an unexpected dialog answered with Enter must not delete anything.
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();

  // Tab all the way round. Focus must still be inside the dialog, never on the list behind it.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    const inside = await dialog.evaluate((d) => d.contains(document.activeElement));
    expect(inside, `Tab ${i + 1} escaped the dialog`).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(remove).toBeFocused();
});
