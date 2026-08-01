# Changelog

## v4.1.0 — Mobile fixes, UX polish and CI

### Release summary

Palette v4.1.0 adds continuous integration on GitHub Actions and a broad pass of mobile
and UX fixes found on small screens (iPhone 13, 390px wide) and during navigation.

### Added

- GitHub Actions CI (`.github/workflows/ci.yml`) running the backend test suite (the
  `test` Docker Compose profile: disposable PostgreSQL + pytest) on every pull request
  and on pushes to `main`.

### Fixed — navigation

- Navigation tabs stay on one row on small screens, shrinking evenly instead of
  clipping or overflowing; the active/last item is no longer cut off.
- Softer, chunkier nav highlight pill (no stadium rounding that clipped labels), with
  spacing between the header and the page content.
- SPA navigation restores the `<body>` class on content swap, so page-scoped styles
  (e.g. the login/auth form spacing) apply after navigating in-app.
- Page transition keeps a gentle fade even under reduced-motion (opacity only), instead
  of an abrupt instant swap; longer, smoother fade otherwise.
- "Browse palettes" and other in-page anchor links now scroll natively instead of being
  swallowed by the SPA router.

### Fixed — search and forms

- Custom, centered search clear button on the home and export fields; bold search text
  and a smaller, page-styled placeholder.
- Native `<select>` no longer flashes before it is enhanced into the custom dropdown.
- Export "Generated output" block wraps long lines and is shorter on mobile.

### Fixed — palette cards and feedback

- Palette cards animate in with a staggered fade/slide; the empty state fades in.
- Contrast badge stays on one line.
- Button text uses an explicit dark colour (no default blue on iOS) and never wraps.
- Hex tooltips on color swatches reveal on tap on touch devices, auto-hide after a short
  time, and fade in/out smoothly; no stray tap highlight.
- Toasts reuse a single element and update in place, so rapid copies show only the
  latest action instead of stacking, and appear/disappear smoothly.
- More line spacing in the hero heading.

## v4.0.0 — PostgreSQL, Docker and UX

### Release summary

Palette v4.0.0 moves the backend fully onto PostgreSQL, ships the whole stack as a
Docker Compose setup (PostgreSQL, backend, static frontend), and adds a smoother
single-page navigation experience with polished search and animations. SQLite and the
non-Docker run mode are removed — Docker is the only supported way to run the app.

### Added — backend & infrastructure

- `docker-compose.yml` with `db` (PostgreSQL 16), `backend` and `frontend` (nginx) services.
- `backend/Dockerfile` (python:3.12-slim, non-root) and `.dockerignore` files.
- `DATABASE_URL` environment variable; `POSTGRES_USER/PASSWORD/DB` for the db service.
- `psycopg[binary]` (psycopg 3) PostgreSQL driver.
- Persistent `pgdata` volume for the database.
- `test` Compose profile: pytest runs against a disposable PostgreSQL (`test-db`).
- nginx dev config with no-store caching so edits show up on a plain reload.

### Added — frontend & UX

- Single-page navigation: nav tabs, Account and Changelog swap content via `fetch`
  without a full reload (`js/router.js`), with a soft cross-fade of the page content.
- The nav indicator slides between tabs within the same document.
- Admin-only footer links (API docs / Changelog), hidden for guests and regular users.
- Custom, centered search clear button on the home and export search fields.
- Bold search text and page-styled placeholders.
- Palette cards animate in with a staggered fade/slide; the empty state fades in.
- Dynamic API base (`http://<host>:8000/api`) so the app also works over the LAN
  (e.g. viewing on a phone on the same Wi-Fi).

### Changed

- Database engine is built from a mandatory `DATABASE_URL`; the app hard-fails at
  startup if it is missing or not a `postgresql://` URL.
- The test suite runs against PostgreSQL instead of in-memory SQLite.
- API version bumped to `4.0.0`; frontend version strings updated to v4.0.

### Removed

- SQLite support and the local SQLite file (`palette.db`).
- The SQLite-only startup `ALTER TABLE` migration helper (`run_startup_migrations`).
- The non-Docker (venv + uvicorn + SQLite) run path from the docs.

## v3.3.0 — Security Hardening and Tests

### Release summary

Palette v3.3.0 hardens the backend and adds a first automated test suite. It makes `SECRET_KEY` mandatory, replaces wildcard CORS with an explicit allowlist, rate-limits authentication endpoints, switches to timing-safe password comparison, moves timestamps to timezone-aware UTC, fixes login by email, and synchronises version strings across the project to 3.3.

### Added

- Login and registration rate limiting with slowapi (`5/minute` login, `10/hour` register).
- Explicit `CORS_ORIGINS` allowlist environment variable.
- Automated backend test suite with pytest: `test_security`, `test_auth_api`, `test_crud`, `test_palettes_api`.
- `backend/pytest.ini` and `backend/tests/` package.
- README test instructions and mandatory-`SECRET_KEY` documentation.

### Changed

- `SECRET_KEY` is now mandatory; the app refuses to start with a missing or placeholder value.
- CORS `allow_origins` no longer uses `"*"`; origins come from `CORS_ORIGINS`.
- Timestamps (`created_at`, `updated_at`) are timezone-aware UTC instead of naive `datetime.utcnow`.
- Backend API version bumped to `3.3.0`; frontend version strings updated to v3.3.

### Fixed

- Login by email returned `422` because `UserLogin` inherited the strict username pattern validator; it now accepts a username or an email.

### Security

- Password comparison uses `hmac.compare_digest` (timing-safe) instead of `==`.
- Loud startup warning when `DEFAULT_ADMIN_PASSWORD` is still a placeholder.

## v3.2.0 — Export Workflow and UI Polish

### Release summary

Palette v3.2.0 improves the v3.1 authentication release with a more focused export flow, selected palette export, PNG palette card generation, frontend changelog page and UI/navigation polish.

### Added

- Added `Choose palette` export source.
- Added palette search inside the export page.
- Added selected-palette export.
- Added PNG export for a single selected palette card.
- Added `frontend/changelog.html`.
- Added bottom project information panel on each frontend page.
- Added project-focused footer highlights.
- Added footer link to API docs and frontend changelog page.
- Added navigation hard-refresh stability improvements.

### Changed

- Removed `All palettes` from the Export source dropdown.
- `Choose palette` is now the default Export source.
- `Favorites only` remains available for account-based favorites export.
- Selected palette PNG export now generates only the selected palette card.
- Changelog page does not highlight any top navigation tab.
- Palette contrast ratio is displayed with one decimal.
- Create account button now uses the same primary style as Login.
- Login page redirects logged-in users to Account.
- Backend login accepts username or email.

### Fixed

- Fixed Login/Register page styling.
- Fixed navigation active indicator after hard refresh.
- Fixed Changelog footer link returning 404.
- Fixed Export dropdown overflow without scrolling the whole left panel.

### GitHub release

Suggested tag:

```text
v3.2.0
```

Suggested release title:

```text
Palette v3.2.0 — Export Workflow and UI Polish
```

---

# Changelog

## v3.1.0 — Authentication, User Accounts and User Favorites


### Release summary

Palette v3.1.0 expands the project from a full-stack palette manager into a user-aware application with authentication, account pages, role-based admin access and database-backed favorites.

#### Highlights

- Added username, email and password registration.
- Added login with Bearer token authentication.
- Added personal account page.
- Added password change with confirmation.
- Added user-based favorites stored in SQLite.
- Added favorites API.
- Added role-based admin access.
- Replaced `X-Admin-Token` with admin user roles.
- Hidden Admin navigation for guests and regular users.
- Updated documentation for v3.1.

#### Upgrade notes from v3.0

- Create or update `backend/.env` using `backend/.env.example`.
- Restart the backend after replacing files.
- If local database state causes issues during testing, delete `backend/palette.db` and restart the backend.
- Old localStorage favorites are not used by the new user-based favorites system.

#### GitHub release

Suggested tag:

```text
v3.1.0
```

Suggested release title:

```text
Palette v3.1.0 — Authentication & User Accounts
```

### Added

- Added user registration with username, email and password.
- Added login with Bearer token authentication.
- Added JWT access tokens using PyJWT.
- Added password hashing with PBKDF2-SHA256.
- Added `/api/auth/register` endpoint.
- Added `/api/auth/login` endpoint.
- Added `/api/auth/me` endpoint.
- Added `/api/auth/password` endpoint for password changes.
- Added personal account page: `profile.html`.
- Added account navigation state: `Login` becomes `Account` after login.
- Added logout inside the personal account page.
- Added `users` table.
- Added `favorites` table.
- Added user-based favorites stored in the SQLite database.
- Added favorites API endpoints.
- Added admin role checks for protected palette actions.
- Added hidden Admin navigation for guests and regular users.
- Added automatic first admin user creation from `.env` settings.
- Added frontend authentication utilities:
  - `authApi.js`
  - `authStorage.js`
  - `authNav.js`
- Added frontend favorites API module:
  - `favoritesApi.js`
- Added documentation for authentication, database, setup, troubleshooting and security.

### Changed

- Replaced `X-Admin-Token` protection with role-based admin access.
- Palette create/update/delete endpoints now require a logged-in admin user.
- Favorites moved from browser `localStorage` to backend database storage.
- Favorites page now requires login.
- Export page now supports account-based favorites when `Favorites only` is selected.
- Admin tab is visible only for admin users.
- Login no longer changes directly to Logout in navigation; logged-in users see `Account`.
- Password management moved into the account page.
- README updated from v3.0 to v3.1.
- API documentation updated to use Bearer tokens instead of admin token headers.
- Roadmap updated: v3.1 is no longer planned; it is implemented.

### Security

- Passwords are not stored in plain text.
- Password hashes use PBKDF2-SHA256 with salt.
- Protected routes require `Authorization: Bearer <token>`.
- Admin actions require `is_admin = true`.
- `.env` remains ignored by Git.
- Default admin credentials must be changed before sharing or deployment.

### Notes

- SQLite is used for local development.
- Tokens are stored on the frontend for local development usage.
- Email verification and password reset by email are not implemented yet.

---

## v3.0.0 — Full-Stack Backend API Update

### Added

- Added FastAPI backend.
- Added SQLite database for palette storage.
- Added SQLAlchemy palette model.
- Added Pydantic schemas and request/response validation.
- Added REST API for palette management.
- Added public API endpoints for reading palettes and tags.
- Added backend search by name, description, slug and tags.
- Added backend tag filtering.
- Added backend sorting by name.
- Added automatic seed data for default palettes.
- Added Swagger UI documentation.
- Added frontend API service with `fetch`.
- Added loading and error states for backend connection.
- Added admin page for CRUD testing.
- Added admin token protection for create, update and delete actions.
- Added backend environment configuration through `.env`.
- Added `.env.example` template.
- Added PNG export through the frontend Canvas API.
- Added PNG preview before downloading the image.
- Added custom dropdown components styled to match the site UI.
- Added `start_project.bat` for easier local startup on Windows.
- Added API documentation in `docs/api.md`.
- Added roadmap documentation in `ROADMAP.md`.

### Changed

- Changed project architecture from frontend-only to full-stack.
- Replaced static palette loading from `palettes.js` with backend API requests.
- Moved frontend files into the `frontend/` folder.
- Added backend files inside the `backend/` folder.
- Updated home page to load palettes, tags, search and sorting from backend data.
- Updated export page to support backend-loaded palettes and PNG image export.
- Improved dropdown UI and fixed dropdown closing behavior.

---

## v2.0.0 — JavaScript Refactor & Export Update

### Added

- Added modular JavaScript structure with ES Modules.
- Added separate data, utility, component and page modules.
- Added favorites with `localStorage`.
- Added export page for CSS variables, SCSS variables, JSON and TXT.
- Added HEX color copying.
- Added full palette copying.
- Added contrast status for palettes.
- Added toast notifications.
- Added empty states.
- Added responsive layout improvements.

### Changed

- Split JavaScript logic into smaller files.
- Split CSS into base, component and page styles.
- Improved project structure for portfolio presentation.
