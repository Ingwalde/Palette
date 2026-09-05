import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaletteEditorPage } from "./PaletteEditorPage";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/toast/ToastProvider";
import { ApiError } from "../lib/http";
import type { Palette, User } from "../types/api";
import * as palettesApi from "../api/palettes";

const user: User = {
  id: 1,
  username: "ann",
  email: "a@x.com",
  is_admin: false,
  email_verified: true,
  created_at: "",
};

const palette: Palette = {
  id: 7,
  slug: "sea-breeze",
  owner_handle: "ann",
  name: "Sea Breeze",
  description: "Fresh.",
  colors: ["#006D77", "#83C5BE"],
  tags: ["cold"],
  created_at: "",
  updated_at: "",
};

vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(user)),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  logoutEverywhere: vi.fn(),
}));
vi.mock("../api/tags", () => ({ listTags: vi.fn(() => Promise.resolve([])) }));
vi.mock("../api/favorites", () => ({
  listFavorites: vi.fn(() => Promise.resolve([])),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  clearFavorites: vi.fn(),
}));
vi.mock("../api/palettes", () => ({
  getPalette: vi.fn(() => Promise.resolve(palette)),
  listPalettes: vi.fn(() =>
    Promise.resolve({ items: [], total: 0, limit: 100, offset: 0 }),
  ),
  createPalette: vi.fn(),
  updatePalette: vi.fn(),
}));

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/palettes/new" element={<PaletteEditorPage />} />
              <Route path="/u/:handle/:slug/edit" element={<PaletteEditorPage />} />
              <Route path="/u/:handle/:slug" element={<div>PALETTE PAGE</div>} />
              <Route path="/login" element={<div>LOGIN</div>} />
            </Routes>
            <LocationProbe />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(palettesApi.getPalette).mockResolvedValue(palette);
  vi.mocked(palettesApi.createPalette).mockResolvedValue({
    ...palette,
    slug: "new-one",
    name: "New One",
  });
  vi.mocked(palettesApi.updatePalette).mockResolvedValue(palette);
});

describe("PaletteEditorPage", () => {
  it("creates a palette and navigates to its page", async () => {
    const u = userEvent.setup();
    renderAt("/palettes/new");
    expect(
      await screen.findByRole("heading", { name: "New palette" }),
    ).toBeInTheDocument();

    await u.type(screen.getByPlaceholderText("Nordic Blue"), "New One");
    await u.type(screen.getByPlaceholderText("Short description..."), "Fresh tones");
    await u.click(screen.getByRole("button", { name: "Create palette" }));

    await waitFor(() => expect(palettesApi.createPalette).toHaveBeenCalled());
    // Navigated to the created palette's page.
    await waitFor(() =>
      expect(screen.getByTestId("loc")).toHaveTextContent("/u/ann/new-one"),
    );
  });

  it("loads an owned palette into the form for editing", async () => {
    renderAt("/u/ann/sea-breeze/edit");
    expect(
      await screen.findByRole("heading", { name: "Edit palette" }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Sea Breeze")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("blocks editing a palette owned by someone else", async () => {
    vi.mocked(palettesApi.getPalette).mockResolvedValue({
      ...palette,
      owner_handle: "someone-else",
    });
    renderAt("/u/someone-else/sea-breeze/edit");
    expect(await screen.findByText("You can't edit this palette")).toBeInTheDocument();
  });

  it("redirects a signed-out visitor to login", async () => {
    vi.mocked((await import("../api/auth")).getCurrentUser).mockRejectedValueOnce(
      new ApiError("no", 401),
    );
    renderAt("/palettes/new");
    await waitFor(() => expect(screen.getByTestId("loc")).toHaveTextContent("/login"));
  });
});
