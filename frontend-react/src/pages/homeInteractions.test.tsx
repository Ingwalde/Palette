import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HomePage } from "./HomePage";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/toast/ToastProvider";
import { ApiError } from "../lib/http";
import * as palettesApi from "../api/palettes";

const list = {
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
};

vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.reject(new ApiError("no", 401))),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("../api/palettes", () => ({
  listPalettes: vi.fn(() => Promise.resolve(list)),
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

beforeEach(() => {
  vi.mocked(palettesApi.listPalettes).mockResolvedValue(list);
});

describe("HomePage interactions", () => {
  it("activates a tag chip on click", async () => {
    const user = userEvent.setup();
    renderHome();
    const chip = await screen.findByRole("button", { name: "#cold" });
    await user.click(chip);
    expect(chip.className).toMatch(/tag-button--active/);
  });

  it("selects a palette name into the search when clicking Random palette", async () => {
    const user = userEvent.setup();
    renderHome();
    await screen.findByRole("heading", { name: "Sea Breeze" });
    await user.click(screen.getByRole("button", { name: "Random palette" }));
    expect(screen.getByPlaceholderText(/Search by name/i)).toHaveValue("Sea Breeze");
  });

  it("shows an API-error state when the backend fails", async () => {
    vi.mocked(palettesApi.listPalettes).mockRejectedValue(new ApiError("down", 500));
    renderHome();
    expect(await screen.findByText("API error")).toBeInTheDocument();
    expect(screen.getByText(/Could not reach the backend/i)).toBeInTheDocument();
  });
});
