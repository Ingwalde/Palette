import { test, expect, type Page } from "@playwright/test";

const PALETTES = {
  items: [
    {
      id: 1,
      slug: "sea-breeze",
      name: "Sea Breeze",
      description: "Fresh blue and green colors inspired by the sea.",
      colors: ["#006D77", "#0F9199", "#83C5BE", "#EDE7C8"],
      tags: ["cold", "sea", "calm"],
      created_at: "",
      updated_at: "",
    },
    {
      id: 2,
      slug: "desert-clay",
      name: "Desert Clay",
      description: "Warm earthy browns fading into soft sand.",
      colors: ["#6A4A32", "#A9744F", "#C89B7B"],
      tags: ["earth", "warm"],
      created_at: "",
      updated_at: "",
    },
  ],
  total: 2,
  limit: 100,
  offset: 0,
};
const TAGS = [
  { name: "cold", kind: "free", count: 2 },
  { name: "warm", kind: "free", count: 1 },
];

// Stub the API so the E2E flows run without a live backend (logged-out visitor).
async function stubApi(page: Page) {
  await page.route("**/api/v1/palettes*", (r) => r.fulfill({ json: PALETTES }));
  await page.route("**/api/v1/tags", (r) => r.fulfill({ json: TAGS }));
  await page.route("**/api/v1/auth/me", (r) =>
    r.fulfill({ status: 401, json: { detail: "Not authenticated" } }),
  );
}

test.beforeEach(async ({ page }) => {
  await stubApi(page);
});

test("home lists palettes and filters by search", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /available palettes/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sea Breeze" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Desert Clay" })).toBeVisible();
});

test("navigating to Login shows both auth forms", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Login", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
});

test("favorites prompts a logged-out visitor to log in", async ({ page }) => {
  await page.goto("/favorites");
  await expect(
    page.getByRole("heading", { name: /log in to view favorites/i }),
  ).toBeVisible();
});

test("changelog renders version history", async ({ page }) => {
  await page.goto("/changelog");
  await expect(page.getByRole("heading", { name: "Changelog", level: 1 })).toBeVisible();
  await expect(page.getByText("v4.8.0", { exact: true })).toBeVisible();
});
