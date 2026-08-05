import { createElement } from "../utils/dom.js";

// A small promise-based modal. confirmDialog resolves true/false; promptDialog resolves the
// entered string or null on cancel. Replaces window.confirm / window.prompt so destructive
// admin actions get a styled, accessible dialog.
function openModal({ title, message, confirmLabel, cancelLabel = "Cancel", danger = false, input = null }) {
  return new Promise((resolve) => {
    const overlay = createElement("div", { className: "modal-overlay" });
    const dialog = createElement("div", {
      className: "modal",
      attrs: { role: "dialog", "aria-modal": "true", "aria-label": title }
    });

    dialog.append(createElement("h2", { className: "modal__title", text: title }));
    if (message) {
      dialog.append(createElement("p", { className: "modal__message", text: message }));
    }

    let field = null;
    if (input) {
      field = createElement("input", {
        className: "input modal__input",
        attrs: { type: "text", value: input.value || "", "aria-label": title }
      });
      dialog.append(field);
    }

    const actions = createElement("div", { className: "modal__actions" });
    const cancelButton = createElement("button", {
      className: "button button--ghost",
      text: cancelLabel,
      attrs: { type: "button" }
    });
    const confirmButton = createElement("button", {
      className: `button ${danger ? "button--danger" : "button--primary"}`,
      text: confirmLabel,
      attrs: { type: "button" }
    });
    actions.append(cancelButton, confirmButton);
    dialog.append(actions);
    overlay.append(dialog);

    const cancelValue = input ? null : false;
    const previousActive = document.activeElement;

    function close(result) {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      if (previousActive && typeof previousActive.focus === "function") {
        previousActive.focus();
      }
      resolve(result);
    }

    function confirmResult() {
      close(input ? field.value.trim() : true);
    }

    function onKey(event) {
      if (event.key === "Escape") {
        close(cancelValue);
      } else if (event.key === "Enter") {
        event.preventDefault();
        confirmResult();
      }
    }

    cancelButton.addEventListener("click", () => close(cancelValue));
    confirmButton.addEventListener("click", confirmResult);
    overlay.addEventListener("mousedown", (event) => {
      if (event.target === overlay) {
        close(cancelValue);
      }
    });
    document.addEventListener("keydown", onKey);

    document.body.append(overlay);
    (field || confirmButton).focus();
    if (field) {
      field.select();
    }
  });
}

export function confirmDialog({ title, message, confirmLabel = "Confirm", danger = false }) {
  return openModal({ title, message, confirmLabel, danger });
}

export function promptDialog({ title, message, value = "", confirmLabel = "Save" }) {
  return openModal({ title, message, confirmLabel, input: { value } });
}
