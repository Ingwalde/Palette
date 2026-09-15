import { StrictMode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { PaletteCard } from "../components/PaletteCard";
import { ToastProvider } from "../components/toast/ToastProvider";
import { ColorFormatProvider } from "../components/ColorFormatContext";
import { LoginPage } from "./LoginPage";
import { ApiError } from "../lib/http";
import { readSaveIntent, rememberSaveIntent, clearSaveIntent } from "../lib/saveIntent";
import * as authApi from "../api/auth";
import * as favoritesApi from "../api/favorites";
import type { Palette, User } from "../types/api";

const palette: Palette = {
  id: 91,
  slug: "sea-study",
  name: "Sea Study",
  colors: ["#123456", "#FFFFFF"],
  tags: ["cold"],
  description: "",
  owner_handle: "palette",
  visibility: "public",
  created_at: "",
  updated_at: "",
};
const account: User = {
  id: 8,
  username: "designer",
  email: "designer@example.test",
  is_admin: false,
  email_verified: true,
  created_at: "",
};
const catalogue = "/?q=sea&tag=cold&color_count=2&sort=popular";
vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  logoutEverywhere: vi.fn(),
}));
vi.mock("../api/favorites", () => ({
  listFavorites: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  clearFavorites: vi.fn(),
}));
function LocationProbe() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}
function mount(entry = catalogue) {
  return render(
    <StrictMode>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <AuthProvider>
          <ToastProvider>
            <ColorFormatProvider>
              <MemoryRouter initialEntries={[entry]}>
                <Routes>
                  <Route path="/" element={<PaletteCard palette={palette} />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/profile" element={<p>PROFILE</p>} />
                </Routes>
                <LocationProbe />
              </MemoryRouter>
            </ColorFormatProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
async function logIn(u: ReturnType<typeof userEvent.setup>) {
  const form = within(screen.getByRole("heading", { name: "Login" }).closest("form")!);
  await u.type(form.getByLabelText("Username/Email"), "designer");
  await u.type(form.getByLabelText(/^Password/), "example-password");
  await u.click(form.getByRole("button", { name: "Login" }));
}
beforeEach(() => {
  const old = readSaveIntent();
  if (old) clearSaveIntent(old.id);
  localStorage.clear();
  vi.clearAllMocks();
  vi.mocked(authApi.getCurrentUser).mockRejectedValue(new ApiError("Signed out", 401));
  vi.mocked(authApi.login).mockResolvedValue(account);
  vi.mocked(authApi.register).mockResolvedValue({ message: "Check your email" });
  vi.mocked(favoritesApi.listFavorites).mockResolvedValue([]);
  vi.mocked(favoritesApi.addFavorite).mockResolvedValue(undefined);
});

describe("Account-only save and return", () => {
  it("keeps one save request through registration and a fresh login visit, then saves once and returns with filters", async () => {
    const u = userEvent.setup();
    localStorage.setItem("palette:color-format", "rgb");
    const view = mount();
    const save = screen.getByRole("button", { name: "Save Sea Study" });
    await waitFor(() => expect(save).toBeEnabled());
    await u.click(save);
    expect(favoritesApi.addFavorite).not.toHaveBeenCalled();
    expect(favoritesApi.listFavorites).not.toHaveBeenCalled();
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
    const intent = readSaveIntent();
    expect(intent?.returnTo).toBe(catalogue);
    expect(intent).not.toHaveProperty("colors");
    const form = within(
      screen.getByRole("heading", { name: "Create account" }).closest("form")!,
    );
    await u.type(form.getByLabelText(/^Username/), "designer");
    await u.type(form.getByLabelText(/^Email/), "designer@example.test");
    await u.type(form.getByLabelText(/^Password/), "example-password");
    await u.click(form.getByRole("button", { name: "Create account" }));
    expect(
      await screen.findByText("Check your email to finish setting up your account."),
    ).toBeInTheDocument();
    expect(favoritesApi.addFavorite).not.toHaveBeenCalled();
    view.unmount();
    mount("/login");
    await logIn(u);
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(catalogue),
    );
    expect(favoritesApi.addFavorite).toHaveBeenCalledExactlyOnceWith("sea-study");
    expect(
      screen.getByRole("button", { name: "Copy rgb(18, 52, 86)" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Sea Study saved to favorites")).toBeInTheDocument();
    expect(readSaveIntent()).toBeNull();
  });
  it("returns after a failed save with an error and no false success", async () => {
    rememberSaveIntent(palette, catalogue, null);
    vi.mocked(favoritesApi.addFavorite).mockRejectedValue(
      new ApiError("Unavailable", 404),
    );
    const u = userEvent.setup();
    mount("/login");
    await logIn(u);
    expect(await screen.findByText(/palette wasn't saved/)).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(catalogue);
    expect(screen.queryByText("Sea Study saved to favorites")).not.toBeInTheDocument();
    expect(readSaveIntent()).toBeNull();
  });
  it("lets a guest cancel the request and return without saving", async () => {
    rememberSaveIntent(palette, catalogue, null);
    const u = userEvent.setup();
    mount("/login");
    await u.click(screen.getByRole("link", { name: "Continue browsing" }));
    expect(screen.getByTestId("location")).toHaveTextContent(catalogue);
    expect(readSaveIntent()).toBeNull();
    expect(favoritesApi.addFavorite).not.toHaveBeenCalled();
  });
  it("does not complete an expired save request", async () => {
    const intent = rememberSaveIntent(palette, catalogue, null);
    localStorage.setItem(
      "palette:pending-save",
      JSON.stringify({ ...intent, createdAt: Date.now() - 86_400_001 }),
    );
    const u = userEvent.setup();
    mount("/login");
    await logIn(u);
    expect(await screen.findByText("PROFILE")).toBeInTheDocument();
    expect(favoritesApi.addFavorite).not.toHaveBeenCalled();
  });
});
