import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaletteCard } from "../components/PaletteCard";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/toast/ToastProvider";
import type { Palette, User } from "../types/api";
import * as authApi from "./auth";
import * as favoritesApi from "./favorites";

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

vi.mock("./auth", () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(admin)),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  logoutEverywhere: vi.fn(),
}));
vi.mock("./favorites", () => ({
  listFavorites: vi.fn(() => Promise.resolve([])),
  addFavorite: vi.fn(() => Promise.resolve()),
  removeFavorite: vi.fn(() => Promise.resolve()),
  clearFavorites: vi.fn(() => Promise.resolve()),
}));

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter>
            <PaletteCard palette={palette} />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authApi.getCurrentUser).mockResolvedValue(admin);
  vi.mocked(favoritesApi.listFavorites).mockResolvedValue([]);
});

describe("optimistic favorite toggle", () => {
  it("flips the heart before the request resolves", async () => {
    const user = userEvent.setup();
    // A request that never settles, so the only way the heart can read "Saved" is the optimistic
    // cache write — not the server response.
    vi.mocked(favoritesApi.addFavorite).mockReturnValueOnce(new Promise(() => {}));

    renderCard();
    const button = await screen.findByRole("button", { name: /Toggle favorite/i });
    expect(button).toHaveTextContent("Save");

    await user.click(button);
    expect(button).toHaveTextContent("Saved");
    expect(favoritesApi.addFavorite).toHaveBeenCalledWith("sea-breeze");
  });

  it("rolls the heart back when the request fails", async () => {
    const user = userEvent.setup();
    vi.mocked(favoritesApi.addFavorite).mockRejectedValueOnce(new Error("nope"));

    renderCard();
    const button = await screen.findByRole("button", { name: /Toggle favorite/i });
    await user.click(button);

    // The optimistic flip is reverted once the server rejects, so the card stops claiming a
    // save that did not happen.
    await waitFor(() => expect(button).toHaveTextContent("Save"));
  });
});
