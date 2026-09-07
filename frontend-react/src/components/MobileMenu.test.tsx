import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { MobileMenu } from "./MobileMenu";
import { ThemeProvider } from "./ThemeContext";

function renderMenu(props: { isAdmin: boolean; username?: string }) {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <MobileMenu isAdmin={props.isAdmin} username={props.username ?? "ann"} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("MobileMenu", () => {
  it("is closed until the avatar is pressed, then shows every tab for an admin", async () => {
    const u = userEvent.setup();
    renderMenu({ isAdmin: true, username: "ann" });
    // The avatar is the trigger and shows the account initial.
    const trigger = screen.getByRole("button", { name: /Account menu, ann/ });
    expect(trigger).toHaveTextContent("A");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await u.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("navigation", { name: "Account" });
    for (const name of ["Home", "Favorites", "Export", "Create", "Admin", "Account"]) {
      expect(within(menu).getByRole("link", { name })).toBeInTheDocument();
    }
    expect(within(menu).getByRole("group", { name: "Theme" })).toBeInTheDocument();
  });

  it("omits Admin for a non-admin", async () => {
    const u = userEvent.setup();
    renderMenu({ isAdmin: false });
    await u.click(screen.getByRole("button", { name: /Account menu/ }));
    const menu = screen.getByRole("navigation", { name: "Account" });
    expect(within(menu).getByRole("link", { name: "Create" })).toBeInTheDocument();
    expect(within(menu).queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("closes when a menu link is chosen", async () => {
    const u = userEvent.setup();
    renderMenu({ isAdmin: false });
    const trigger = screen.getByRole("button", { name: /Account menu/ });
    await u.click(trigger);
    await u.click(
      within(screen.getByRole("navigation", { name: "Account" })).getByRole("link", {
        name: "Export",
      }),
    );
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape", async () => {
    const u = userEvent.setup();
    renderMenu({ isAdmin: false });
    const trigger = screen.getByRole("button", { name: /Account menu/ });
    await u.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await u.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
