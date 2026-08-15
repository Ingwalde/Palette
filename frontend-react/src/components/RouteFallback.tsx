import * as ui from "../styles/ui.css";

/**
 * What fills <main> while a route's chunk is still downloading.
 *
 * This renders on a *direct* load of a lazy route — someone opening /favorites from a
 * bookmark, or following a verification link into /verify — where there is no previous page to
 * look at. Measured with the chunk held back 800ms: the fallback is on screen for the whole
 * delay.
 *
 * It does not render when navigating inside the app. React keeps the page you are leaving on
 * screen until the next one's chunk resolves, so nothing here is shown and nothing is
 * announced; the route announcement fires once the new page commits. That is the better
 * behaviour — no flash of empty shell — but it is worth knowing that a slow chunk means a
 * second or two where a click appears to have done nothing.
 *
 * Deliberately invisible either way. A spinner would appear and vanish within a frame on any
 * normal connection, and each appearance moves the content below it — the exact layout shift
 * Cumulative Layout Shift measures, and one the screenshot baselines would start disagreeing
 * about. Empty space shifts nothing. The live region is what tells a screen-reader user that
 * something is on its way.
 */
export function RouteFallback() {
  return (
    <div className={ui.visuallyHidden} role="status" aria-live="polite">
      Loading page…
    </div>
  );
}
