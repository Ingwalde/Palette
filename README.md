# Palette v4.0 — Full-Stack Color Palette App

Palette is a full-stack color palette web application for browsing, searching, saving and exporting color palettes.

Version **4.0** moves the backend fully onto **PostgreSQL** and packages the whole stack with **Docker Compose** (database, backend and static frontend). It also adds single-page navigation, page transitions and polished search. SQLite and the non-Docker run mode are removed — Docker is the only supported way to run the app.

```text
Frontend → Fetch API → FastAPI Backend → PostgreSQL Database
```

---

## What changed by version

| Area | v2.0 | v3.0 | v3.1 | v3.2 | v3.3 | v4.0 |
|---|---|---|---|---|---|---|
| Architecture | Frontend-only | Frontend + backend | Full-stack with authentication | Full-stack with UX/export polish | Full-stack, security-hardened | Containerized full-stack |
| Palette data | Static JS data | SQLite database | SQLite database | SQLite database | SQLite database | PostgreSQL only |
| Deployment | None | Local scripts | Local scripts | Local scripts | Local scripts | Docker Compose |
| Favorites | Browser localStorage | Browser localStorage | User-based favorites | User-based favorites | User-based favorites | User-based favorites |
| Admin | No backend admin | Admin token | Admin role with Bearer token | Protected admin flow | Protected admin flow | Protected admin flow |
| Auth | None | Planned | Username/email/password auth | Login/Account flow refined | Login-by-email fixed, rate-limited | Login-by-email fixed, rate-limited |
| Security | None | Admin token | Password hashing + JWT | Password hashing + JWT | Mandatory secret, CORS allowlist, rate limiting, timing-safe compare | Same, plus containerized secrets |
| Tests | None | None | None | None | pytest suite (auth/CRUD/API) | pytest suite (auth/CRUD/API) |
| Export | CSS/SCSS/JSON/TXT | CSS/SCSS/JSON/TXT/PNG | Account-based favorites export | Selected palette export + PNG palette card | Selected palette export + PNG palette card | Selected palette export + PNG palette card |
| UI | Native selects | Custom dropdowns | Account/admin visibility | Footer panels, changelog page, stable navigation | Footer panels, changelog page, stable navigation | Footer panels, changelog page, stable navigation |

---

## Features

### Frontend

- Responsive HTML/CSS interface.
- Modular JavaScript with ES Modules.
- Single-page navigation (fetch + content swap, no full reload) with a page cross-fade.
- Sliding navigation indicator between tabs.
- Palette cards loaded from the backend API.
- Search by name, description, slug and tags.
- Custom, centered search clear button with bold search text.
- Staggered fade/slide-in animation for palette cards and empty states.
- Tag filtering and sorting.
- Custom dropdown UI.
- Toast notifications and empty states.
- Dynamic API base so the app also works over the LAN (view on a phone on the same Wi-Fi).
- Admin-only footer links (API docs / Changelog).
- Save/remove favorites connected to the logged-in user.
- Account page with session controls and password change.
- Admin navigation hidden for guests and regular users.
- Export one selected palette or user favorites.
- Export formats: CSS, SCSS, JSON, TXT and PNG.
- PNG export preview and download.
- Selected palette PNG export as a standalone palette card.
- HEX color copying.
- Palette name copying.
- Palette contrast status rounded to one decimal.
- Changelog page inside the frontend.
- Bottom project information panel on each page.

### Backend

- FastAPI backend.
- PostgreSQL database (psycopg 3).
- SQLAlchemy models.
- Pydantic validation.
- Public palette API.
- Authentication API.
- User-based favorites API.
- Password hashing with PBKDF2-SHA256 (210k iterations).
- Timing-safe password comparison.
- JWT/Bearer token authentication with PyJWT.
- Login by username or email.
- Login and registration rate limiting with slowapi.
- Mandatory `SECRET_KEY` — the app refuses to start without a real secret.
- Explicit CORS origin allowlist (no wildcard).
- Timezone-aware timestamps.
- Admin-only create/update/delete palette actions.
- Automatic default palette seeding.
- Automatic first admin user creation from `.env` settings.
- Swagger UI documentation.
- Automated test suite with pytest (auth, CRUD, API).

---

## Project structure

```text
Palette/
├── frontend/
│   ├── index.html
│   ├── favorites.html
│   ├── export.html
│   ├── admin.html
│   ├── login.html
│   ├── profile.html
│   ├── changelog.html
│   ├── css/
│   └── js/
├── backend/
│   ├── app/
│   ├── requirements.txt
│   └── .env.example
├── docs/
├── README.md
├── CHANGELOG.md
├── ROADMAP.md
├── .gitignore
└── start_project.bat
```

---

## Quick start with Docker

Palette runs on PostgreSQL via Docker Compose — database, backend and static frontend
together. This is the only supported way to run it (there is no SQLite / non-Docker mode).

```bash
docker compose up --build
```

- Backend: `http://localhost:8000` (Swagger at `/docs`)
- Frontend: `http://localhost:5500`
- Database: PostgreSQL in the `db` service, data persisted in the `pgdata` volume.

`backend/.env` must exist (copy `backend/.env.example` and set a real `SECRET_KEY`).
Compose sets `DATABASE_URL` to the Postgres service automatically. Stop with
`docker compose down` (add `-v` to also drop the database volume).

### Tests

The test suite runs against a disposable PostgreSQL in its own Compose profile:

```bash
docker compose --profile test run --rm tests
```

---

## Environment variables

Create a local file:

```text
backend/.env
```

Use `backend/.env.example` as a template:

```env
SECRET_KEY=change-this-secret-key-before-sharing
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
# DATABASE_URL is mandatory (PostgreSQL). Docker Compose sets it from the values below.
POSTGRES_USER=palette
POSTGRES_PASSWORD=palette
POSTGRES_DB=palette
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@palette.local
DEFAULT_ADMIN_PASSWORD=change-this-admin-password
```

`SECRET_KEY` is **mandatory** — the backend raises an error at startup if it is
missing or left as a placeholder. Generate one with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

`CORS_ORIGINS` is a comma-separated allowlist of browser origins. Never use `*`.

Do not commit `backend/.env`.

---

## API overview

```text
GET    /api/palettes
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
PUT    /api/auth/password
GET    /api/favorites
POST   /api/favorites/{slug}
DELETE /api/favorites/{slug}
```

Admin actions require a Bearer token and `is_admin = true`.

---

## GitHub cleanup

Do not commit:

```text
.git/
backend/.venv/
backend/.env
*.db
__pycache__/
*.pyc
.claude/
graphify-out/
*.zip
```

All of these are covered by `.gitignore`. The repository should include
`.env.example`, not `.env`.

---

## Version

Current portfolio release:

```text
v4.0.0
```
