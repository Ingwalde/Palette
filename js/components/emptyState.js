import { createElement } from "../utils/dom.js";

export function createEmptyState(title, text) {
  const wrapper = createElement("div", {
    className: "empty-state"
  });

  const heading = createElement("h3", { text: title });
  const paragraph = createElement("p", { text });

  wrapper.append(heading, paragraph);
  return wrapper;
}
