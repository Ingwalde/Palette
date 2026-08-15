import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { ResetPasswordPage } from "./ResetPasswordPage";
import { VerifyPage } from "./VerifyPage";
import { ToastProvider } from "../components/toast/ToastProvider";
import type { User } from "../types/api";
import * as authApi from "../api/auth";

const user: User = {
  id: 1,
  username: "demo",
  email: "d@x.com",
  is_admin: false,
  email_verified: true,
  created_at: "",
};

vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  logoutEverywhere: vi.fn(),
  forgotPassword: vi.fn(() =>
    Promise.resolve({ message: "If the email exists, a link was sent." }),
  ),
  resetPassword: vi.fn(() => Promise.resolve({ message: "Password updated." })),
  verifyEmail: vi.fn(() => Promise.resolve(user)),
  resendVerification: vi.fn(() => Promise.resolve({ message: "sent" })),
}));

function wrap(node: React.ReactNode, entries: string[] = ["/"]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={entries}>{node}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("ForgotPasswordPage", () => {
  it("sends a reset link and shows the generic result", async () => {
    const u = userEvent.setup();
    wrap(<ForgotPasswordPage />);
    await u.type(screen.getByRole("textbox"), "d@x.com");
    await u.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(authApi.forgotPassword).toHaveBeenCalledWith("d@x.com");
    expect(
      await screen.findByRole("heading", { name: "Check your inbox" }),
    ).toBeInTheDocument();
  });
});

describe("ResetPasswordPage", () => {
  it("shows a missing-token message without a token", () => {
    wrap(<ResetPasswordPage />, ["/reset-password"]);
    expect(
      screen.getByRole("heading", { name: "Reset link is missing" }),
    ).toBeInTheDocument();
  });

  it("resets the password with a token", async () => {
    const u = userEvent.setup();
    wrap(<ResetPasswordPage />, ["/reset-password?token=abc"]);
    const pwds = document.querySelectorAll<HTMLInputElement>('input[type="password"]');
    await u.type(pwds[0], "newpass1");
    await u.type(pwds[1], "newpass1");
    await u.click(screen.getByRole("button", { name: "Reset password" }));
    expect(authApi.resetPassword).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("heading", { name: "Password reset" }),
    ).toBeInTheDocument();
  });
});

describe("VerifyPage", () => {
  it("verifies the token and greets the user", async () => {
    wrap(<VerifyPage />, ["/verify?token=abc"]);
    expect(
      await screen.findByRole("heading", { name: /You're in, demo/ }),
    ).toBeInTheDocument();
    expect(authApi.verifyEmail).toHaveBeenCalledWith("abc");
  });

  it("shows an error without a token", async () => {
    wrap(<VerifyPage />, ["/verify"]);
    expect(
      await screen.findByRole("heading", { name: "Verification failed" }),
    ).toBeInTheDocument();
  });
});
