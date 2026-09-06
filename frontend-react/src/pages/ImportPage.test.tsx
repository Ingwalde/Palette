import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImportPage } from "./ImportPage";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/toast/ToastProvider";
import { ApiError } from "../lib/http";
import type { User } from "../types/api";
import * as imageColors from "../lib/imageColors";
import * as importsApi from "../api/imports";

const user: User = {
  id: 5,
  username: "ann",
  email: "a@x.com",
  is_admin: false,
  email_verified: true,
  created_at: "",
};

vi.mock("../lib/imageColors", () => ({ extractColorsFromBlob: vi.fn() }));
vi.mock("../api/imports", () => ({
  fetchImageBlob: vi.fn(),
  getProviders: vi.fn(),
  figmaAuthorizeUrl: vi.fn(),
  figmaExtract: vi.fn(),
  figmaDisconnect: vi.fn(),
  pinterestAuthorizeUrl: vi.fn(),
  pinterestDisconnect: vi.fn(),
  pinterestBoards: vi.fn(() => Promise.resolve([])),
  pinterestPins: vi.fn(() => Promise.resolve([])),
}));

const DISABLED = {
  figma: { enabled: false, connected: false },
  pinterest: { enabled: false, connected: false },
};
vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(user)),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  logoutEverywhere: vi.fn(),
}));
vi.mock("../api/tags", () => ({ listTags: vi.fn(() => Promise.resolve([])) }));

function DraftProbe() {
  const loc = useLocation();
  const draft = (loc.state as { draft?: { colors?: string[] } } | null)?.draft;
  return (
    <div>
      <div data-testid="path">{loc.pathname}</div>
      <div data-testid="draft">{draft?.colors?.join(",") ?? ""}</div>
    </div>
  );
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={["/import"]}>
            <Routes>
              <Route path="/import" element={<ImportPage />} />
              <Route path="/palettes/new" element={<div>EDITOR</div>} />
              <Route path="/login" element={<div>LOGIN</div>} />
            </Routes>
            <DraftProbe />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(imageColors.extractColorsFromBlob).mockResolvedValue([
    "#101010",
    "#A0A0A0",
    "#F0F0F0",
  ]);
  vi.mocked(importsApi.getProviders).mockResolvedValue(DISABLED);
});

describe("ImportPage", () => {
  it("extracts swatches from an uploaded image", async () => {
    const u = userEvent.setup();
    const { container } = renderPage();
    await screen.findByRole("heading", { name: /Extract a palette/i });

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["x"], "photo.png", { type: "image/png" });
    await u.upload(input, file);

    await waitFor(() =>
      expect(imageColors.extractColorsFromBlob).toHaveBeenCalledWith(file, 6),
    );
    expect(await screen.findByText("#101010")).toBeInTheDocument();
    expect(screen.getByText("#F0F0F0")).toBeInTheDocument();
  });

  it("hands the extracted colors to the new-palette editor", async () => {
    const u = userEvent.setup();
    const { container } = renderPage();
    await screen.findByRole("heading", { name: /Extract a palette/i });

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    await u.upload(input, new File(["x"], "photo.png", { type: "image/png" }));
    await screen.findByText("#101010");

    await u.click(screen.getByRole("button", { name: "Edit as palette" }));
    await waitFor(() =>
      expect(screen.getByTestId("path")).toHaveTextContent("/palettes/new"),
    );
    expect(screen.getByTestId("draft")).toHaveTextContent("#101010,#A0A0A0,#F0F0F0");
  });

  it("fetches an image URL through the proxy", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    vi.mocked(importsApi.fetchImageBlob).mockResolvedValue(blob);
    const u = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: /Extract a palette/i });

    await u.type(screen.getByLabelText("Image URL"), "https://cdn.test/a.png");
    await u.click(screen.getByRole("button", { name: "Extract from URL" }));

    await waitFor(() =>
      expect(importsApi.fetchImageBlob).toHaveBeenCalledWith("https://cdn.test/a.png"),
    );
    expect(await screen.findByText("#101010")).toBeInTheDocument();
  });

  it("shows a message when the URL fetch fails", async () => {
    vi.mocked(importsApi.fetchImageBlob).mockRejectedValue(
      new ApiError("That URL is not an image", 422),
    );
    const u = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: /Extract a palette/i });

    await u.type(screen.getByLabelText("Image URL"), "https://cdn.test/page.html");
    await u.click(screen.getByRole("button", { name: "Extract from URL" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That URL is not an image",
    );
  });

  it("hides the Figma controls when the provider is disabled", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /Extract a palette/i });
    expect(
      screen.queryByRole("button", { name: "Connect Figma" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Extract from Figma" }),
    ).not.toBeInTheDocument();
  });

  it("offers to connect Figma when enabled but not linked", async () => {
    vi.mocked(importsApi.getProviders).mockResolvedValue({
      figma: { enabled: true, connected: false },
      pinterest: { enabled: false, connected: false },
    });
    vi.mocked(importsApi.figmaAuthorizeUrl).mockResolvedValue({
      url: "https://www.figma.com/oauth?x=1",
    });
    // window.location.href assignment is a no-op we don't want jsdom to attempt.
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...original, set href(_v: string) {} },
    });
    const u = userEvent.setup();
    renderPage();
    await u.click(await screen.findByRole("button", { name: "Connect Figma" }));
    await waitFor(() => expect(importsApi.figmaAuthorizeUrl).toHaveBeenCalled());
    Object.defineProperty(window, "location", { configurable: true, value: original });
  });

  it("extracts colors from a Figma file when connected", async () => {
    vi.mocked(importsApi.getProviders).mockResolvedValue({
      figma: { enabled: true, connected: true },
      pinterest: { enabled: false, connected: false },
    });
    vi.mocked(importsApi.figmaExtract).mockResolvedValue({
      colors: ["#101010", "#A0A0A0", "#F0F0F0"],
    });
    const u = userEvent.setup();
    renderPage();
    await u.type(
      await screen.findByLabelText("Figma file"),
      "https://www.figma.com/file/ABC123/x",
    );
    await u.click(screen.getByRole("button", { name: "Extract from Figma" }));
    await waitFor(() =>
      expect(importsApi.figmaExtract).toHaveBeenCalledWith(
        "https://www.figma.com/file/ABC123/x",
      ),
    );
    expect(await screen.findByText("#101010")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit as palette" })).toBeInTheDocument();
  });

  it("hides Pinterest controls when disabled", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /Extract a palette/i });
    expect(
      screen.queryByRole("button", { name: "Connect Pinterest" }),
    ).not.toBeInTheDocument();
  });

  it("extracts from a chosen Pinterest pin via the image proxy", async () => {
    vi.mocked(importsApi.getProviders).mockResolvedValue({
      figma: { enabled: false, connected: false },
      pinterest: { enabled: true, connected: true },
    });
    vi.mocked(importsApi.pinterestBoards).mockResolvedValue([
      { id: "b1", name: "Moodboard" },
    ]);
    vi.mocked(importsApi.pinterestPins).mockResolvedValue([
      { id: "p1", image_url: "https://i.pinimg.com/p1.jpg" },
    ]);
    vi.mocked(importsApi.fetchImageBlob).mockResolvedValue(
      new Blob(["x"], { type: "image/png" }),
    );
    const u = userEvent.setup();
    renderPage();

    await screen.findByLabelText("Pinterest board");
    // Wait for the boards query to populate the options before selecting.
    await screen.findByRole("option", { name: "Moodboard" });
    await u.selectOptions(screen.getByLabelText("Pinterest board"), "b1");
    const pin = await screen.findByRole("button", {
      name: "Extract colors from this pin",
    });
    await u.click(pin);

    await waitFor(() =>
      expect(importsApi.fetchImageBlob).toHaveBeenCalledWith(
        "https://i.pinimg.com/p1.jpg",
      ),
    );
    expect(await screen.findByText("#101010")).toBeInTheDocument();
  });
});
