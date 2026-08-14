import { Link } from "react-router-dom";
import { buttonClass } from "../styles/ui";
import * as ui from "../styles/ui.css";
import * as home from "./HomePage.css";

// The catch-all route. Kept as a real 404 page rather than a migration placeholder: nginx
// serves index.html for every unknown path, so this is what a visitor actually sees when a
// URL is wrong or stale.
//
// First consumer of the vanilla-extract button, chosen because it is small and already has a
// screenshot baseline — so the baseline is what proves the new primitive matches the old CSS.
export function NotFoundPage() {
  return (
    <section className={`section ${ui.pageHero}`}>
      <p className="eyebrow">404</p>
      <h1>Not found</h1>
      <p>
        We could not find that page. The link may be out of date, or the address may have
        a typo in it.
      </p>
      <div className={home.heroActions}>
        <Link className={buttonClass("primary")} to="/">
          Back to palettes
        </Link>
        <Link className={buttonClass()} to="/export">
          Export tools
        </Link>
      </div>
    </section>
  );
}
