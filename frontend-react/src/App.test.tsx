import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import { App } from "./App";
import { queryClient } from "./lib/queryClient";

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("App shell", () => {
  it("renders the home hero and main navigation", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /find a color palette/i,
    );
    expect(
      screen.getByRole("navigation", { name: /main navigation/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Export" })).toHaveAttribute(
      "href",
      "/export",
    );
  });

  it("renders a placeholder for a route not yet ported", () => {
    renderAt("/admin");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Admin");
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });
});
