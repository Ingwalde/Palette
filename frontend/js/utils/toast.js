import { createElement, qs } from "./dom.js";

const TOAST_DURATION = 2600;

// Reuse a single toast element so rapid actions update it in place (smoothly) instead
// of stacking or abruptly swapping. Only ever shows the latest action.
let currentToast = null;
let hideTimer;
let removeTimer;

export function showToast(message, type = "default") {
  const container = qs("#toastContainer");
  if (!container) return;

  window.clearTimeout(hideTimer);
  window.clearTimeout(removeTimer);

  if (!currentToast || !currentToast.isConnected) {
    currentToast = createElement("div", { attrs: { role: "status" } });
    container.replaceChildren(currentToast);
  }

  currentToast.className = `toast${type === "error" ? " toast--error" : ""}`;
  currentToast.textContent = message;
  currentToast.style.opacity = "";
  currentToast.style.transform = "";

  hideTimer = window.setTimeout(() => {
    if (!currentToast) return;
    currentToast.style.opacity = "0";
    currentToast.style.transform = "translateY(8px)";
  }, TOAST_DURATION - 250);

  removeTimer = window.setTimeout(() => {
    currentToast?.remove();
    currentToast = null;
  }, TOAST_DURATION);
}
