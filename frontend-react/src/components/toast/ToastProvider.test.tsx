import { render, screen, act, within, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToastProvider, useToast } from "./ToastProvider";

function Raise({ kind }: { kind?: "info" | "error" }) {
  const { showToast } = useToast();
  return <button onClick={() => showToast("Saved to your account", kind)}>raise</button>;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// fireEvent (synchronous) rather than userEvent, whose internal delays deadlock against fake
// timers. Fake timers govern only the toast's own dismissal timeout.
function setup(kind?: "info" | "error") {
  render(
    <ToastProvider>
      <Raise kind={kind} />
    </ToastProvider>,
  );
  act(() => {
    fireEvent.click(screen.getByText("raise"));
  });
}

// The scrollable stack element that carries the pause handlers — the toast's grandparent
// (toast -> live-region div -> container).
function stackOf(toast: HTMLElement): HTMLElement {
  return toast.parentElement!.parentElement!;
}

describe("ToastProvider", () => {
  it("dismisses an info toast after its 3s timeout", () => {
    setup();
    expect(screen.getByText("Saved to your account")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3100));
    expect(screen.queryByText("Saved to your account")).not.toBeInTheDocument();
  });

  it("keeps a toast while the pointer is over the stack, then clears after release", () => {
    setup();
    const stack = stackOf(screen.getByText("Saved to your account"));
    act(() => fireEvent.mouseEnter(stack));
    act(() => vi.advanceTimersByTime(6000)); // well past 3s — held
    expect(screen.getByText("Saved to your account")).toBeInTheDocument();
    act(() => fireEvent.mouseLeave(stack));
    act(() => vi.advanceTimersByTime(3100));
    expect(screen.queryByText("Saved to your account")).not.toBeInTheDocument();
  });

  it("removes a toast when its dismiss button is pressed", () => {
    setup();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    });
    expect(screen.queryByText("Saved to your account")).not.toBeInTheDocument();
  });

  it("announces an error in an assertive alert region", () => {
    setup("error");
    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Saved to your account")).toBeInTheDocument();
  });
});
