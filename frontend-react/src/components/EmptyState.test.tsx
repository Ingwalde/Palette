import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders a title and text without an action", () => {
    render(<EmptyState title="Nothing here" text="Try again." />, {
      wrapper: MemoryRouter,
    });
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument();
    expect(screen.getByText("Try again.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders an action link when given one", () => {
    render(
      <EmptyState title="Log in" text="…" action={{ label: "Log in", to: "/login" }} />,
      {
        wrapper: MemoryRouter,
      },
    );
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
