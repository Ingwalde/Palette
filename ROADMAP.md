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

Deferred to a later release:

- Better logging.
- Alembic migrations.
- Refresh token or improved session strategy.
