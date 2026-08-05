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

- Email verification flow: send a token link on registration, confirm before login.
- `is_verified` + verification token on the user model.
- SMTP configuration (dev via Mailtrap, prod via a mail provider).
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
