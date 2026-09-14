import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { PaletteCard } from "./PaletteCard";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "./toast/ToastProvider";
import { ApiError } from "../lib/http";
import type { Palette } from "../types/api";

// Logged-out visitor.
vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.reject(new ApiError("no", 401))),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  logoutEverywhere: vi.fn(),
}));

const palette: Palette = {
  id: 1,
  slug: "sea-breeze",
  owner_handle: "palette",
  visibility: "public",
  name: "Sea Breeze",
  description: "Fresh blue and green.",
  colors: ["#000000", "#FFFFFF"],
  tags: ["cold", "sea"],
  created_at: "",
  updated_at: "",
};

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter>
            <PaletteCard palette={palette} />
            <LocationProbe />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("PaletteCard", () => {
  it("renders colors, title, linked tags and the author without contrast clutter", () => {
    renderCard();
    expect(screen.getByRole("heading", { name: "Sea Breeze" })).toBeInTheDocument();
    expect(screen.queryByText("Fresh blue and green.")).not.toBeInTheDocument();
    expect(screen.getByText("#cold")).toBeInTheDocument();
    expect(screen.queryByText(/Excellent contrast/)).not.toBeInTheDocument();
    // A curator-owned palette is bylined with the brand, not "by palette".
    expect(screen.getByText("Palette")).toBeInTheDocument();
  });

  it("bylines a user-owned palette with an @handle and their avatar", () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter>
              <PaletteCard
                palette={{
                  ...palette,
                  owner_handle: "alice",
                  owner_has_avatar: true,
                }}
              />
            </MemoryRouter>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>,
    );
    // The @handle links to the owner's public palettes.
    const link = screen.getByRole("link", { name: "@alice" });
    expect(link).toHaveAttribute("href", "/u/alice");
    // The avatar loads from the cacheable endpoint, not an inline data URL.
    expect(document.querySelector('img[src$="/users/alice/avatar"]')).not.toBeNull();
  });

  it("does not crash when owner_handle is missing (older fixtures)", () => {
    // Some fixtures omit owner_handle; the byline must fall back to the curator, not read
    // `undefined.charAt`.
    const { owner_handle: _omit, ...rest } = palette;
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <AuthProvider>
          <ToastProvider>
            <MemoryRouter>
              <PaletteCard palette={rest as typeof palette} />
            </MemoryRouter>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByRole("heading", { name: "Sea Breeze" })).toBeInTheDocument();
    expect(screen.getByText("Palette")).toBeInTheDocument();
  });

  it("links tags to the catalogue filter", () => {
    renderCard();
    expect(screen.getByRole("link", { name: "#cold" })).toHaveAttribute(
      "href",
      "/?tag=cold#find",
    );
    expect(screen.queryByRole("link", { name: /contrast/i })).not.toBeInTheDocument();
  });

  it("copies all colors (toast confirms)", async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: "Copy all" }));
    expect(await screen.findByText("2 colors copied")).toBeInTheDocument();
  });

  it("takes a guest to login without saving an on-device favorite", async () => {
    const user = userEvent.setup();
    renderCard();
    expect(screen.getByTestId("loc")).toHaveTextContent("/");
    const save = screen.getByRole("button", { name: "Save Sea Breeze" });
    await waitFor(() => expect(save).toBeEnabled());
    await user.click(save);
    expect(screen.getByTestId("loc")).toHaveTextContent("/login");
    expect(localStorage.getItem("palette:guest-favorites")).toBeNull();
    expect(JSON.parse(localStorage.getItem("palette:pending-save")!).slug).toBe(
      "sea-breeze",
    );
  });
  it("says so when the clipboard refuses the write", async () => {
    // writeText rejects on a denied permission, an unfocused document or an insecure origin.
    // The swatch used to award the user silence and an unhandled rejection; the name button
    // used to announce success regardless. Both now report the failure.
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
      new Error("Write permission denied."),
    );
    renderCard();
    await user.click(screen.getByRole("button", { name: "Copy all" }));
    expect(
      await screen.findByText(/Could not copy to the clipboard/),
    ).toBeInTheDocument();
  });
});
