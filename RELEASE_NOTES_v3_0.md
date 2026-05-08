# GitHub Release: Palette v3.0.0 — Full-Stack Backend API Update

## Release title

```text
Palette v3.0.0 — Full-Stack Backend API Update
```

## Tag

```text
v3.0.0
```

## Release description

Palette v3.0.0 is a major full-stack update. The project has been upgraded from a frontend-only color palette application into a full-stack web app with a FastAPI backend, SQLite database and REST API.

### Highlights

- Added FastAPI backend
- Added SQLite database
- Added REST API for palettes
- Added backend search, filtering and sorting
- Connected frontend to backend through Fetch API
- Added admin page for CRUD testing
- Added admin token protection for create/update/delete actions
- Added PNG export with visual preview
- Added custom dropdown UI
- Added Swagger API documentation
- Added improved README, CHANGELOG, ROADMAP and API docs

### Added

- `backend/` folder with FastAPI application
- SQLite database support
- SQLAlchemy models
- Pydantic schemas and validation
- Automatic seed data
- Public palette API endpoints
- Protected admin API endpoints using `X-Admin-Token`
- `.env.example` for local backend configuration
- `frontend/js/api/palettesApi.js` for API communication
- `admin.html` for palette management testing
- PNG export using Canvas API
- Styled custom dropdowns
- `start_project.bat` for easier local startup on Windows
- `docs/api.md`

### Changed

- Project structure now uses separate `frontend/` and `backend/` folders
- Palette data is loaded from the backend API instead of a static JS file
- Search, tag filtering and sorting now use backend data
- Export page now supports PNG image preview and download
- Admin create/update/delete actions are protected by an admin token

### Notes

Favorites still use browser `localStorage` in v3.0. This is intentional because user accounts and email/password authentication are planned for v3.1.

### Planned for v3.1

- Email/password registration
- Login and logout
- Password hashing
- JWT authentication
- User-based favorites stored in database
- Role-based admin access
