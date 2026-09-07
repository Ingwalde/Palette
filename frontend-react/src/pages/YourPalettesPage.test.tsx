import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { YourPalettesPage } from "./YourPalettesPage";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/toast/ToastProvider";
import { ApiError } from "../lib/http";
import type { Palette, PaletteList, User } from "../types/api";
import * as palettesApi from "../api/palettes";

const user: User = {
  id: 1,
  username: "ann",
  email: "a@x.com",
  is_admin: false,
  email_verified: true,
  created_at: "",
};

const base = {
  owner_handle: "ann",
  description: "",
  tags: [],
  colors: ["#112233"],
  created_at: "",
  updated_at: "",
};
const mine: PaletteList = {
  items: [
    { ...base, id: 1, slug: "draft", name: "Draft", visibility: "private" },
    { ...base, id: 2, slug: "live", name: "Live", visibility: "public" },
  ] as Palette[],
  total: 2,
  limit: 2,
  offset: 0,
};

vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(user)),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  logoutEverywhere: vi.fn(),
}));
vi.mock("../api/palettes", () => ({
  listMyPalettes: vi.fn(),
  setPaletteVisibility: vi.fn(),
}));

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={["/palettes/mine"]}>
            <Routes>
              <Route path="/palettes/mine" element={<YourPalettesPage />} />
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
  vi.mocked(palettesApi.listMyPalettes).mockResolvedValue(mine);
  vi.mocked(palettesApi.setPaletteVisibility).mockResolvedValue({
    ...(mine.items[0] as Palette),
    visibility: "public",
  });
});

describe("YourPalettesPage", () => {
  it("lists own palettes with their visibility", async () => {
    renderPage();
    expect(await screen.findByRole("link", { name: "Draft" })).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    // A private palette offers Publish; a public one offers Make private.
    expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Make private" })).toBeInTheDocument();
  });

  it("publishes a private palette", async () => {
    const u = userEvent.setup();
    renderPage();
    await u.click(await screen.findByRole("button", { name: "Publish" }));
    await waitFor(() =>
      expect(palettesApi.setPaletteVisibility).toHaveBeenCalledWith(1, "public"),
    );
  });

  it("shows an empty state with no palettes", async () => {
    vi.mocked(palettesApi.listMyPalettes).mockResolvedValue({
      items: [],
      total: 0,
      limit: 0,
      offset: 0,
    });
    renderPage();
    expect(await screen.findByText("No palettes yet")).toBeInTheDocument();
  });

  it("redirects a signed-out visitor to login", async () => {
    vi.mocked((await import("../api/auth")).getCurrentUser).mockRejectedValueOnce(
      new ApiError("no", 401),
    );
    renderPage();
    await waitFor(() => expect(screen.getByTestId("loc")).toHaveTextContent("/login"));
  });
});
