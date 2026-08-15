# Palette Roadmap

## v2.0 — JavaScript Refactor

Status: completed.

- ES Modules.
- Separate components, utilities and page logic.
- Favorites with localStorage.
- Export page.
- Contrast checker.
- Toast notifications.
- Responsive UI improvements.

## v3.0 — Full-Stack Backend API

Status: completed.

- FastAPI backend.
- SQLite database.
- REST API for palettes.
- Backend search, filtering and sorting.
- Frontend connected to backend through Fetch API.
- Admin page for CRUD testing.
- PNG export with image preview.
- Custom dropdown UI.
- API documentation.

## v3.1 — Authentication and User Accounts

Status: completed.

- User registration with username, email and password.
- Login with username or email.
- Password hashing.
- JWT/Bearer token authentication.
- Personal account page.
- Logout from account page.
- Password change with confirmation.
- User-based favorites stored in database.
- Favorites API.
- Role-based admin access.
- Hidden Admin tab for guests and regular users.

## v3.2 — Export Workflow and UI Polish

Status: completed.

- Selected palette export.
- Searchable palette picker on Export page.
- Removed broad All palettes export option.
- Single palette PNG card export.
- Changelog page inside frontend.
- Footer information panel on all pages.
- Navigation active indicator stability after hard refresh.
- Login/Register layout fixes.
- One-decimal contrast ratio.

## v3.3 — Security Hardening, Consistency and Tests

Status: completed.

- Mandatory `SECRET_KEY` with fail-fast startup.
- Explicit CORS origin allowlist (no wildcard).
- Login and registration rate limiting (slowapi).
- Timing-safe password comparison.
- Timezone-aware timestamps.
- Fixed login by email.
- Synchronised version strings to v3.3.
- Backend unit tests.
- API integration tests.

Deferred to a later release:

- Better admin dashboard UI.
- Edit and delete confirmation modals.
- Better form validation and API error messages.
- Search and pagination for admin palette list.
- Basic accessibility review.

## v4.0 — PostgreSQL, Docker and UX

Status: completed.

- PostgreSQL support (psycopg 3, mandatory `DATABASE_URL`, no SQLite fallback).
- Docker Compose deployment: database, backend and frontend.
- Dedicated `test` Compose profile (pytest against disposable PostgreSQL).
- Production CORS configuration (explicit allowlist, from v3.3).
- Single-page navigation with page cross-fade and a sliding tab indicator.
- Search UX polish: centered clear button, bold text, animated results.
- Dynamic API base for LAN access (view on a phone on the same network).
- Admin-only footer links; nginx no-store dev caching.

## v4.1 — Mobile fixes, UX polish and CI

Status: completed.

- GitHub Actions CI: backend test suite runs on every pull request and push to `main`.
- Single-row mobile navigation with a softer highlight pill and header spacing.
- Smoother SPA transitions; restored body class on swap; native in-page anchor scroll.
- Search polish (clear button, placeholder), no native select flash on load.
- Card animations, one-line contrast badge, dark button text (no iOS blue).
- Smooth, non-stacking toasts and tap-to-reveal swatch hex tooltips.
- Export "Generated output" wraps and shrinks on mobile.

## v4.2 — Email Verification

Status: completed.

- Email verification flow: send a token link on registration; the link confirms the address
  and signs the user in. Verification is deliberately **not** required to log in — see
  `docs/auth.md`.
- `email_verified` + `email_verified_at` on the user model, plus a resend endpoint.
- Outbound email via Resend (logged to the console when no API key is configured).
- Password reset by email.

## v4.3 — Account Management and Home Tags

Status: completed.

- Show the account email in a clear labeled field on the account page.
- Delete-account flow (`DELETE /api/auth/me`) removing the user and their favorites,
  guarded so the last admin cannot be deleted.
- Home page shows ten random tag filters instead of the full tag list.

Deferred to a later release:

- Better logging.
- Alembic migrations.
- Refresh token or improved session strategy.

## v4.3.1 — Security and Infrastructure Hardening

Status: completed.

- Argon2id password hashing with transparent upgrade of legacy PBKDF2 hashes on login.
- Rotating, single-use refresh tokens with server-side revocation and silent refresh.
- Redis-backed rate limiting shared across worker processes.
- Async request path (async SQLAlchemy + asyncpg); Alembic migrations stay synchronous.

## v4.4 — Diverse Palettes and Dynamic Colour Editor

Status: completed.

- Seed palettes now include 3- and 5-colour sets (was uniformly 4).
- Admin colour input is a dynamic list of HEX rows (colour picker + hex, add/remove, 1–8).
- Palette swatch grids (card, admin list, export picker) auto-flow to any colour count.

## v4.4.1 — Session-Expiry Message and Swatch Polish

Status: completed.

- Favorites page shows a "Please log in again" prompt (with a login button) on an expired
  session, instead of a misleading backend-unavailable message.
- Admin colour picker renders the colour as a clean rounded square with hover/focus states.

## v4.4.2 — Tag Catalog and Admin Tag Management

Status: completed.

- Tag catalog table plus `GET/POST/PATCH/DELETE /api/v1/tags`; tags exist independently of
  palettes and can be flagged as `purpose` categories (ten seeded on first run).
- Admin Palettes / Tags mode switch; the Tags view adds, renames, deletes, and reclassifies
  tags, with rename/delete propagated across palettes.
- Palette form takes tags as removable chips with catalog autocomplete.

## v4.4.3 — Password Reset, Admin Modals and List Search

Status: completed.

- Password reset by email: `POST /api/v1/auth/forgot-password` and
  `POST /api/v1/auth/reset-password` (purpose-scoped token, generic responses, sessions
  revoked on reset); dedicated forgot-password and reset-password pages.
- Admin delete/rename use styled modal dialogs instead of the browser confirm/prompt.
- Search and pagination on the admin palette list (10 per page).

## v4.8.6 — Code Scanning, Current Dependencies, Generated Screenshots

Status: completed.

- CodeQL on JavaScript/TypeScript and Python, per push and weekly — the first analysis of this
  repository's own code, as opposed to the dependencies it pulls in.
- Every open Dependabot pull request applied: four Actions majors, twelve grouped minors, and
  two development majors examined separately — TypeScript 7, which is the Go port rather than a
  version bump, and @types/node 26.
- Dependabot version updates moved onto a long-lived `deps` branch; security updates still go
  straight to the default branch.
- The README screenshots are generated from the running stack instead of captured by hand. The
  previous set had been showing v4.7.1 for eight releases.
- Corrected the database driver in the docs and the validator's error message, and the project
  structure in the README, which still listed a directory deleted at the v4.8.0 cutover.

## v4.8.5 — Accessibility, Performance and Real End-to-End Tests

Status: completed.

- Focus and announcement on route change, and a focus trap that returns focus in dialogs — the
  behaviours an automated audit of a rendered page cannot see.
- Route-level code splitting and a self-hosted font: entry chunk 336 kB to 249 kB, first paint
  737 ms to 560 ms, and no request from the page leaving this origin.
- A Lighthouse budget on every pull request: asset sizes fail the build, timings warn.
- An integration end-to-end suite against the real Compose stack, covering the API contract
  that the stubbed specs assume rather than check.
- Source maps uploaded to Sentry with the commit as the release, the auth token passed as a
  BuildKit secret.

Follow-up, now done: the separate Sentry project for the browser frontend exists and the
credentials are configured, so JavaScript and Python events no longer share one project.

## v4.8.4 — Code Review Remediation

Status: completed.

- Fixed the two defects that were breaking production silently: verification and reset emails
  linked to the vanilla pages removed in v4.8.0, and the CSP had no Sentry ingest host, so the
  v4.8.3 reporting collected nothing.
- Revocable sessions: `users.token_version` + a `ver` claim, `POST /auth/logout-all`, single-use
  password-reset links, and refresh revocation on password change.
- `ON DELETE CASCADE` on favourites and refresh tokens (deleting a favourited palette returned
  500); atomic backup files; production and staging secrets split into separate encrypted files.
- Search and tag counts moved into indexed PostgreSQL queries (`pg_trgm`, `GROUP BY`).
- Global stylesheets replaced by vanilla-extract, one module per component, guarded by
  zero-tolerance screenshot baselines.
- Deploys ship the CI-validated SHA and back the database up before migrating; e2e/axe, format
  and dependency-audit checks run on every pull request.

## v4.8.3 — Frontend Observability

Status: completed.

- Client errors and Web Vitals (LCP/CLS/INP) report to Sentry when `VITE_SENTRY_DSN` is set;
  the SDK loads lazily and is tree-shaken out entirely when observability is off.
- Source maps emitted for symbolication; the frontend image + CI pass the DSN as a build arg.

## v4.8.1 — Accessibility & Deploy Hardening

Status: completed.

- WCAG 2 AA pass with an axe-core E2E suite (zero violations); fixed contrast + an unlabelled
  admin colour picker.
- Deploy resilience: ensure a 2 GB swap file and a 40-minute SSH timeout so the frontend build
  doesn't OOM the ~1 GB production VM.
- Doc cleanup after the cutover (CLAUDE.md, the bump-version skill).

Planned next (optional):

- Build the frontend image in CI + push to GHCR so the VM only pulls it (no build on the VM).

## v4.8.0 — React + TypeScript Frontend

Status: completed.

- Full rewrite of the frontend to **React 19 + TypeScript (Vite)**, replacing the vanilla build.
  All pages ported 1:1 (home, auth, favorites, export incl. PNG canvas, profile, admin, verify,
  changelog); typed API layer + TanStack Query, AuthContext (httpOnly cookies + CSRF), custom
  select / modal / toast / error boundary; Vitest + Playwright.
- Cutover: served in production by nginx from a multi-stage Docker image; the vanilla `frontend/`
  was removed.

## v4.7.1 — Presentation: Screenshots & Diagrams

Status: completed.

- Screenshot-rich README with a live-demo link to palettes-app.com.
- Mermaid diagrams (`docs/architecture.md`): ER data model, production request path, auth flow;
  ER and request-path also embedded in the README.
- Completed the SOPS secret-encryption setup (encrypted `secrets.enc.env`, decrypt-on-deploy).

## v4.7.0 — Continuous Delivery

Status: completed.

- Auto-deploy workflow: production ships automatically after CI passes on `main` (SSH pull +
  rebuild + readiness gate), guarded by repository secrets.
- Staging Compose override (`docker-compose.staging.yml`) for an isolated second stack on the
  same VM; `docs/deploy.md` covers setup and an optional subdomain browser staging.

Deferred to a later release:

- Full accessibility (WCAG AA) audit with the frontend rework.

## v4.6.0 — Operations & Observability

Status: completed.

- Readiness probe (`/health/ready`, checks database + Redis) backing the Compose healthcheck;
  `/health` stays as liveness.
- Error tracking via Sentry, off unless `SENTRY_DSN` is set.
- Database backup script (`scripts/backup-db.sh`) with retention and a cron example.

Deferred to a later release:

- CI/CD auto-deploy with a staging environment.
- Full accessibility (WCAG AA) audit with the frontend rework.

## v4.5.0 — Security Hardening

Status: completed.

- Auth tokens moved from `localStorage` to httpOnly cookies with double-submit CSRF protection.
- Content-Security-Policy and security headers (X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy) served with the frontend.
- Rate limiting on every mutating endpoint (palettes, tags, favorites, password, account delete).
- Encrypted secrets via SOPS + age (`.sops.yaml`, `docs/secrets.md`).
- First accessibility pass: keyboard-focus ring, skip-to-content link, admin tab semantics.

Deferred to a later release:

- Full accessibility (WCAG AA) audit with the frontend rework.
- Observability (health/readiness probes, Sentry, log aggregation) and DB backups.
- CI/CD auto-deploy with a staging environment.

## v4.4.4 — Admin and Form UX Pass

Status: completed.

- Show/hide (eye) toggle on all password fields.
- Animated sliding Palettes/Tags admin switch; styled tag-suggestions dropdown on the palette
  form; non-resizable description; custom-styled tag "kind" picker.
- Admin panel shows only the selected Palettes or Tags view (was rendering both).
- Pagination on the admin tag list (10 per page); the admin form no longer sticks, so the admin
  page scrolls as one piece.
- Restored the export page's two-column layout (regressed in v4.4.2); export palette list flows
  into the page (no nested scroll).
- Removed the redundant admin logout button and the TXT export format.
