import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PalettePage } from "./PalettePage";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/toast/ToastProvider";
import { ApiError } from "../lib/http";
import type { Palette, User } from "../types/api";
import * as palettesApi from "../api/palettes";
import * as colorLib from "../lib/color";

const palette: Palette = {
  id: 1,
  slug: "sea-breeze",
  name: "Sea Breeze",
  description: "Fresh blue and green.",
  colors: ["#006D77", "#0F9199", "#83C5BE", "#EDE7C8"],
  tags: ["cold", "sea"],
  owner_handle: "palette",
  visibility: "public",
  created_at: "",
  updated_at: "",
};

vi.mock("../api/palettes", () => ({
  getPalette: vi.fn(),
  listPalettes: vi.fn(() =>
    Promise.resolve({ items: [], total: 0, limit: 100, offset: 0 }),
  ),
  forkPalette: vi.fn(),
}));
vi.mock("../api/tags", () => ({ listTags: vi.fn(() => Promise.resolve([])) }));
vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.reject(new ApiError("no", 401))),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  logoutEverywhere: vi.fn(),
}));
vi.mock("../api/favorites", () => ({
  listFavorites: vi.fn(() => Promise.resolve([])),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  clearFavorites: vi.fn(),
}));
// navigator.clipboard is a getter-only in jsdom, so stub the copy helper rather than the API.
vi.mock("../lib/color", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/color")>()),
  copyToClipboard: vi.fn(() => Promise.resolve()),
}));

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function renderPage(state?: { from?: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[{ pathname: "/u/palette/sea-breeze", state }]}>
            <Routes>
              <Route path="/u/:handle/:slug" element={<PalettePage />} />
              <Route path="/u/:handle/:slug/edit" element={<div>EDITOR</div>} />
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
  vi.mocked(colorLib.copyToClipboard).mockClear();
});

describe("PalettePage", () => {
  it("renders the name, description, tags and one block per color", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { name: "Sea Breeze" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Fresh blue and green.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "#cold" })).toHaveAttribute(
      "href",
      "/?tag=cold",
    );
    const blocks = screen.getAllByRole("button", { name: /^Copy #/ });
    expect(blocks).toHaveLength(4);
  });

  it("copies a color and raises a toast when a block is clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    const block = await screen.findByRole("button", { name: "Copy #006D77" });
    await user.click(block);
    expect(colorLib.copyToClipboard).toHaveBeenCalledWith("#006D77");
    expect(await screen.findByText("#006D77 copied")).toBeInTheDocument();
  });

  it("shows a not-found state for a 404", async () => {
    vi.mocked(palettesApi.getPalette).mockRejectedValue(new ApiError("gone", 404));
    renderPage();
    expect(await screen.findByText("Palette not found")).toBeInTheDocument();
  });

  it("points the back link at the query string it arrived with", async () => {
    renderPage({ from: "?q=sea&tag=cold" });
    const back = await screen.findByRole("link", { name: /All palettes/i });
    expect(back).toHaveAttribute("href", "/?q=sea&tag=cold");
  });

  it("sends a signed-out visitor to login when forking", async () => {
    const u = userEvent.setup();
    renderPage();
    await u.click(await screen.findByRole("button", { name: "Fork" }));
    expect(screen.getByTestId("loc")).toHaveTextContent("/login");
  });

  it("forks for a signed-in user and opens the copy's editor", async () => {
    const user: User = {
      id: 5,
      username: "ann",
      email: "a@x.com",
      is_admin: false,
      email_verified: true,
      created_at: "",
    };
    vi.mocked((await import("../api/auth")).getCurrentUser).mockResolvedValue(user);
    vi.mocked(palettesApi.forkPalette).mockResolvedValue({
      ...palette,
      slug: "sea-breeze-2",
      owner_handle: "ann",
      visibility: "private",
    });
    const u = userEvent.setup();
    renderPage();
    await u.click(await screen.findByRole("button", { name: "Fork" }));
    await waitFor(() => expect(palettesApi.forkPalette).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(screen.getByTestId("loc")).toHaveTextContent("/u/ann/sea-breeze-2/edit"),
    );
  });

  it("shows lineage for a forked palette", async () => {
    vi.mocked(palettesApi.getPalette).mockResolvedValue({
      ...palette,
      forked_from: { name: "Original", slug: "original", owner_handle: "bob" },
    });
    renderPage();
    expect(await screen.findByText(/Forked from/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Original" });
    expect(link).toHaveAttribute("href", "/u/bob/original");
  });
});
