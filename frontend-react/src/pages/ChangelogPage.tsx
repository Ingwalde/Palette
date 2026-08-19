import * as ui from "../styles/ui.css";
import * as styles from "./ChangelogPage.css";

interface Entry {
  version: string;
  title: string;
  items: string[];
}

const CHANGELOG: Entry[] = [
  {
    version: "v4.9.0",
    title: "Hardened sign-in and a stated password policy",
    items: [
      "Signing in now takes the same time whether or not an account exists, so no one can learn which emails are registered by timing the response.",
      "Passwords must be at least twelve characters, and the rules are shown on the form instead of failing silently on submit.",
      "The API sends security headers on every response and answers only for hosts it serves; a published security policy explains how to report a vulnerability.",
    ],
  },
  {
    version: "v4.8.7",
    title: "Stolen sessions, detected and ended",
    items: [
      "If a sign-in token is ever used twice — the signature of a copied one — every device signed in to that account is signed out immediately.",
      "You can now end every session yourself from your account page, without changing your password.",
    ],
  },
  {
    version: "v4.8.6",
    title: "Housekeeping: code scanning and current dependencies",
    items: [
      "The project's own code is now scanned for security and quality flaws on every change and once a week.",
      "Every dependency is up to date, including a compiler that was rewritten in another language.",
      "The screenshots in the README are generated from the running app instead of captured by hand — the old ones had been showing an eight-release-old version.",
    ],
  },
  {
    version: "v4.8.5",
    title: "Accessibility, speed and real end-to-end tests",
    items: [
      "Navigating now moves focus to the page and announces where you landed, and dialogs keep the keyboard inside them and hand focus back.",
      "Every page but the home page is fetched only when you visit it, and the font is served from this site — the first paint is a quarter faster and no request leaves the origin.",
      "A performance budget runs on every change, so a page that gets heavier fails the build.",
      "A second end-to-end suite drives the real backend and database instead of a stubbed one.",
    ],
  },
  {
    version: "v4.8.4",
    title: "Code review remediation",
    items: [
      "Verification and password-reset emails link to pages that exist again; the links pointed at the vanilla frontend removed in v4.8.0.",
      "Sessions can be ended everywhere at once, and a used reset link cannot be replayed.",
      "Tag counts and search run as indexed PostgreSQL queries instead of scans in Python.",
      "The stylesheet is gone: every rule is now a type-checked, per-component vanilla-extract style, verified pixel-identical by screenshot tests.",
    ],
  },
  {
    version: "v4.8.3",
    title: "Frontend observability",
    items: [
      "Client errors and Web Vitals (LCP/CLS/INP) report to Sentry when a DSN is configured.",
      "The Sentry SDK loads lazily and is tree-shaken out entirely when observability is off.",
      "Source maps are emitted so minified stack traces symbolicate back to the TypeScript source.",
    ],
  },
  {
    version: "v4.8.1",
    title: "Accessibility & deploy hardening",
    items: [
      "WCAG 2 AA pass with an axe-core test suite; fixed contrast and an unlabelled control.",
      "Swap-safe, longer-timeout deploys so the frontend build doesn't OOM the small VM.",
      "Docs updated after the cutover.",
    ],
  },
  {
    version: "v4.8.0",
    title: "React + TypeScript frontend",
    items: [
      "Full rewrite of the frontend to Vite + React 19 + TypeScript, replacing the vanilla build.",
      "All pages ported 1:1; typed API layer, TanStack Query, auth context, error boundary.",
      "Served in production by nginx from a multi-stage Docker image; vanilla frontend removed.",
    ],
  },
  {
    version: "v4.7.1",
    title: "Presentation: screenshots & diagrams",
    items: [
      "Screenshot-rich README with a live-demo link to palettes-app.com.",
      "Mermaid diagrams: ER data model, production request path and the auth flow.",
      "New docs/architecture.md gathering all diagrams in one place.",
    ],
  },
  {
    version: "v4.7.0",
    title: "Continuous delivery",
    items: [
      "Production auto-deploys after CI passes on main (SSH + rebuild + readiness gate).",
      "Staging Compose override for an isolated second stack on the same VM.",
    ],
  },
  {
    version: "v4.6.0",
    title: "Operations & observability",
    items: [
      "Readiness probe (/health/ready) checking database + Redis, used by the healthcheck.",
      "Optional Sentry error tracking (off unless a DSN is set).",
      "Database backup script with retention and a cron example.",
    ],
  },
  {
    version: "v4.5.0",
    title: "Security hardening",
    items: [
      "Auth tokens moved to httpOnly cookies with CSRF protection (XSS can't steal them).",
      "Content-Security-Policy and security headers on the frontend.",
      "Rate limiting on every mutating endpoint.",
      "Encrypted secrets via SOPS + age; a first accessibility pass.",
    ],
  },
  {
    version: "v4.4.4",
    title: "Admin and form UX pass",
    items: [
      "Show/hide (eye) toggle on every password field.",
      "Animated sliding Palettes/Tags switch and a styled tag-suggestions dropdown.",
      'Non-resizable description, custom-styled tag "kind" picker, paginated tag list.',
      "Export palette list scrolls the page, not a nested box; two-column layout fixed.",
      "Removed the admin logout button and the TXT export format.",
    ],
  },
  {
    version: "v4.4.3",
    title: "Password reset, admin modals and list search",
    items: [
      "Password reset by email: request a link, choose a new password, sessions log out.",
      "Admin delete/rename now use styled modal dialogs, not browser confirm/prompt.",
      "Search and pagination on the admin palette list.",
    ],
  },
  {
    version: "v4.4.2",
    title: "Tag catalog and admin tag management",
    items: [
      "Admin panel gains a Palettes / Tags mode switch.",
      'Tags view: add, rename, delete and flag tags as "purpose" categories.',
      "Rename/delete a tag and it updates across every palette that uses it.",
      "Palette form takes tags as chips with catalog autocomplete.",
    ],
  },
  {
    version: "v4.4.1",
    title: "Session-expiry message and swatch polish",
    items: [
      'Favorites now says "Please log in again" on an expired session, not "backend unavailable".',
      "The admin colour picker renders as a clean rounded square with hover/focus states.",
    ],
  },
  {
    version: "v4.4",
    title: "Diverse palettes and a dynamic colour editor",
    items: [
      "Seed palettes now include 3- and 5-colour sets, not just 4.",
      "Admin colour input is a dynamic list of HEX rows (picker + hex, add/remove, 1–8).",
      "Palette swatch grids auto-flow to fit any colour count evenly.",
    ],
  },
  {
    version: "v4.3.1",
    title: "Security and infrastructure hardening",
    items: [
      "Argon2id password hashing (legacy hashes upgraded on login).",
      "Rotating refresh tokens with server-side revocation and silent refresh.",
      "Redis-backed rate limiting, shared across processes.",
      "Async request path (async SQLAlchemy + asyncpg).",
    ],
  },
  {
    version: "v4.3",
    title: "Account email, delete account, random tags",
    items: [
      "Your email now shows in a clear labeled field on the account page.",
      'New "Delete account" flow removes the account and its saved favorites.',
      "The home page shows ten random tag filters instead of the full list.",
      "Delete is guarded so the last admin account cannot lock itself out.",
    ],
  },
  {
    version: "v4.2",
    title: "Email verification",
    items: [
      "Email verification on registration: new accounts get a Resend-backed link.",
      "Friendly verify page confirms the address, with an inline resend on failure.",
      '"Email not verified" banner with a resend button on the account page.',
      "Login stays available while an account is still unverified.",
      "Verification tokens are signed and purpose-scoped; resend is rate-limited.",
    ],
  },
  {
    version: "v4.1",
    title: "Mobile fixes, UX polish and CI",
    items: [
      "Added GitHub Actions CI running the backend tests on every PR and push to main.",
      "Single-row navigation on small screens with a softer highlight pill.",
      "Smoother SPA page transitions; in-page anchor links scroll natively.",
      "Polished search (clear button, placeholder) and no native select flash.",
      "Swatch hex tooltips and copy toasts now appear and disappear smoothly.",
    ],
  },
  {
    version: "v4.0",
    title: "PostgreSQL, Docker and UX",
    items: [
      "Moved the backend fully onto PostgreSQL; removed SQLite.",
      "Added a Docker Compose stack: PostgreSQL, backend and static frontend.",
      "Single-page navigation with a soft page cross-fade and sliding tab indicator.",
      "Polished search: centered clear button, bold text, animated results.",
      "Dynamic API base so the app also works over the LAN (e.g. on a phone).",
    ],
  },
  {
    version: "v3.3",
    title: "Security hardening and tests",
    items: [
      "Made SECRET_KEY mandatory with a fail-fast startup check.",
      "Replaced wildcard CORS with an explicit origin allowlist.",
      "Added login and registration rate limiting.",
      "Switched to timing-safe password comparison and timezone-aware timestamps.",
      "Fixed login by email and added an automated backend test suite.",
    ],
  },
  {
    version: "v3.2",
    title: "Export workflow and footer polish",
    items: [
      "Added export for one selected palette.",
      "Added palette search inside the export page.",
      "Removed the general All palettes export option from the source selector.",
      "PNG export for a selected palette now generates only one palette card.",
      "Added a bottom project information panel across the frontend pages.",
    ],
  },
  {
    version: "v3.1",
    title: "Authentication and user accounts",
    items: [
      "Added registration with username, email and password.",
      "Added login with Bearer token authentication.",
      "Added personal Account page and password changing.",
      "Moved Favorites from browser storage to user-based database storage.",
      "Added role-based Admin access.",
    ],
  },
  {
    version: "v3.0",
    title: "Full-stack backend update",
    items: [
      "Added FastAPI backend.",
      "Added SQLite palette database.",
      "Connected frontend to backend API.",
      "Added admin palette management.",
      "Added PNG export preview and download.",
    ],
  },
];

export function ChangelogPage() {
  return (
    <>
      <section className={`${ui.section} ${ui.pageHero}`}>
        <p className={ui.eyebrow}>Project history</p>
        <h1>Changelog</h1>
        <p>
          Short overview of the main project versions and what changed between releases.
        </p>
      </section>

      <section className={`${ui.section} ${styles.layout}`}>
        {CHANGELOG.map((entry) => (
          <article className={styles.card} key={entry.version}>
            <p className={styles.version}>{entry.version}</p>
            <h2>{entry.title}</h2>
            <ul>
              {entry.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </>
  );
}
