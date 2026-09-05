import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function renderExport() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <ExportPage />
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
      await screen.findByText(/Choose one palette to generate export/i),
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
    await user.click(screen.getByRole("button", { name: "Export format" }));
    await user.click(screen.getByRole("option", { name: "PNG image" }));
    expect(exportGenerators.generatePngDataUrl).toHaveBeenCalled();
    expect(await screen.findByAltText("PNG export preview")).toHaveAttribute(
      "src",
      "data:image/png;base64,MOCK",
    );
  });

  it("copies the CSS result and toasts", async () => {
    const user = userEvent.setup();
    await pickSeaBreeze(user);
    await screen.findByText(/--sea-breeze-1/);
    await user.click(screen.getByRole("button", { name: "Copy result" }));
    expect(await screen.findByText("Export result copied")).toBeInTheDocument();
  });

  it("downloads the export file and toasts", async () => {
    const user = userEvent.setup();
    // jsdom has no real download; stub the anchor click so it doesn't throw.
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await pickSeaBreeze(user);
    await screen.findByText(/--sea-breeze-1/);
    await user.click(screen.getByRole("button", { name: "Download file" }));
    expect(await screen.findByText("Export file downloaded")).toBeInTheDocument();
  });

  it("prompts for favorites when the source is Favorites (logged out)", async () => {
    const user = userEvent.setup();
    renderExport();
    await user.click(await screen.findByRole("button", { name: "Palette source" }));
    await user.click(screen.getByRole("option", { name: "Favorites only" }));
    expect(await screen.findByText(/No palettes selected/i)).toBeInTheDocument();
  });
});
