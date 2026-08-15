import { test, expect, type Page } from "@playwright/test";

/**
 * The paths where a stubbed response would hide a disagreement between the app and the API.
 *
 * Everything here talks to the real backend and writes real rows. Each run makes its own user
 * so repeated runs cannot collide, and the admin credentials come from the environment the
 * stack was started with rather than being assumed.
 */

// The browser talks to the backend directly over plain http (src/lib/apiBase.ts computes
// http://<hostname>:8000), because nginx only proxies /api in the production compose overlay.
// API assertions have to use that origin: asking :5500 for /api/v1/... gets the SPA's
// index.html back through the catch-all, which looks like a JSON parse error and is not one.
const API = process.env.INTEGRATION_API_URL ?? "http://localhost:8000";

const ADMIN_USER = process.env.INTEGRATION_ADMIN_USER ?? "admin";
const ADMIN_PASSWORD = process.env.INTEGRATION_ADMIN_PASSWORD ?? "";

const stamp = Date.now().toString(36);
const NEW_USER = {
  username: `e2e${stamp}`,
  email: `e2e${stamp}@example.test`,
  password: "integration-pass-1",
};

async function signIn(page: Page, username: string, password: string) {
  await page.goto("/login");
  // The page carries a login form and a register form; the labels and the button text come
  // from LoginPage itself rather than from what a reasonable form might be called.
  await page.getByLabel("Username/Email").fill(username);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  // exact, because for the admin account the nav carries both an "Admin" link and a profile
  // link named "admin", and role-name matching is case-insensitive without it.
  await expect(page.getByRole("link", { name: username, exact: true })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test("the API is reachable and speaks problem+json", async ({ request }) => {
  const ok = await request.get(`${API}/api/v1/palettes`);
  expect(ok.ok()).toBe(true);
  const body = await ok.json();
  expect(body).toHaveProperty("items");
  expect(body).toHaveProperty("total");

  // RFC 7807, asserted against the running app rather than against the documentation.
  const missing = await request.get(`${API}/api/v1/palettes/definitely-not-a-slug`);
  expect(missing.status()).toBe(404);
  expect(missing.headers()["content-type"]).toContain("application/problem+json");
  expect(await missing.json()).toMatchObject({ status: 404, title: expect.any(String) });
});

test("logging in sets httpOnly cookies and returns no token in the body", async ({
  request,
}) => {
  const created = await request.post(`${API}/api/v1/auth/register`, { data: NEW_USER });
  expect(created.status()).toBe(201);

  const res = await request.post(`${API}/api/v1/auth/login`, {
    data: { username: NEW_USER.username, password: NEW_USER.password },
  });
  expect(res.ok()).toBe(true);

  // The dead `Token` schema described {access_token, refresh_token, token_type} and the docs
  // repeated it. This is the assertion that would have caught that: the body is the user.
  const body = await res.json();
  expect(body).toMatchObject({ username: NEW_USER.username, is_admin: false });
  expect(body).not.toHaveProperty("access_token");
  expect(body).not.toHaveProperty("refresh_token");

  const setCookie = res
    .headersArray()
    .filter((h) => h.name.toLowerCase() === "set-cookie");
  const names = setCookie.map((h) => h.value.split("=")[0]);
  expect(names).toEqual(
    expect.arrayContaining(["access_token", "refresh_token", "csrf_token"]),
  );

  // The two credentials are httpOnly; the CSRF half must stay readable, or the client cannot
  // echo it back.
  const httpOnly = Object.fromEntries(
    setCookie.map((h) => [h.value.split("=")[0], /httponly/i.test(h.value)]),
  );
  expect(httpOnly.access_token).toBe(true);
  expect(httpOnly.refresh_token).toBe(true);
  expect(httpOnly.csrf_token).toBe(false);

  // Folded into this test rather than logging in again: login is rate limited to five a
  // minute, and the suite was making seven attempts in twenty seconds — the sixth got a 429
  // and the failure looked like a broken sign-in rather than a test spending a budget it
  // shares with every other test in the file.
  //
  // Authenticated by cookie, but no X-CSRF-Token: the middleware must reject it before the
  // endpoint runs.
  const withoutCsrf = await request.post(`${API}/api/v1/favorites/sea-breeze`);
  expect(withoutCsrf.status()).toBe(403);
});

test("a signed-in user can save and unsave a palette", async ({ page }) => {
  await signIn(page, NEW_USER.username, NEW_USER.password);

  await page.goto("/");
  const firstCard = page.getByRole("article").first();
  const name = (await firstCard.getByRole("heading").innerText()).trim();

  // The control carries aria-label="Toggle favorite", which replaces its visible "♡ Save" text
  // as the accessible name, and reports state through aria-pressed rather than by relabelling
  // itself. Asserting the attribute checks the state a screen reader is actually told.
  const toggle = firstCard.getByRole("button", { name: "Toggle favorite" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  // Read back through a fresh request, so this is PostgreSQL answering rather than client state.
  await page.goto("/favorites");
  await expect(page.getByRole("heading", { name })).toBeVisible();

  await page.getByRole("button", { name: "Toggle favorite" }).first().click();
  await expect(page.getByRole("heading", { name })).toBeHidden();
});

test("an admin can create a palette and a visitor can find it", async ({ page }) => {
  test.skip(!ADMIN_PASSWORD, "INTEGRATION_ADMIN_PASSWORD not provided");

  const palette = `Integration ${stamp}`;
  await signIn(page, ADMIN_USER, ADMIN_PASSWORD);
  await page.goto("/admin");

  await page.getByLabel(/^name$/i).fill(palette);
  await page.getByLabel(/description/i).fill("Created by the integration suite.");
  await page.getByRole("button", { name: "Create palette" }).click();

  // Round-trips through PostgreSQL: the slug is derived server-side, so finding it by search
  // proves the write landed and the read path sees it.
  await page.goto("/");
  await page.getByPlaceholder(/search/i).fill(palette);
  await expect(page.getByRole("heading", { name: palette })).toBeVisible();
});

test("logging out everywhere ends a session opened in another browser", async ({
  browser,
}) => {
  // Two contexts are two devices: separate cookie jars, one account. That is the only way to
  // show what this control is for — a single context could not tell "logged out here" from
  // "logged out everywhere".
  const first = await browser.newContext();
  const second = await browser.newContext();
  const a = await first.newPage();
  const b = await second.newPage();

  await signIn(a, NEW_USER.username, NEW_USER.password);
  await signIn(b, NEW_USER.username, NEW_USER.password);

  await a.goto("/profile");
  await a.getByRole("button", { name: "Log out everywhere" }).click();
  await a.getByRole("dialog").getByRole("button", { name: "Log out everywhere" }).click();
  await expect(a.getByRole("link", { name: "Login" })).toBeVisible();

  // The second device never touched anything: its cookies are still in place, and the server
  // is what decides they are worthless now.
  await b.goto("/profile");
  await expect(b.getByRole("link", { name: "Login" })).toBeVisible();

  await first.close();
  await second.close();
});
