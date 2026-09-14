import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const positions = new Map<string, number>();
/** Restore the cached catalogue's position after opening a detail or completing a login. */
export function useCatalogScroll() {
  const location = useLocation();
  const navigationType = useNavigationType();
  useLayoutEffect(() => {
    const key = location.search;
    let lastPosition = positions.get(key) ?? 0;
    let frame = 0;
    if (
      (navigationType === "POP" || location.state?.restoreCatalog) &&
      positions.has(key)
    ) {
      frame = requestAnimationFrame(() =>
        window.scrollTo({ top: lastPosition, behavior: "instant" }),
      );
    }
    const remember = () => {
      lastPosition = window.scrollY;
      positions.set(key, lastPosition);
    };
    window.addEventListener("scroll", remember, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", remember);
    };
  }, [location.search, location.key, location.state, navigationType]);
}
