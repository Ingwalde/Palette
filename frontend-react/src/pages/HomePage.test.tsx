import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { HomePage } from "./HomePage";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/toast/ToastProvider";
import { ApiError } from "../lib/http";

vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.reject(new ApiError("no", 401))),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("../api/palettes", () => ({
  listPalettes: vi.fn(() =>
    Promise.resolve({
      items: [
        {
          id: 1,
          slug: "sea-breeze",
          name: "Sea Breeze",
          description: "Fresh.",
          colors: ["#000000", "#FFFFFF"],
          tags: ["cold"],
          created_at: "",
          updated_at: "",
        },
      ],
      total: 1,
      limit: 100,
      offset: 0,
    }),
  ),
}));
vi.mock("../api/tags", () => ({
  listTags: vi.fn(() => Promise.resolve([{ name: "cold", kind: "free", count: 1 }])),
}));

function renderHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter>
            <HomePage />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("HomePage", () => {
  it("renders palette cards and the result count from the API", async () => {
    renderHome();
    expect(
      await screen.findByRole("heading", { name: "Sea Breeze" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("1 palette")).toBeInTheDocument();
  });

  it("renders the All tag filter chip", async () => {
    renderHome();
    expect(await screen.findByRole("button", { name: "All" })).toBeInTheDocument();
  });
});
