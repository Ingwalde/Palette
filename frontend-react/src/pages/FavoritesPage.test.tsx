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
  it("explains account-only favorites to a guest", async () => {
    renderFavorites();
    expect(
      await screen.findByRole("heading", { name: "Keep your favorites together" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear favorites" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in / Create account" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
