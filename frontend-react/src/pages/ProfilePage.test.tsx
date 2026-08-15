import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfilePage } from "./ProfilePage";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/toast/ToastProvider";
import { ModalProvider } from "../components/modal/ModalProvider";
import type { User } from "../types/api";
import * as authApi from "../api/auth";

const user: User = {
  id: 1,
  username: "demo",
  email: "demo@x.com",
  is_admin: false,
  email_verified: true,
  created_at: "",
};

vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(user)),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(() => Promise.resolve()),
  logoutEverywhere: vi.fn(() => Promise.resolve()),
  changePassword: vi.fn(() => Promise.resolve({ message: "ok" })),
  resendVerification: vi.fn(() => Promise.resolve({ message: "sent" })),
  deleteAccount: vi.fn(() => Promise.resolve()),
}));

function renderProfile() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          {/* ProfilePage asks for a confirmation before logging out everywhere, so it needs
              the modal context the way main.tsx provides it. */}
          <ModalProvider>
            <MemoryRouter initialEntries={["/profile"]}>
              <Routes>
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/" element={<p>HOME PAGE</p>} />
              </Routes>
            </MemoryRouter>
          </ModalProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
});

async function openPasswordForm(u: ReturnType<typeof userEvent.setup>) {
  renderProfile();
  await screen.findByRole("heading", { name: "demo" });
  await u.click(screen.getByRole("button", { name: "Change password" }));
}

describe("ProfilePage", () => {
  it("shows the account username and email", async () => {
    renderProfile();
    expect(await screen.findByRole("heading", { name: "demo" })).toBeInTheDocument();
    expect(screen.getByText("demo@x.com")).toBeInTheDocument();
  });

  it("rejects a mismatched new-password confirmation", async () => {
    const u = userEvent.setup();
    await openPasswordForm(u);
    const pwds = document.querySelectorAll<HTMLInputElement>('input[type="password"]');
    await u.type(pwds[0], "current1");
    await u.type(pwds[1], "newpass1");
    await u.type(pwds[2], "different");
    await u.click(screen.getByRole("button", { name: "Save new password" }));
    expect(await screen.findByText(/confirmation does not match/i)).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it("changes the password when valid", async () => {
    const u = userEvent.setup();
    await openPasswordForm(u);
    const pwds = document.querySelectorAll<HTMLInputElement>('input[type="password"]');
    await u.type(pwds[0], "current1");
    await u.type(pwds[1], "newpass1");
    await u.type(pwds[2], "newpass1");
    await u.click(screen.getByRole("button", { name: "Save new password" }));
    expect(authApi.changePassword).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Password changed")).toBeInTheDocument();
  });

  it("logs out and returns home", async () => {
    const u = userEvent.setup();
    renderProfile();
    await screen.findByRole("heading", { name: "demo" });
    await u.click(screen.getByRole("button", { name: "Logout" }));
    expect(authApi.logout).toHaveBeenCalled();
    expect(await screen.findByText("HOME PAGE")).toBeInTheDocument();
  });

  it("deletes the account after a password prompt", async () => {
    const u = userEvent.setup();
    vi.spyOn(window, "prompt").mockReturnValue("mypassword");
    renderProfile();
    await screen.findByRole("heading", { name: "demo" });
    await u.click(screen.getByRole("button", { name: "Delete account" }));
    expect(authApi.deleteAccount).toHaveBeenCalledWith("mypassword");
    expect(await screen.findByText("HOME PAGE")).toBeInTheDocument();
  });

  it("shows the verify banner and resends for an unverified account", async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      ...user,
      email_verified: false,
    });
    const u = userEvent.setup();
    renderProfile();
    await screen.findByRole("heading", { name: "demo" });
    await u.click(screen.getByRole("button", { name: "Resend link" }));
    expect(authApi.resendVerification).toHaveBeenCalledWith("demo@x.com");
  });

  it("asks before logging out everywhere, and does nothing if declined", async () => {
    const user = userEvent.setup();
    renderProfile();
    await screen.findByRole("heading", { name: "demo" });

    await user.click(screen.getByRole("button", { name: "Log out everywhere" }));

    // Not undoable, and it reaches devices the user is not holding — so it is confirmed.
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(authApi.logoutEverywhere).not.toHaveBeenCalled();
  });

  it("ends every session once confirmed", async () => {
    const user = userEvent.setup();
    renderProfile();
    await screen.findByRole("heading", { name: "demo" });

    await user.click(screen.getByRole("button", { name: "Log out everywhere" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Log out everywhere" }));

    expect(authApi.logoutEverywhere).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("HOME PAGE")).toBeInTheDocument();
  });
});
