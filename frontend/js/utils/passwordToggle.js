import { createElement } from "./dom.js";

// Feather-style icons. Crossed-out eye = password hidden; open eye = password visible.
const EYE_OFF = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
const EYE = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

// Wraps every password input under `root` with an eye toggle button. Idempotent, so it can
// be re-run after an SPA page swap without stacking buttons.
export function initPasswordToggles(root = document) {
  root.querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.dataset.toggleReady) {
      return;
    }
    input.dataset.toggleReady = "1";

    const wrapper = createElement("span", { className: "password-field" });
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const button = createElement("button", {
      className: "password-toggle",
      attrs: { type: "button", "aria-label": "Show password", "aria-pressed": "false" }
    });
    button.innerHTML = EYE_OFF;
    wrapper.appendChild(button);

    button.addEventListener("click", () => {
      const reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      button.innerHTML = reveal ? EYE : EYE_OFF;
      button.setAttribute("aria-pressed", reveal ? "true" : "false");
      button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
      input.focus();
    });
  });
}
