import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { FavoritesPage } from "./FavoritesPage";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/toast/ToastProvider";
import { ModalProvider } from "../components/modal/ModalProvider";
import { ApiError } from "../lib/http";

vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.reject(new ApiError("no", 401))),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  logoutEverywhere: vi.fn(),
}));

function renderFavorites() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <ModalProvider>
            <MemoryRouter>
              <FavoritesPage />
            </MemoryRouter>
          </ModalProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("FavoritesPage", () => {
  it("shows a logged-out visitor their (empty) on-device favorites, not a login wall", async () => {
    renderFavorites();
    expect(
      await screen.findByRole("heading", { name: /no favorites yet/i }),
    ).toBeInTheDocument();
    // The count is the on-device tally, and Clear is disabled while the list is empty.
    expect(screen.getByText(/0 saved palettes · on this device/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear favorites" })).toBeDisabled();
    // A Log in call-to-action is still offered.
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
  });
});
