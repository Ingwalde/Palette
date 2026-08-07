import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { ApiError } from "./lib/http";

// Logged-out by default: getCurrentUser rejects with 401.
vi.mock("./api/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.reject(new ApiError("Not authenticated", 401))),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
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

  it("renders a placeholder for a route not yet ported", () => {
    renderAt("/admin");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Admin");
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });
});
