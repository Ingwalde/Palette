import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { HeroEditorial } from "./HeroEditorial";

describe("HeroEditorial", () => {
  it("points Explore palettes at the real catalogue anchor", () => {
    render(<HeroEditorial />);
    expect(screen.getByRole("link", { name: /explore palettes/i })).toHaveAttribute(
      "href",
      "#palettes",
    );
  });

  it("cycles the three presets in order and wraps back to the first", async () => {
    const user = userEvent.setup();
    render(<HeroEditorial />);
    const shuffle = screen.getByRole("button", { name: /another combination/i });

    // Fresh mount starts on Earth & air; the HEX label reflects the first colour.
    expect(screen.getByText("Earth & air")).toBeInTheDocument();
    expect(screen.getByText("#D56F51")).toBeInTheDocument();

    await user.click(shuffle);
    expect(screen.getByText("Sea & sky")).toBeInTheDocument();
    expect(screen.getByText("#C7D9EB")).toBeInTheDocument();

    await user.click(shuffle);
    expect(screen.getByText("Wine & roses")).toBeInTheDocument();
    expect(screen.getByText("#A95D70")).toBeInTheDocument();

    await user.click(shuffle);
    expect(screen.getByText("Earth & air")).toBeInTheDocument();
  });

  it("announces the selected palette politely", async () => {
    const user = userEvent.setup();
    render(<HeroEditorial />);
    // Nothing announced until the visitor acts.
    expect(screen.getByRole("status")).toHaveTextContent("");
    await user.click(screen.getByRole("button", { name: /another combination/i }));
    expect(screen.getByRole("status")).toHaveTextContent("Sea & sky palette.");
  });
});
