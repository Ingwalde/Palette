import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PasswordField } from "./PasswordField";

describe("PasswordField", () => {
  it("renders a masked input with a hint and toggles visibility", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <PasswordField label="Password" value="secret" onChange={onChange} hint="Min 6" />,
    );

    const input = screen.getByDisplayValue("secret") as HTMLInputElement;
    expect(input.type).toBe("password");
    expect(screen.getByText("Min 6")).toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Show password" });
    await user.click(toggle);
    expect(input.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
  });

  it("calls onChange as the user types", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PasswordField label="Password" value="" onChange={onChange} />);
    await user.type(screen.getByLabelText("Password"), "x");
    expect(onChange).toHaveBeenCalledWith("x");
  });
});
