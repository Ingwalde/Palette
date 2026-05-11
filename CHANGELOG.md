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
