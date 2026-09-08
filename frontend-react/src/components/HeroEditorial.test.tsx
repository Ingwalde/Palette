import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, vi } from "vitest";
import { HeroEditorial } from "./HeroEditorial";

// The hero calls Math.random three times per scene (count, family, variant). Drive it so the first
// scene and the post-click scene are fully determined.
function mockRandom(...values: number[]) {
  let i = 0;
  return vi.spyOn(Math, "random").mockImplementation(() => values[i++]);
}

afterEach(() => {
  vi.restoreAllMocks();
});

// count rng 0.5 → N=4; family rng 0.1 → Earth & air; variant rng 0.1 → A (Far away).
const FIRST = [0.5, 0.1, 0.1];
// count rng 0.7 → N=5; family rng 0.5 → Sea & sky; variant rng 0.9 → B (Secret garden).
const SECOND = [0.7, 0.5, 0.9];

describe("HeroEditorial", () => {
  it("points Explore palettes at the real catalogue anchor", () => {
    mockRandom(...FIRST);
    render(<HeroEditorial />);
    expect(screen.getByRole("link", { name: /explore palettes/i })).toHaveAttribute(
      "href",
      "#palettes",
    );
  });

  it("shows the random scene on first paint — palette name, N swatches and the accent chip", () => {
    mockRandom(...FIRST);
    render(<HeroEditorial />);

    expect(screen.getByText("Earth & air")).toBeInTheDocument();

    const swatches = screen.getByRole("img", { name: /colors in the Earth & air palette/i });
    // Exactly N=4 swatches, in palette order (paper, accent, sage, olive).
    expect(swatches.querySelectorAll("span")).toHaveLength(4);

    // The foreground chip shows colors[1] (the accent) and its HEX.
    expect(screen.getByText("#D56F51")).toBeInTheDocument();
  });

  it("re-rolls count, palette and artwork on Another combination and announces it", async () => {
    const user = userEvent.setup();
    mockRandom(...FIRST, ...SECOND);
    render(<HeroEditorial />);

    expect(screen.getByText("Earth & air")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /colors in the Earth & air palette/i }).querySelectorAll("span"),
    ).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: /another combination/i }));

    // New scene: Sea & sky, five colours.
    expect(screen.getByText("Sea & sky")).toBeInTheDocument();
    const swatches = screen.getByRole("img", { name: /colors in the Sea & sky palette/i });
    expect(swatches.querySelectorAll("span")).toHaveLength(5);

    const status = await screen.findByRole("status");
    expect(status.textContent).toMatch(/Sea & sky palette, 5 colours\./);
  });

  it("keeps the scene across an ordinary re-render", () => {
    mockRandom(...FIRST);
    const { rerender } = render(<HeroEditorial />);
    expect(screen.getByText("Earth & air")).toBeInTheDocument();
    // A parent re-render must not re-roll the scene (Math.random is exhausted after the first).
    rerender(<HeroEditorial />);
    expect(screen.getByText("Earth & air")).toBeInTheDocument();
  });
});
