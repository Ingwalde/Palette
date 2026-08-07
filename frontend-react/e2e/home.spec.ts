import { test, expect } from "@playwright/test";

test("home renders hero and navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /find a color palette/i,
  );
  await expect(page.getByRole("navigation", { name: /main navigation/i })).toBeVisible();
});

test("navigating to a not-yet-ported route shows a placeholder", async ({ page }) => {
  await page.goto("/export");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Export");
  await expect(page.getByText(/coming soon/i)).toBeVisible();
});
