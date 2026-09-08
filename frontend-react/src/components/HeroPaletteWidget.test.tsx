import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { HeroPaletteWidget } from "./HeroPaletteWidget";
import type { Palette } from "../types/api";

const palette: Palette = {
  id: 1,
  slug: "sea-breeze",
  owner_handle: "palette",
  visibility: "public",
  name: "Sea Breeze",
  description: "Fresh.",
  colors: ["#006D77", "#0F9199", "#83C5BE", "#EDE7C8"],
  tags: ["cold"],
  created_at: "",
  updated_at: "",
};

function renderWidget(onShuffle = vi.fn()) {
  render(
    <MemoryRouter>
      <HeroPaletteWidget palette={palette} onShuffle={onShuffle} />
    </MemoryRouter>,
  );
  return onShuffle;
}

describe("HeroPaletteWidget", () => {
  it("links the preview to the palette and shows each colour's hex", () => {
    renderWidget();
    const link = screen.getByRole("link", { name: /Featured palette: Sea Breeze/i });
    expect(link).toHaveAttribute("href", "/u/palette/sea-breeze");
    for (const hex of ["#006D77", "#0F9199", "#83C5BE", "#EDE7C8"]) {
      expect(screen.getByText(hex)).toBeInTheDocument();
    }
  });

  it("calls onShuffle when Shuffle is pressed", async () => {
    const user = userEvent.setup();
    const onShuffle = renderWidget();
    await user.click(screen.getByRole("button", { name: "Shuffle" }));
    expect(onShuffle).toHaveBeenCalledTimes(1);
  });
});
