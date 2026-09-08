import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { TaskRouter } from "./TaskRouter";

function renderRouter() {
  return render(
    <MemoryRouter>
      <TaskRouter />
    </MemoryRouter>,
  );
}

describe("TaskRouter", () => {
  it("offers the three entry points with the right destinations", () => {
    renderRouter();
    expect(screen.getByRole("link", { name: /Browse & search/i })).toHaveAttribute(
      "href",
      "#palettes",
    );
    expect(screen.getByRole("link", { name: /Import from image/i })).toHaveAttribute(
      "href",
      "/import",
    );
    expect(screen.getByRole("link", { name: /Create your own/i })).toHaveAttribute(
      "href",
      "/palettes/new",
    );
  });

  it("is a labelled navigation region", () => {
    renderRouter();
    expect(screen.getByRole("navigation", { name: "Get started" })).toBeInTheDocument();
  });
});
