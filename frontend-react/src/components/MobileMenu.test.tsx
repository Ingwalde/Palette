import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { MobileMenu } from "./MobileMenu";
import { ThemeProvider } from "./ThemeContext";

function renderMenu(props: { isAuthenticated: boolean; isAdmin: boolean }) {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <MobileMenu {...props} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("MobileMenu", () => {
  it("is closed until the button is pressed", async () => {
    const u = userEvent.setup();
    renderMenu({ isAuthenticated: true, isAdmin: true });
    const button = screen.getByRole("button", { name: "Menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    await u.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("navigation", { name: "More" });
    expect(within(menu).getByRole("link", { name: "Export" })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Create" })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Admin" })).toBeInTheDocument();
    // The theme control rides along in the menu.
    expect(within(menu).getByRole("group", { name: "Theme" })).toBeInTheDocument();
  });

  it("omits Create and Admin for a guest", async () => {
    const u = userEvent.setup();
    renderMenu({ isAuthenticated: false, isAdmin: false });
    await u.click(screen.getByRole("button", { name: "Menu" }));
    const menu = screen.getByRole("navigation", { name: "More" });
    expect(within(menu).getByRole("link", { name: "Export" })).toBeInTheDocument();
    expect(within(menu).queryByRole("link", { name: "Create" })).not.toBeInTheDocument();
    expect(within(menu).queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const u = userEvent.setup();
    renderMenu({ isAuthenticated: true, isAdmin: false });
    const button = screen.getByRole("button", { name: "Menu" });
    await u.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    await u.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
