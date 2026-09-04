import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ColorFormatProvider, useColorFormat } from "./ColorFormatContext";
import { PaletteCard } from "./PaletteCard";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "./toast/ToastProvider";
import { ApiError } from "../lib/http";
import type { Palette } from "../types/api";

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

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <ColorFormatProvider>
            <MemoryRouter>
              <PaletteCard palette={palette} />
            </MemoryRouter>
          </ColorFormatProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("color format", () => {
  it("labels swatches in HEX by default", () => {
    renderCard();
    expect(screen.getByRole("button", { name: "Copy #000000" })).toBeInTheDocument();
  });

  it("labels swatches in the format remembered in localStorage", () => {
    localStorage.setItem("palette:color-format", "rgb");
    renderCard();
    // The stored RGB preference drives both the label and, with it, what a click copies.
    expect(screen.getByRole("button", { name: "Copy rgb(0, 0, 0)" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy rgb(255, 255, 255)" }),
    ).toBeInTheDocument();
  });

  it("falls back to HEX and still renders when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    function Probe() {
      return <span>{useColorFormat().format}</span>;
    }
    render(
      <ColorFormatProvider>
        <Probe />
      </ColorFormatProvider>,
    );
    expect(screen.getByText("hex")).toBeInTheDocument();
  });
});
