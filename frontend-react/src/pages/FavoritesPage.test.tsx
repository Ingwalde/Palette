import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { FavoritesPage } from "./FavoritesPage";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/toast/ToastProvider";
import { ApiError } from "../lib/http";

vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.reject(new ApiError("no", 401))),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

function renderFavorites() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter>
            <FavoritesPage />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("FavoritesPage", () => {
  it("prompts a logged-out visitor to log in", async () => {
    renderFavorites();
    expect(
      await screen.findByRole("heading", { name: /log in to view favorites/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Login required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear favorites" })).toBeDisabled();
  });
});
