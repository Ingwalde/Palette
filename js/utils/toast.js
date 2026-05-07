import { createElement, qs } from "./dom.js";

const TOAST_DURATION = 2400;

export function showToast(message) {
  const container = qs("#toastContainer");
  if (!container) return;

  const toast = createElement("div", {
    className: "toast",
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
