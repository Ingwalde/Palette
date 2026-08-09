import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CustomSelect } from "./CustomSelect";

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

describe("CustomSelect", () => {
  it("shows the selected option's label", () => {
    render(
      <CustomSelect options={OPTIONS} value="b" onChange={() => {}} ariaLabel="Pick" />,
    );
    expect(screen.getByRole("button", { name: "Pick" })).toHaveTextContent("Beta");
  });

  it("opens on click and calls onChange when an option is chosen", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CustomSelect options={OPTIONS} value="a" onChange={onChange} ariaLabel="Pick" />,
    );

    await user.click(screen.getByRole("button", { name: "Pick" }));
    const beta = screen.getByRole("option", { name: "Beta" });
    expect(beta).toBeVisible();

    await user.click(beta);
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("opens with the keyboard (ArrowDown)", async () => {
    const user = userEvent.setup();
    render(
      <CustomSelect options={OPTIONS} value="a" onChange={() => {}} ariaLabel="Pick" />,
    );
    const button = screen.getByRole("button", { name: "Pick" });
    button.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox")).toBeVisible();
  });
});
