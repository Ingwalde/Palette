import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Link, Route, Routes } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { RouteAnnouncer } from "./RouteAnnouncer";
import { RouteFallback } from "./RouteFallback";

function Harness() {
  return (
    <MemoryRouter initialEntries={["/"]}>
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <h1>Palettes</h1>
                <Link to="/second">Go</Link>
              </>
            }
          />
          <Route path="/second" element={<h1>Your favorite palettes</h1>} />
        </Routes>
      </main>
      <RouteAnnouncer mainId="main-content" />
    </MemoryRouter>
  );
}

describe("RouteAnnouncer", () => {
  it("says nothing on the first render", () => {
    render(<Harness />);
    // A cold load already focuses and reads the document; announcing again would be noise,
    // and moving focus would skip past the skip link.
    // toHaveTextContent("") passes against any content, so assert emptiness directly.
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(document.activeElement).not.toBe(document.getElementById("main-content"));
  });

  it("announces the new page by its heading and focuses main", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("link", { name: "Go" }));

    // findByText, not findByRole followed by a content assertion: the live region element is
    // present from the first render, so waiting for the element proves nothing and the text
    // check would run once, before the announcement is written in a requestAnimationFrame.
    expect(
      await screen.findByText("Your favorite palettes — page loaded"),
    ).toBeInTheDocument();
    expect(document.activeElement).toBe(document.getElementById("main-content"));
  });
});

describe("RouteFallback", () => {
  it("is a polite live region and shows no visible layout", () => {
    render(<RouteFallback />);
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("Loading page");
    expect(region).toHaveAttribute("aria-live", "polite");
  });
});
