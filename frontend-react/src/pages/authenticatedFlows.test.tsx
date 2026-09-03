import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { PaletteCard } from "../components/PaletteCard";
import { FavoritesPage } from "./FavoritesPage";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/toast/ToastProvider";
import type { Palette, User } from "../types/api";
import * as favoritesApi from "../api/favorites";

const admin: User = {
  id: 1,
  username: "demo",
  email: "d@x.com",
  is_admin: false,
  email_verified: true,
  created_at: "",
};
const palette: Palette = {
  id: 1,
  slug: "sea-breeze",
  owner_handle: "palette",
  name: "Sea Breeze",
  description: "Fresh.",
  colors: ["#000000", "#FFFFFF"],
  tags: ["cold"],
  created_at: "",
  updated_at: "",
};

vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(admin)),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  logoutEverywhere: vi.fn(),
}));
vi.mock("../api/favorites", () => ({
  listFavorites: vi.fn(() => Promise.resolve([palette])),
  addFavorite: vi.fn(() => Promise.resolve()),
  removeFavorite: vi.fn(() => Promise.resolve()),
  clearFavorites: vi.fn(() => Promise.resolve()),
}));

function wrap(node: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter>{node}</MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("PaletteCard (signed in)", () => {
  it("shows a saved palette and removes it on toggle", async () => {
    const user = userEvent.setup();
    wrap(<PaletteCard palette={palette} />);
    // Wait for the favorites query to resolve so the card shows the saved state.
    expect(await screen.findByText("♥ Saved")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Toggle favorite/i }));
    expect(favoritesApi.removeFavorite).toHaveBeenCalledWith("sea-breeze");
    expect(await screen.findByText("Removed from favorites")).toBeInTheDocument();
  });
});

describe("FavoritesPage (signed in)", () => {
  it("lists saved palettes and clears them", async () => {
    const user = userEvent.setup();
    wrap(<FavoritesPage />);
    expect(await screen.findByText("1 saved palette")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sea Breeze" })).toBeInTheDocument();

    const clear = screen.getByRole("button", { name: "Clear favorites" });
    expect(clear).toBeEnabled();
    await user.click(clear);
    expect(favoritesApi.clearFavorites).toHaveBeenCalled();
    expect(await screen.findByText("Favorites cleared")).toBeInTheDocument();
  });
});
