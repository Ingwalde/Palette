# Changelog

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
- Added `X-Admin-Token` header validation on protected backend routes.
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
- Updated favorites page to work with backend-loaded palettes while keeping favorites in `localStorage`.
- Updated export page to support backend-loaded palettes and PNG image export.
- Updated admin page to require an admin token before showing palette management controls.
- Improved dropdown UI and fixed dropdown closing behavior.
- Updated README with full-stack launch instructions.
- Updated `.gitignore` for Python, virtual environments, database files and environment files.

### Security

- Create, update and delete palette endpoints now require an admin token.
- Local secrets are expected to be stored in `backend/.env`.
- `.env` is ignored by Git.

### Kept for v3.0

- Favorites are still stored in browser `localStorage`.
- Export still runs on the frontend.
- Email/password authentication is not included yet.

### Planned for v3.1

- Email/password registration.
- Login and logout.
- Password hashing.
- JWT authentication.
- User-based favorites stored in database.
- Role-based admin access.

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
