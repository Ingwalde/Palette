import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ChangelogPage } from "./ChangelogPage";

describe("ChangelogPage", () => {
  it("renders the changelog heading and version entries", () => {
    render(<ChangelogPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Changelog" }),
    ).toBeInTheDocument();
    expect(screen.getByText("v4.8.1")).toBeInTheDocument();
    expect(screen.getByText("v3.0")).toBeInTheDocument();
    // each entry renders its bullet list
    expect(screen.getAllByRole("list").length).toBeGreaterThan(5);
  });
});
