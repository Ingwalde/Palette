import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ModalProvider, useModal } from "./ModalProvider";

function ConfirmOpener({ onResult }: { onResult: (v: boolean) => void }) {
  const { confirm } = useModal();
  return (
    <button
      type="button"
      onClick={async () =>
        onResult(await confirm({ title: "Delete palette", danger: true }))
      }
    >
      open confirm
    </button>
  );
}

function PromptOpener({ onResult }: { onResult: (v: string | null) => void }) {
  const { prompt } = useModal();
  return (
    <button
      type="button"
      onClick={async () => onResult(await prompt({ title: "Rename tag", value: "warm" }))}
    >
      open prompt
    </button>
  );
}

describe("ModalProvider", () => {
  it("does not perform the destructive action when Enter lands on Cancel", async () => {
    // The dialog focuses Cancel on purpose, so that Enter on a dialog which appeared
    // unexpectedly dismisses it. A document-level Enter handler used to see the key first and
    // preventDefault the button's own activation, so this resolved true and deleted the
    // palette — the exact opposite of what focusing Cancel was for.
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(
      <ModalProvider>
        <ConfirmOpener onResult={onResult} />
      </ModalProvider>,
    );

    await user.click(screen.getByRole("button", { name: "open confirm" }));
    const cancel = await screen.findByRole("button", { name: "Cancel" });
    expect(document.activeElement).toBe(cancel);

    await user.keyboard("{Enter}");
    await vi.waitFor(() => expect(onResult).toHaveBeenCalled());
    expect(onResult).toHaveBeenCalledWith(false);
  });

  it("confirms when the confirm button is chosen", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(
      <ModalProvider>
        <ConfirmOpener onResult={onResult} />
      </ModalProvider>,
    );

    await user.click(screen.getByRole("button", { name: "open confirm" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });

  it("closes on Escape with the cancelling result", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(
      <ModalProvider>
        <ConfirmOpener onResult={onResult} />
      </ModalProvider>,
    );

    await user.click(screen.getByRole("button", { name: "open confirm" }));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it("submits a prompt with Enter in its input", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(
      <ModalProvider>
        <PromptOpener onResult={onResult} />
      </ModalProvider>,
    );

    await user.click(screen.getByRole("button", { name: "open prompt" }));
    const input = await screen.findByRole("textbox", { name: "Rename tag" });
    await user.clear(input);
    await user.type(input, "cold{Enter}");
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith("cold"));
  });
});
