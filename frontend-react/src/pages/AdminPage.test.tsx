import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminPage } from "./AdminPage";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/toast/ToastProvider";
import { ModalProvider } from "../components/modal/ModalProvider";
import { ApiError } from "../lib/http";
import type { Palette, Report, Tag, User } from "../types/api";
import * as authApi from "../api/auth";
import * as palettesApi from "../api/palettes";
import * as tagsApi from "../api/tags";
import * as reportsApi from "../api/reports";

const admin: User = {
  id: 1,
  username: "admin",
  email: "a@x.com",
  is_admin: true,
  email_verified: true,
  created_at: "",
};
const regular: User = { ...admin, id: 2, username: "bob", is_admin: false };
const palette: Palette = {
  id: 7,
  slug: "nordic-frost",
  owner_handle: "palette",
  visibility: "public",
  name: "Nordic Frost",
  description: "Clean.",
  colors: ["#26323D", "#F0F3F5"],
  tags: ["cold"],
  created_at: "",
  updated_at: "",
};
const tag: Tag = { name: "cold", kind: "free", count: 2 };
const report: Report = {
  id: 3,
  reason: "spam",
  detail: "",
  status: "open",
  created_at: "",
  palette: { name: "Bad Palette", slug: "bad-palette", owner_handle: "bob" },
};

vi.mock("../api/auth", () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(admin)),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  logoutEverywhere: vi.fn(),
}));
vi.mock("../api/palettes", () => ({
  listPalettes: vi.fn(() =>
    Promise.resolve({ items: [palette], total: 1, limit: 10, offset: 0 }),
  ),
  createPalette: vi.fn(() => Promise.resolve(palette)),
  updatePalette: vi.fn(() => Promise.resolve(palette)),
  deletePalette: vi.fn(() => Promise.resolve()),
}));
vi.mock("../api/tags", () => ({
  listTags: vi.fn(() => Promise.resolve([tag])),
  createTag: vi.fn(() => Promise.resolve(tag)),
  updateTag: vi.fn(() => Promise.resolve(tag)),
  deleteTag: vi.fn(() => Promise.resolve()),
}));
vi.mock("../api/reports", () => ({
  listReports: vi.fn(() => Promise.resolve([report])),
  actionReport: vi.fn(() => Promise.resolve(report)),
  dismissReport: vi.fn(() => Promise.resolve(report)),
}));

function renderAdmin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <ModalProvider>
            <MemoryRouter>
              <AdminPage />
            </MemoryRouter>
          </ModalProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(authApi.getCurrentUser).mockResolvedValue(admin);
  vi.clearAllMocks();
  vi.mocked(authApi.getCurrentUser).mockResolvedValue(admin);
});

describe("AdminPage access gating", () => {
  it("shows the login card for a logged-out visitor", async () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new ApiError("no", 401));
    renderAdmin();
    expect(
      await screen.findByRole("heading", { name: "Login required" }),
    ).toBeInTheDocument();
  });

  it("shows the admin-role card for a non-admin", async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(regular);
    renderAdmin();
    expect(
      await screen.findByRole("heading", { name: "Admin role required" }),
    ).toBeInTheDocument();
  });

  it("shows the panel for an admin", async () => {
    renderAdmin();
    expect(
      await screen.findByRole("heading", { name: "Admin panel" }),
    ).toBeInTheDocument();
  });
});

describe("AdminPage palettes", () => {
  it("lists palettes from the API", async () => {
    renderAdmin();
    expect(
      await screen.findByRole("heading", { name: "Nordic Frost" }),
    ).toBeInTheDocument();
    expect(screen.getByText("/nordic-frost")).toBeInTheDocument();
  });

  it("creates a palette from the form", async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByRole("heading", { name: "Admin panel" });

    await user.type(screen.getByPlaceholderText("Nordic Blue"), "Sunset");
    await user.type(screen.getByPlaceholderText("Short description..."), "Warm tones");
    await user.click(screen.getByRole("button", { name: "Create palette" }));

    expect(palettesApi.createPalette).toHaveBeenCalledTimes(1);
    expect(vi.mocked(palettesApi.createPalette).mock.calls[0][0]).toMatchObject({
      name: "Sunset",
      description: "Warm tones",
    });
    expect(await screen.findByText("Palette created")).toBeInTheDocument();
  });

  it("adds and removes colour rows (capped at 8)", async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByRole("heading", { name: "Admin panel" });

    // Counted by the per-row colour picker's accessible name rather than a CSS class, which
    // is a generated hash now.
    const rows = () => screen.getAllByLabelText(/Colour \d+ picker/);

    expect(rows()).toHaveLength(1);
    const addBtn = screen.getByRole("button", { name: "+ Add color" });
    for (let i = 0; i < 10; i++) await user.click(addBtn);
    expect(rows()).toHaveLength(8);
    expect(addBtn).toBeDisabled();

    await user.click(screen.getAllByRole("button", { name: "Remove color" })[0]);
    expect(rows()).toHaveLength(7);
  });

  it("adds a tag chip via Enter", async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByRole("heading", { name: "Admin panel" });
    const tagInput = screen.getByPlaceholderText("Type or pick a tag");
    await user.type(tagInput, "warm{Enter}");
    expect(screen.getByText("warm")).toBeInTheDocument();
  });

  it("loads a palette into the form when editing", async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByRole("heading", { name: "Nordic Frost" });
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByDisplayValue("Nordic Frost")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update palette" })).toBeInTheDocument();
  });

  it("deletes a palette after confirming the modal", async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByRole("heading", { name: "Nordic Frost" });
    await user.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(palettesApi.deletePalette).toHaveBeenCalledWith(7);
    expect(await screen.findByText("Palette deleted")).toBeInTheDocument();
  });
});

describe("AdminPage tags", () => {
  async function goToTags(user: ReturnType<typeof userEvent.setup>) {
    renderAdmin();
    await screen.findByRole("heading", { name: "Admin panel" });
    await user.click(screen.getByRole("tab", { name: "Tags" }));
    await screen.findByRole("heading", { name: "All tags" });
  }

  it("lists tags with a kind badge and count", async () => {
    const user = userEvent.setup();
    await goToTags(user);
    expect(screen.getByRole("heading", { name: "cold" })).toBeInTheDocument();
    expect(screen.getByText("2 palettes")).toBeInTheDocument();
  });

  it("adds a tag", async () => {
    const user = userEvent.setup();
    await goToTags(user);
    await user.type(screen.getByPlaceholderText("new-tag"), "retro");
    await user.click(screen.getByRole("button", { name: "Add tag" }));
    expect(vi.mocked(tagsApi.createTag).mock.calls[0][0]).toMatchObject({
      name: "retro",
    });
  });

  it("toggles a tag's kind", async () => {
    const user = userEvent.setup();
    await goToTags(user);
    await user.click(screen.getByRole("button", { name: "Make category" }));
    expect(tagsApi.updateTag).toHaveBeenCalledWith("cold", { kind: "purpose" });
  });

  it("deletes a tag after confirming", async () => {
    const user = userEvent.setup();
    await goToTags(user);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(tagsApi.deleteTag).toHaveBeenCalledWith("cold");
  });

  it("renames a tag via the prompt dialog", async () => {
    const user = userEvent.setup();
    await goToTags(user);
    await user.click(screen.getByRole("button", { name: "Rename" }));
    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByRole("textbox");
    await user.clear(input);
    await user.type(input, "chilly");
    await user.click(within(dialog).getByRole("button", { name: "Rename" }));
    expect(tagsApi.updateTag).toHaveBeenCalledWith("cold", { name: "chilly" });
  });
});

describe("AdminPage list controls", () => {
  it("cancels an edit and resets the form", async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByRole("heading", { name: "Nordic Frost" });
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByDisplayValue("Nordic Frost")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel edit" }));
    expect(screen.getByRole("heading", { name: "Add palette" })).toBeInTheDocument();
  });

  it("searches the palette list", async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByRole("heading", { name: "Nordic Frost" });
    await user.type(
      screen.getByPlaceholderText("Search by name, description or tag..."),
      "frost",
    );
    // debounced query re-runs with the search term
    await vi.waitFor(() =>
      expect(vi.mocked(palettesApi.listPalettes).mock.calls.at(-1)?.[0]).toMatchObject({
        search: "frost",
      }),
    );
  });
});

describe("AdminPage in-flight guard", () => {
  it("does not create the palette twice when Save is clicked twice", async () => {
    // Nothing marked the request as in flight, so a second click while the first was still
    // travelling sent a second create. The backend resolves the slug collision instead of
    // refusing it, so this produced two near-identical palettes and no error to say so.
    const user = userEvent.setup();
    let release!: (value: Palette) => void;
    vi.mocked(palettesApi.createPalette).mockImplementationOnce(
      () => new Promise<Palette>((resolve) => (release = resolve)),
    );

    renderAdmin();
    await user.type(await screen.findByPlaceholderText("Nordic Blue"), "Ocean");
    await user.type(screen.getByPlaceholderText("Short description..."), "Blue.");
    const save = screen.getByRole("button", { name: "Create palette" });
    await user.click(save);

    expect(save).toBeDisabled();
    await user.click(save);
    expect(palettesApi.createPalette).toHaveBeenCalledTimes(1);

    release(palette);
  });
});

describe("AdminPage reports", () => {
  async function goToReports(user: ReturnType<typeof userEvent.setup>) {
    renderAdmin();
    await screen.findByRole("heading", { name: "Admin panel" });
    await user.click(screen.getByRole("tab", { name: "Reports" }));
    await screen.findByRole("heading", { name: "Open reports" });
  }

  it("lists open reports with the reason", async () => {
    const user = userEvent.setup();
    await goToReports(user);
    expect(screen.getByRole("link", { name: "Bad Palette" })).toHaveAttribute(
      "href",
      "/u/bob/bad-palette",
    );
    expect(screen.getByText(/reason: spam/)).toBeInTheDocument();
  });

  it("shows an empty state when there are no reports", async () => {
    vi.mocked(reportsApi.listReports).mockResolvedValueOnce([]);
    const user = userEvent.setup();
    await goToReports(user);
    expect(screen.getByRole("heading", { name: "No open reports" })).toBeInTheDocument();
  });

  it("dismisses a report", async () => {
    const user = userEvent.setup();
    await goToReports(user);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(reportsApi.dismissReport).toHaveBeenCalledWith(3);
    expect(await screen.findByText("Report dismissed")).toBeInTheDocument();
  });

  it("removes a palette after confirming", async () => {
    const user = userEvent.setup();
    await goToReports(user);
    await user.click(screen.getByRole("button", { name: "Remove palette" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(reportsApi.actionReport).toHaveBeenCalledWith(3);
    expect(await screen.findByText("Palette removed")).toBeInTheDocument();
  });
});

describe("AdminPage tabs", () => {
  it("moves between tabs with the arrow keys and points each at its panel", async () => {
    // The roles were there before this; the behaviour they promise was not. A reader told
    // "tab, 1 of 2" reaches for the arrow keys, and nothing named the panel a tab controlled.
    const user = userEvent.setup();
    renderAdmin();

    const palettes = await screen.findByRole("tab", { name: "Palettes" });
    const tags = screen.getByRole("tab", { name: "Tags" });

    expect(palettes).toHaveAttribute("aria-controls", "admin-panel-palettes");
    expect(tags).toHaveAttribute("aria-controls", "admin-panel-tags");
    // One tab stop for the group, not one per tab.
    expect(palettes).toHaveAttribute("tabindex", "0");
    expect(tags).toHaveAttribute("tabindex", "-1");

    palettes.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Tags" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Tags" }));
    // The panel exists and says which tab named it.
    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "aria-labelledby",
      "admin-tab-tags",
    );
  });
});
