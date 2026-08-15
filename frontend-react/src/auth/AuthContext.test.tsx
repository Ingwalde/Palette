import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
import { ApiError } from "../lib/http";
import type { User } from "../types/api";

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
  login: vi.fn(() => Promise.resolve(admin)),
  register: vi.fn(),
  logout: vi.fn(() => Promise.resolve()),
  logoutEverywhere: vi.fn(() => Promise.resolve()),
}));

function Probe() {
  const { user, isAuthenticated, isAdmin, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="state">
        {isAuthenticated ? `${user?.username}:${isAdmin}` : "anon"}
      </p>
      <button onClick={() => void login({ username: "admin", password: "x" })}>
        login
      </button>
      <button onClick={() => void logout()}>logout</button>
    </div>
  );
}

function renderProbe() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("AuthContext", () => {
  it("starts anonymous, signs in on login, and clears on logout", async () => {
    const user = userEvent.setup();
    renderProbe();
    expect(await screen.findByText("anon")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "login" }));
    expect(await screen.findByText("admin:true")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "logout" }));
    expect(await screen.findByText("anon")).toBeInTheDocument();
  });
});
