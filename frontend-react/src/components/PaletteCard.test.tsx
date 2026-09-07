import { render, screen } from "@testing-library/react";
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
  it("renders the name, description, tags and computed contrast", () => {
    renderCard();
    expect(screen.getByRole("heading", { name: "Sea Breeze" })).toBeInTheDocument();
    expect(screen.getByText("Fresh blue and green.")).toBeInTheDocument();
    expect(screen.getByText("#cold")).toBeInTheDocument();
    expect(screen.getByText(/Excellent contrast · 21:1/)).toBeInTheDocument();
    // A curator-owned palette is bylined with the brand, not "by palette".
    expect(screen.getByText("Palette")).toBeInTheDocument();
  });

  it("names the contrast pair in the badge and links to the table", () => {
    renderCard();
    const badge = screen.getByRole("link", { name: /Excellent contrast/i });
    expect(badge).toHaveAccessibleName(/#000000 and #FFFFFF/);
    expect(badge).toHaveAttribute("href", "/u/palette/sea-breeze#contrast");
  });

  it("copies all colors (toast confirms)", async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: "Copy all" }));
    expect(await screen.findByText("2 colors copied")).toBeInTheDocument();
  });

  it("sends a logged-out visitor to /login when saving, carrying the intent", async () => {
    const user = userEvent.setup();
    renderCard();
    expect(screen.getByTestId("loc")).toHaveTextContent("/");
    await user.click(screen.getByRole("button", { name: /Toggle favorite/i }));
    // No toast into the void — the intent goes to the login page instead of dying.
    expect(screen.getByTestId("loc")).toHaveTextContent("/login");
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
