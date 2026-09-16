import * as palettesApi from "../api/palettes";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { ExportPage } from "./ExportPage";
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
  getPalette: vi.fn(() =>
    Promise.resolve({
      id: 1,
      slug: "sea-breeze",
      owner_handle: "palette",
      visibility: "public",
      name: "Sea Breeze",
      description: "Fresh.",
      colors: ["#006D77", "#83C5BE"],
      tags: ["cold"],
      created_at: "",
      updated_at: "",
    }),
  ),
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
          colors: ["#006D77", "#83C5BE"],
          tags: ["cold"],
          created_at: "",
          updated_at: "",
        },
      ],
      total: 1,
      limit: 200,
      offset: 0,
    }),
  ),
}));
vi.mock("../api/tags", () => ({ listTags: vi.fn(() => Promise.resolve([])) }));
// Keep the text generators real; stub only the canvas PNG (jsdom has no 2D context).
vi.mock("../lib/exportGenerators", async (importActual) => ({
  ...(await importActual<typeof import("../lib/exportGenerators")>()),
  generatePngDataUrl: vi.fn(() => "data:image/png;base64,MOCK"),
}));
import * as exportGenerators from "../lib/exportGenerators";

function renderExport(initialEntry = "/export") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <ExportPage />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

async function pickSeaBreeze(user: ReturnType<typeof userEvent.setup>) {
  renderExport();
  const option = await screen.findByRole("button", { name: /Sea Breeze/i });
  await user.click(option);
}

describe("ExportPage", () => {
  it("prompts to choose a palette before anything is selected", async () => {
    renderExport();
    expect(
      await screen.findByText(/Choose a palette to preview and export/i),
    ).toBeInTheDocument();
  });

  it("generates CSS variables for the chosen palette", async () => {
    const user = userEvent.setup();
    await pickSeaBreeze(user);
    expect(await screen.findByText(/--sea-breeze-1: #006D77;/)).toBeInTheDocument();
    expect(screen.getByText(/:root \{/)).toBeInTheDocument();
  });

  it("switches to JSON output", async () => {
    const user = userEvent.setup();
    await pickSeaBreeze(user);
    await user.click(screen.getByRole("button", { name: "Export format" }));
    await user.click(screen.getByRole("option", { name: "JSON" }));
    expect(await screen.findByText(/"slug": "sea-breeze"/)).toBeInTheDocument();
  });

  it("renders the PNG preview via the (mocked) canvas generator", async () => {
    const user = userEvent.setup();
    await pickSeaBreeze(user);
    await user.click(screen.getByRole("button", { name: "Image" }));
    await waitFor(() => expect(exportGenerators.generatePngDataUrl).toHaveBeenCalled());
    expect(await screen.findByAltText("PNG export preview")).toHaveAttribute(
      "src",
      "data:image/png;base64,MOCK",
    );
  });

  it("copies the CSS result and toasts", async () => {
    const user = userEvent.setup();
    await pickSeaBreeze(user);
    await screen.findByText(/--sea-breeze-1/);
    await user.click(screen.getByRole("button", { name: "Copy code" }));
    expect(await screen.findByText("Export result copied")).toBeInTheDocument();
  });

  it("downloads the export file and toasts", async () => {
    const user = userEvent.setup();
    // jsdom has no real download; stub the anchor click so it doesn't throw.
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await pickSeaBreeze(user);
    await screen.findByText(/--sea-breeze-1/);
    await user.click(screen.getByRole("button", { name: "Download file" }));
    expect(await screen.findByText("File download started")).toBeInTheDocument();
  });

  it("prompts for favorites when the source is Favorites (logged out)", async () => {
    const user = userEvent.setup();
    renderExport();
    await user.click(await screen.findByRole("button", { name: "Palette source" }));
    await user.click(screen.getByRole("option", { name: "Favorites only" }));
    expect(
      await screen.findByText(/Log in to export your favorites/i),
    ).toBeInTheDocument();
  });
});

it("exports a scoped deep link missing from public search and preserves it when searching or changing format", async () => {
  vi.mocked(palettesApi.listPalettes).mockResolvedValueOnce({
    items: [],
    total: 0,
    limit: 3,
    offset: 0,
  });
  const u = userEvent.setup();
  renderExport("/export?source=single&handle=ann&slug=sea-breeze&format=json");
  expect(await screen.findByText(/"slug": "sea-breeze"/)).toBeInTheDocument();
  expect(palettesApi.getPalette).toHaveBeenCalledWith("ann", "sea-breeze");
  await u.click(screen.getByRole("button", { name: "Change palette" }));
  await u.clear(screen.getByRole("searchbox"));
  await u.type(screen.getByRole("searchbox"), "another palette");
  await u.click(screen.getByRole("button", { name: "Export format" }));
  await u.click(screen.getByRole("option", { name: "CSS variables" }));
  expect(await screen.findByText(/--sea-breeze-1/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Download file" })).toBeEnabled();
});

it("does not export a same-named search result when the scoped palette is unavailable", async () => {
  vi.mocked(palettesApi.getPalette).mockRejectedValueOnce(new ApiError("Not found", 404));
  renderExport("/export?source=single&handle=wrong-owner&slug=sea-breeze");
  expect(
    await screen.findByText(/unavailable or you do not have access/),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Copy code" })).toBeDisabled(),
  );
  expect(screen.getByRole("button", { name: "Download file" })).toBeDisabled();
  expect(screen.queryByText(/--sea-breeze-1/)).not.toBeInTheDocument();
});

it("previews the same SVG content used for download and keeps the chosen palette", async () => {
  const download = vi
    .spyOn(exportGenerators, "downloadTextFile")
    .mockImplementation(() => {});
  const u = userEvent.setup();
  renderExport("/export?source=single&handle=palette&slug=sea-breeze&format=svg");
  const preview = await screen.findByAltText("SVG export preview");
  const content = decodeURIComponent(
    preview.getAttribute("src")!.split(",").slice(1).join(","),
  );
  expect(content).toContain("#006D77");
  await u.click(screen.getByRole("button", { name: "Download SVG" }));
  expect(download).toHaveBeenCalledWith(content, "sea-breeze-palette.svg");
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  download.mockRestore();
});
