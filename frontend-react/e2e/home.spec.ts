import { test, expect } from "@playwright/test";

test("home renders hero and navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /find a color palette/i,
  );
  await expect(page.getByRole("navigation", { name: /main navigation/i })).toBeVisible();
});

test("an unknown route shows the not-found placeholder", async ({ page }) => {
  await page.goto("/nope");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not found");
  await expect(page.getByText(/coming soon/i)).toBeVisible();
});
