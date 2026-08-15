import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { LoginPage } from "./LoginPage";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/toast/ToastProvider";
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
  login: vi.fn(() => Promise.resolve(admin)),
  register: vi.fn(() => Promise.resolve(admin)),
  logout: vi.fn(),
  logoutEverywhere: vi.fn(),
}));

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={["/login"]}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/profile" element={<p>PROFILE PAGE</p>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("LoginPage", () => {
  it("logs in and redirects to the profile", async () => {
    const user = userEvent.setup();
    renderLogin();

    const loginForm = screen.getByRole("heading", { name: "Login" }).closest("form")!;
    await user.type(loginForm.querySelector('input[type="text"]')!, "admin");
    await user.type(loginForm.querySelector('input[type="password"]')!, "secret123");
    await user.click(loginForm.querySelector('button[type="submit"]')!);

    expect(vi.mocked(authApi.login).mock.calls[0][0]).toEqual({
      username: "admin",
      password: "secret123",
    });
    expect(await screen.findByText("PROFILE PAGE")).toBeInTheDocument();
  });

  it("renders both the login and create-account forms", () => {
    renderLogin();
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create account" })).toBeInTheDocument();
  });
});
