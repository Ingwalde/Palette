import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import * as ui from "../styles/ui.css";

/**
 * Makes client-side navigation perceivable without sight.
 *
 * A full page load tells a screen reader where it landed: the browser resets focus and reads
 * the new document. React Router replaces the content underneath and does neither, so a
 * keyboard or screen-reader user activates a nav link and nothing at all happens — focus stays
 * on the link they just left, and the announcement never comes. The axe suite cannot see this;
 * it audits the markup of a page that has already rendered, not what happens between two.
 *
 * Two things fix it, and both are needed. Focus moves to the <main> landmark, which is what
 * puts the reader at the top of the new content and what makes the next Tab continue from
 * there. And the new page's name is written into a live region, because moving focus to a
 * container announces the container, not what changed.
 *
 * The first render is deliberately skipped. On a cold load the browser has already done both
 * jobs, and stealing focus on top of that would drop the user past anything above <main> —
 * including the skip link, whose entire purpose is to be the first thing reachable.
 */
export function RouteAnnouncer({ mainId }: { mainId: string }) {
  const { pathname, state } = useLocation();
  const navigationType = useNavigationType();
  const [message, setMessage] = useState("");
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;

    // Let the catalogue restore its saved scroll position while still moving keyboard focus.
    document.getElementById(mainId)?.focus({
      preventScroll:
        pathname === "/" && (navigationType === "POP" || !!state?.restoreCatalog),
    });

    // Read after paint: the new route renders in the same commit as this effect, so the title
    // and heading below belong to the page being left if they are read any earlier.
    const id = requestAnimationFrame(() => {
      const heading = document.querySelector("h1")?.textContent?.trim();
      setMessage(`${heading || document.title} — page loaded`);
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, mainId, navigationType, state]);

  return (
    <div
      className={ui.visuallyHidden}
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      {message}
    </div>
  );
}
