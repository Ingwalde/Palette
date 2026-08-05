import { createElement } from "../utils/dom.js";

export function createEmptyState(title, text, action) {
  const wrapper = createElement("div", {
    className: "empty-state"
  });

  const heading = createElement("h3", { text: title });
  const paragraph = createElement("p", { text });

  wrapper.append(heading, paragraph);

  if (action && action.label && action.href) {
    const link = createElement("a", {
      className: "button button--primary empty-state__action",
      text: action.label,
      attrs: { href: action.href }
    });
    wrapper.append(link);
  }

  return wrapper;
}

export function createBackendErrorState() {
  return createEmptyState(
    "Backend is not available",
    "Start the stack with: docker compose up"
  );
}
