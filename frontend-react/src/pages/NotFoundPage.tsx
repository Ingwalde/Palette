import { Link } from "react-router-dom";

// The catch-all route. Kept as a real 404 page rather than a migration placeholder: nginx
// serves index.html for every unknown path, so this is what a visitor actually sees when a
// URL is wrong or stale.
export function NotFoundPage() {
  return (
    <section className="section page-hero">
      <p className="eyebrow">404</p>
      <h1>Not found</h1>
      <p>
        We could not find that page. The link may be out of date, or the address may have
        a typo in it.
      </p>
      <div className="hero__actions">
        <Link className="button button--primary" to="/">
          Back to palettes
        </Link>
        <Link className="button" to="/export">
          Export tools
        </Link>
      </div>
    </section>
  );
}
