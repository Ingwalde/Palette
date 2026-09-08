import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { HeroEditorial } from "./HeroEditorial";
import type { PaletteList } from "../types/api";

const list: PaletteList = {
  items: [
    {
      id: 1,
      slug: "sunset-ridge",
      owner_handle: "palette",
      visibility: "public",
      name: "Sunset Ridge",
      description: "",
      colors: ["#D56F51", "#ECD9B9", "#697657", "#30372F"],
      tags: [],
      created_at: "",
      updated_at: "",
    },
    {
      id: 2,
      slug: "ocean-deep",
      owner_handle: "palette",
      visibility: "public",
      name: "Ocean Deep",
      description: "",
      colors: ["#C7D9EB", "#EADAD4", "#607F97", "#304349"],
      tags: [],
      created_at: "",
      updated_at: "",
    },
  ],
  total: 2,
  limit: 100,
  offset: 0,
};

vi.mock("../api/palettes", () => ({
  listPalettes: vi.fn(() => Promise.resolve(list)),
}));

function renderHero() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HeroEditorial />
    </QueryClientProvider>,
  );
}

const REAL = /Sunset Ridge|Ocean Deep/;

describe("HeroEditorial", () => {
  it("points Explore palettes at the real catalogue anchor", () => {
    renderHero();
    expect(screen.getByRole("link", { name: /explore palettes/i })).toHaveAttribute(
      "href",
      "#palettes",
    );
  });

  it("features a real palette from the catalogue once loaded", async () => {
    renderHero();
    // The print title becomes one of the real palettes (not the pre-load fallback).
    expect(await screen.findByText(REAL)).toBeInTheDocument();
  });

  it("swaps to another real palette and announces it", async () => {
    const user = userEvent.setup();
    renderHero();
    const first = (await screen.findByText(REAL)).textContent;

    await user.click(screen.getByRole("button", { name: /another combination/i }));

    // Two palettes with no immediate repeat → the featured one changes to the other.
    const status = await screen.findByRole("status");
    expect(status.textContent).toMatch(/ palette\.$/);
    const now = screen.getByRole("img", { name: /palette on overlapping/i });
    expect(now.getAttribute("aria-label")).not.toContain(first ?? "");
  });
});
