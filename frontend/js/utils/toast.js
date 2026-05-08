import { createElement, qs } from "./dom.js";

const TOAST_DURATION = 2600;

export function showToast(message, type = "default") {
  const container = qs("#toastContainer");
  if (!container) return;

  const toast = createElement("div", {
    className: `toast${type === "error" ? " toast--error" : ""}`,
    text: message,
    attrs: {
      role: "status"
    }
  });

  container.append(toast);

  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
  }, TOAST_DURATION - 250);

  window.setTimeout(() => {
    toast.remove();
  }, TOAST_DURATION);
}
