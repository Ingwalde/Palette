import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./components/toast/ToastProvider";
import { ModalProvider } from "./components/modal/ModalProvider";
import { ApiError } from "./lib/http";

// Logged-out by default: getCurrentUser rejects with 401.
vi.mock("./api/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.reject(new ApiError("Not authenticated", 401))),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  changePassword: vi.fn(),
  deleteAccount: vi.fn(),
}));

// Keep the pages' data hooks off the network in the shell tests.
vi.mock("./api/palettes", () => ({
  listPalettes: vi.fn(() =>
    Promise.resolve({ items: [], total: 0, limit: 100, offset: 0 }),
  ),
  createPalette: vi.fn(),
  updatePalette: vi.fn(),
  deletePalette: vi.fn(),
}));
vi.mock("./api/tags", () => ({
  listTags: vi.fn(() => Promise.resolve([])),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}));

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Mirrors the provider stack in main.tsx. Without ToastProvider and ModalProvider the pages
  // that call useToast or useModal throw on render, and the failure reads as "no heading
  // found" rather than "a required context is missing".
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <ModalProvider>
            <MemoryRouter initialEntries={[path]}>
              <App />
            </MemoryRouter>
          </ModalProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("App shell", () => {
  it("renders the home hero and main navigation", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /find a color palette/i,
    );
    expect(
      screen.getByRole("navigation", { name: /main navigation/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Export" })).toHaveAttribute(
      "href",
      "/export",
    );
  });

  it("shows Login and hides Admin for a logged-out visitor", () => {
    renderAt("/");
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("renders a real 404 for an unknown route", async () => {
    renderAt("/nope");
    // Awaited, not synchronous: every route below the landing page is code-split now, so the
    // page arrives a microtask later through its Suspense boundary.
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Not found",
    );
    expect(screen.getByText("404")).toBeInTheDocument();
    // A dead end needs a way out; the old placeholder offered none.
    expect(screen.getByRole("link", { name: /back to palettes/i })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

// Every route below the landing page is code-split, so each one is reached through a Suspense
// boundary and a dynamic import. Walking them here is a routing smoke test — it proves each
// path resolves to the page it claims and that no lazy import points at a missing export,
// which a typo in the `.then(m => m.Something)` unwrapping would otherwise only reveal in the
// browser.
describe("routing", () => {
  it.each([
    ["/login", "Login to Palette"],
    ["/favorites", "Your favorite palettes"],
    ["/export", "Export palettes"],
    ["/forgot-password", "Forgot your password?"],
    ["/reset-password", "Choose a new password"],
    ["/changelog", "Changelog"],
  ])("%s renders its own page", async (path, heading) => {
    renderAt(path);
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(heading);
  });
});
