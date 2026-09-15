import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { it, expect, vi } from "vitest";
import { PaletteForm } from "./PaletteForm";
import { ModalProvider } from "./modal/ModalProvider";
import { ToastProvider } from "./toast/ToastProvider";
vi.mock("../api/tags", () => ({ listTags: vi.fn(async () => []) }));
const initial = {
  name: "Ocean",
  description: "",
  colors: ["#112233", "#AABBCC"],
  tags: [],
};
function setup() {
  const submit = vi.fn();
  const router = createMemoryRouter([
    {
      path: "/",
      element: (
        <>
          <PaletteForm
            initial={initial}
            submitLabel="Save palette"
            saving={false}
            onSubmit={submit}
          />
          <Link to="/away">Leave editor</Link>
        </>
      ),
    },
    { path: "/away", element: <h1>Destination</h1> },
  ]);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <ModalProvider>
          <RouterProvider router={router} />
        </ModalProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { submit, router, user: userEvent.setup() };
}
it("keeps invalid text attached to the reordered row and blocks submission", async () => {
  const { user, submit } = setup();
  const first = screen.getAllByLabelText("HEX color")[0];
  await user.clear(first);
  await user.type(first, "#12");
  await user.tab();
  await user.click(screen.getByRole("button", { name: "Move color 1 right" }));
  expect(screen.getAllByLabelText("HEX color")[1]).toBe(first);
  await user.click(screen.getByRole("button", { name: "Save palette" }));
  expect(submit).not.toHaveBeenCalled();
  await waitFor(() => expect(first).toHaveFocus());
});
it("submits reordered colors with an optional empty description", async () => {
  const { user, submit } = setup();
  await user.click(screen.getByRole("button", { name: "Move color 2 left" }));
  await user.click(screen.getByRole("button", { name: "Save palette" }));
  expect(submit).toHaveBeenCalledWith(
    { ...initial, colors: ["#AABBCC", "#112233"] },
    expect.any(Function),
  );
});
it("retains edits on Stay and leaves only after Discard changes", async () => {
  const { user, router } = setup();
  await user.type(screen.getByPlaceholderText("Nordic Blue"), " edited");
  await user.click(screen.getByRole("link", { name: "Leave editor" }));
  await user.click(await screen.findByRole("button", { name: "Stay" }));
  expect(router.state.location.pathname).toBe("/");
  expect(screen.getByPlaceholderText("Nordic Blue")).toHaveValue("Ocean edited");
  await user.click(screen.getByRole("link", { name: "Leave editor" }));
  await user.click(await screen.findByRole("button", { name: "Discard changes" }));
  expect(await screen.findByRole("heading", { name: "Destination" })).toBeInTheDocument();
});
it("does not warn after restoring the original value", async () => {
  const { user } = setup();
  await user.type(screen.getByPlaceholderText("Nordic Blue"), "x");
  await user.keyboard("{Backspace}");
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  await user.click(screen.getByRole("link", { name: "Leave editor" }));
  expect(await screen.findByRole("heading", { name: "Destination" })).toBeInTheDocument();
});
