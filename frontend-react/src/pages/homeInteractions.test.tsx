import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HomePage } from "./HomePage";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/toast/ToastProvider";
import { ApiError } from "../lib/http";
import * as palettesApi from "../api/palettes";
import * as homeStyles from "./HomePage.css";

const list = {
  items: [
    {
      id: 1,
      slug: "sea-breeze",
      owner_handle: "palette",
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
  logoutEverywhere: vi.fn(),
}));
vi.mock("../api/palettes", () => ({
  listPalettes: vi.fn(() => Promise.resolve(list)),
}));
vi.mock("../api/tags", () => ({
  listTags: vi.fn(() => Promise.resolve([{ name: "cold", kind: "free", count: 1 }])),
}));

// Surfaces the current address so a test can assert on what the filters wrote to the URL.
function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname + loc.search}</div>;
}

function renderHome(initialEntries: string[] = ["/"]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <HomePage />
            <LocationProbe />
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
    expect(chip).toHaveAttribute("aria-pressed", "false");
    await user.click(chip);

    // The state is exposed to assistive tech now, so assert that rather than the class.
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip.className).toContain(homeStyles.tagButtonActive);
    // Selecting one filter clears the others.
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reads search and tag from the URL and applies them", async () => {
    renderHome(["/?q=sea&tag=cold"]);
    // The search field mirrors the URL immediately, without waiting on the debounce.
    expect(screen.getByPlaceholderText(/Search by name/i)).toHaveValue("sea");
    const chip = await screen.findByRole("button", { name: "#cold" });
    expect(chip).toHaveAttribute("aria-pressed", "true");
    // The applied filter, not just the input, reaches the API.
    await waitFor(() =>
      expect(palettesApi.listPalettes).toHaveBeenCalledWith(
        expect.objectContaining({ search: "sea", tag: "cold" }),
      ),
    );
  });

  it("puts the selected tag in the URL as ordinary navigation", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(await screen.findByRole("button", { name: "#cold" }));
    expect(screen.getByTestId("loc")).toHaveTextContent("tag=cold");
  });

  it("strips an invalid sort from the URL", async () => {
    renderHome(["/?sort=%3Cscript%3E"]);
    await waitFor(() =>
      expect(screen.getByTestId("loc").textContent).not.toContain("sort="),
    );
  });

  it("opens a random palette's page when clicking Random palette", async () => {
    const user = userEvent.setup();
    renderHome();
    await screen.findByRole("link", { name: "Sea Breeze" });
    await user.click(screen.getByRole("button", { name: "Random palette" }));
    // The single fixture palette is owned by the curator, so its page is /u/palette/sea-breeze.
    expect(screen.getByTestId("loc")).toHaveTextContent("/u/palette/sea-breeze");
  });

  it("shows an API-error state when the backend fails", async () => {
    vi.mocked(palettesApi.listPalettes).mockRejectedValue(new ApiError("down", 500));
    renderHome();
    expect(await screen.findByText("API error")).toBeInTheDocument();
    expect(screen.getByText(/Could not reach the backend/i)).toBeInTheDocument();
  });

  it("loads a second page and then hides the button", async () => {
    const user = userEvent.setup();
    const page = (count: number, offset: number) => ({
      items: Array.from({ length: count }, (_, i) => ({
        ...list.items[0],
        id: offset + i,
        slug: `p-${offset + i}`,
        name: `Palette ${offset + i}`,
      })),
      total: 30,
      limit: 24,
      offset,
    });
    vi.mocked(palettesApi.listPalettes).mockImplementation((params) =>
      Promise.resolve((params?.offset ?? 0) === 0 ? page(24, 0) : page(6, 24)),
    );

    renderHome();
    const button = await screen.findByRole("button", { name: "Load more" });
    expect(screen.getByText("Showing 24 of 30 palettes")).toBeInTheDocument();

    await user.click(button);
    await waitFor(() =>
      expect(screen.getByText("Showing 30 of 30 palettes")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: /Load more/i })).not.toBeInTheDocument();
  });

  it("shows no Load more when the first page covers everything", async () => {
    renderHome();
    await screen.findByRole("link", { name: "Sea Breeze" });
    expect(screen.queryByRole("button", { name: /Load more/i })).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 1 palette")).toBeInTheDocument();
  });
});
