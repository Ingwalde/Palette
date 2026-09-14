import userEvent from "@testing-library/user-event";
import * as palettesApi from "../api/palettes";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
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
  logoutEverywhere: vi.fn(),
}));
vi.mock("../api/palettes", () => ({
  listPalettes: vi.fn(() =>
    Promise.resolve({
      items: [
        {
          id: 1,
          slug: "sea-breeze",
          owner_handle: "palette",
          visibility: "public",
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

function NavigationProbe() {
  const l = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="url">{l.search}</output>
      <button onClick={() => navigate(-1)}>Browser back</button>
    </>
  );
}

function renderHome(entry = "/") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[entry]}>
            <HomePage />
            <NavigationProbe />
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
    expect(await screen.findByText("Showing 1 of 1 palette")).toBeInTheDocument();
  });

  it("renders the All tag filter chip", async () => {
    renderHome();
    expect(await screen.findByRole("button", { name: "All" })).toBeInTheDocument();
  });
});

it("combines the color count, tag and search, and restores the count with Back", async () => {
  const u = userEvent.setup();
  renderHome("/?q=sea&tag=cold&color_count=2&sort=popular");
  await waitFor(() =>
    expect(palettesApi.listPalettes).toHaveBeenCalledWith(
      expect.objectContaining({
        search: "sea",
        tag: "cold",
        color_count: 2,
        sort: "popular",
        offset: 0,
      }),
    ),
  );
  await u.click(screen.getByRole("button", { name: "Number of colors" }));
  await u.click(screen.getByRole("option", { name: "4 colors" }));
  await waitFor(() =>
    expect(palettesApi.listPalettes).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: "sea",
        tag: "cold",
        color_count: 4,
        sort: "popular",
        offset: 0,
      }),
    ),
  );
  await u.click(screen.getByRole("button", { name: "Browser back" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Number of colors" })).toHaveTextContent(
      "2 colors",
    ),
  );
  expect(screen.getByRole("searchbox", { name: "Search palettes" })).toHaveValue("sea");
  await u.click(screen.getByRole("button", { name: /^#cold/ }));
  await waitFor(() => expect(screen.getByTestId("url")).not.toHaveTextContent("tag="));
  expect(screen.getByTestId("url")).toHaveTextContent("color_count=2");
  await u.click(screen.getByRole("button", { name: "Reset filters" }));
  await waitFor(() => expect(screen.getByTestId("url")).toBeEmptyDOMElement());
  expect(screen.getByRole("searchbox", { name: "Search palettes" })).toHaveValue("");
});

it("removes an invalid color count without losing a valid tag", async () => {
  renderHome("/?tag=cold&color_count=9");
  await waitFor(() => expect(screen.getByTestId("url")).toHaveTextContent("?tag=cold"));
  expect(screen.getByTestId("url")).not.toHaveTextContent("color_count");
  expect(screen.getByRole("button", { name: "Number of colors" })).toHaveTextContent(
    "Any count",
  );
});
