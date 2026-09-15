import { useLayoutEffect, useRef, useState } from "react";

const FULL_PLACEHOLDER = "Search by name, description or tag...";

/** Measure the actual placeholder font and available input width, including its padding. */
export function useSearchPlaceholder() {
  const ref = useRef<HTMLInputElement>(null);
  const [placeholder, setPlaceholder] = useState("Search");

  useLayoutEffect(() => {
    const input = ref.current;
    if (!input) return;
    const measure = document.createElement("span");
    measure.textContent = FULL_PLACEHOLDER;
    measure.setAttribute("aria-hidden", "true");
    Object.assign(measure.style, {
      position: "absolute",
      visibility: "hidden",
      whiteSpace: "pre",
      pointerEvents: "none",
    });
    input.parentElement?.append(measure);
    let active = true;
    const update = () => {
      if (!active || input.clientWidth === 0) return;
      const style = getComputedStyle(input);
      const hint = getComputedStyle(input, "::placeholder");
      measure.style.font = hint.font;
      measure.style.fontFamily = hint.fontFamily;
      measure.style.fontSize = hint.fontSize;
      measure.style.fontWeight = hint.fontWeight;
      measure.style.letterSpacing = hint.letterSpacing;
      const available =
        input.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      setPlaceholder(
        measure.getBoundingClientRect().width <= available ? FULL_PLACEHOLDER : "Search",
      );
    };
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(input);
    observer?.observe(measure);
    window.addEventListener("resize", update);
    void document.fonts?.ready.then(update);
    update();
    return () => {
      active = false;
      observer?.disconnect();
      window.removeEventListener("resize", update);
      measure.remove();
    };
  }, []);

  return { ref, placeholder };
}
