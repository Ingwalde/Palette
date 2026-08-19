import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Layout } from "./Layout";
import { AuthProvider } from "../auth/AuthContext";
import { ApiError } from "../lib/http";
import type { User } from "../types/api";
import * as authApi from "../api/auth";

const admin: User = {
  id: 1,
  username: "admin",
  email: "a@x.com",
  is_admin: true,
  email_verified: true,
  created_at: "",
};

vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.reject(new ApiError("no", 401))),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(() => Promise.resolve()),
  logoutEverywhere: vi.fn(() => Promise.resolve()),
}));

function renderLayout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<p>content</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("Layout nav", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows Login and hides Admin for a logged-out visitor", async () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new ApiError("no", 401));
    renderLayout();
    expect(await screen.findByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Favorites" })).toHaveAttribute(
      "href",
      "/favorites",
    );
  });

  it("shows the username, Logout and Admin link for a signed-in admin", async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(admin);
    renderLayout();
    expect(await screen.findByRole("link", { name: "admin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });
});
