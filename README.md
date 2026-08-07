# Palette v4.7.0 — Full-Stack Color Palette App

Palette is a full-stack color palette web application for browsing, searching, saving and exporting color palettes.

Version **4.7.0** adds continuous delivery: a GitHub Actions **deploy workflow** ships production automatically after CI passes on `main` (SSH pull + rebuild + readiness gate), and a **staging** Compose override (`docker-compose.staging.yml`) runs an isolated second stack on the same VM for smoke-testing. See `docs/deploy.md`. It builds on **4.6.0** (readiness probe, Sentry, DB backups), **4.5.0** (httpOnly-cookie auth with CSRF, CSP + security headers, rate-limited mutations, SOPS secrets), **4.4.4** (admin/form UX pass), **4.4.3** (password reset by email, admin confirmation modals, admin list search and pagination), **4.4.2** (tag catalog with an admin Palettes / Tags mode and chip-based tag editing), **4.4.1** (favorites session-expiry prompt, rounded colour swatch), **4.4** (3- and 5-colour palettes and a dynamic HEX-row colour editor with auto-flowing swatch grids), **4.3.1** (Argon2id, rotating refresh tokens, Redis-backed rate limiting, async SQLAlchemy), **4.3** (account email, delete-account, random home tags), **4.2** (email verification with verify-link auto-login), and the **4.0** PostgreSQL + **Docker Compose** stack — the only supported way to run the app (no SQLite, no non-Docker mode).

```text
Frontend → Fetch API → FastAPI Backend → PostgreSQL Database
```

---

## What changed by version

| Area | v2.0 | v3.0 | v3.1 | v3.2 | v3.3 | v4.0 | v4.1 | v4.2 | v4.3 | v4.4 |
|---|---|---|---|---|---|---|---|---|---|---|
| Architecture | Frontend-only | Frontend + backend | Full-stack with authentication | Full-stack with UX/export polish | Full-stack, security-hardened | Containerized full-stack | Containerized full-stack | Containerized full-stack | Containerized full-stack | Async containerized full-stack |
| Palette data | Static JS data | SQLite database | SQLite database | SQLite database | SQLite database | PostgreSQL only | PostgreSQL only | PostgreSQL only | PostgreSQL only | PostgreSQL, 3–5 colour palettes |
| Deployment | None | Local scripts | Local scripts | Local scripts | Local scripts | Docker Compose | Docker Compose | Docker Compose | Docker Compose | Docker Compose |
| CI | None | None | None | None | None | None | GitHub Actions (pytest) | GitHub Actions (pytest) | GitHub Actions (pytest) | GitHub Actions (pytest) |
| Favorites | Browser localStorage | Browser localStorage | User-based favorites | User-based favorites | User-based favorites | User-based favorites | User-based favorites | User-based favorites | User-based favorites | User-based favorites |
| Admin | No backend admin | Admin token | Admin role with Bearer token | Protected admin flow | Protected admin flow | Protected admin flow | Protected admin flow | Protected admin flow | Protected admin flow | Dynamic colour-row editor |
| Auth | None | Planned | Username/email/password auth | Login/Account flow refined | Login-by-email fixed, rate-limited | Login-by-email fixed, rate-limited | Login-by-email fixed, rate-limited | Email verification on registration | Email verification + delete account | Argon2id + rotating refresh tokens |
| Security | None | Admin token | Password hashing + JWT | Password hashing + JWT | Mandatory secret, CORS allowlist, rate limiting, timing-safe compare | Same, plus containerized secrets | Same, plus containerized secrets | Same, plus proxy-aware rate limiting | Same, plus proxy-aware rate limiting | Argon2id, Redis-backed rate limiting |
| Tests | None | None | None | None | pytest suite (auth/CRUD/API) | pytest suite (auth/CRUD/API) | pytest suite + CI | pytest suite + CI | pytest suite + CI | async pytest suite + CI |
| Export | CSS/SCSS/JSON/TXT | CSS/SCSS/JSON/TXT/PNG | Account-based favorites export | Selected palette export + PNG palette card | Selected palette export + PNG palette card | Selected palette export + PNG palette card | Selected palette export + PNG palette card | Selected palette export + PNG palette card | Selected palette export + PNG palette card | Selected palette export + PNG palette card |
| UI | Native selects | Custom dropdowns | Account/admin visibility | Footer panels, changelog page, stable navigation | Footer panels, changelog page, stable navigation | Footer panels, changelog page, stable navigation | Mobile display fixes + UX polish | Email verify page + resend banner | Account email field, delete account, random home tags | Adaptive swatch grids, dynamic colour editor |

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
- Export formats: CSS, SCSS, JSON and PNG.
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
- Async SQLAlchemy models on the request path (asyncpg).
- Pydantic validation.
- Public palette API.
- Authentication API.
- User-based favorites API.
- Password hashing with Argon2id (legacy PBKDF2 hashes upgraded on next login).
- Timing-safe password comparison.
- JWT access + rotating refresh tokens delivered as **httpOnly cookies** (server-side
  revocation), with **double-submit CSRF** protection on mutating requests.
- Login by username or email.
- Rate limiting with slowapi (Redis-backed, shared across instances) on auth **and every
  mutating endpoint** (palettes, tags, favorites, password change, account delete).
- Strict Content-Security-Policy and security headers (X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy) served with the frontend.
- Encrypted secrets in git via SOPS + age (see `docs/secrets.md`).
- Mandatory `SECRET_KEY` — the app refuses to start without a real secret.
- Explicit CORS origin allowlist (no wildcard).
- Timezone-aware timestamps.
- Admin-only create/update/delete palette actions.
- Automatic default palette seeding from `seed_palettes.json`.
- Automatic first admin user creation from `.env` settings.
- Versioned API under `/api/v1`.
- Paginated palette list (`{ items, total, limit, offset }` + `X-Total-Count` header).
- RFC 7807 `application/problem+json` error responses.
- SQL-side search, tag filtering and sorting; `colors`/`tags` stored as JSONB with a GIN
  index on `tags`.
- Typed configuration via `pydantic-settings` with fail-fast validation.
- Alembic database migrations (safe adoption of a pre-Alembic database on startup).
- Structured application logging (`LOG_LEVEL`).
- Liveness (`/health`) and readiness (`/health/ready`, checks database + Redis) probes; the
  Compose backend healthcheck uses readiness.
- Optional error tracking via Sentry (off unless `SENTRY_DSN` is set).
- Database backup script (`scripts/backup-db.sh`) with retention and a cron example
  (see `docs/ops.md`).
- Swagger UI documentation (served at `/api/docs`, off by default — enable with
  `ENABLE_API_DOCS=true`).
- Automated test suite with pytest (auth, CRUD, API); ruff, mypy and an 80% coverage gate
  in CI.
- Continuous delivery: production auto-deploys after CI passes on `main`, plus a staging
  Compose override for an isolated second stack (see `docs/deploy.md`).

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

- Backend: `http://localhost:8000` (Swagger at `/api/docs` when `ENABLE_API_DOCS=true`)
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

## Development

Backend code quality is enforced with ruff (lint + format), mypy and a pytest coverage
gate; the same checks run in CI. Install the dev tools and hooks:

```bash
pip install -r backend/requirements-dev.txt
pre-commit install
```

```bash
ruff check backend/app backend/tests     # lint
ruff format backend/app backend/tests    # format
mypy backend/app                          # type-check
```

Database schema changes are managed with Alembic (`backend/alembic/`). The app runs
migrations automatically on startup and adopts an existing pre-Alembic database safely.
To add a migration during development:

```bash
docker compose run --rm backend alembic revision -m "describe change"
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
LOG_LEVEL=INFO
ENABLE_API_DOCS=false
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
# DATABASE_URL is mandatory (PostgreSQL). Docker Compose sets it from the values below.
POSTGRES_USER=palette
POSTGRES_PASSWORD=palette
POSTGRES_DB=palette
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@palette.local
DEFAULT_ADMIN_PASSWORD=change-this-admin-password
# Email verification (Resend). Without RESEND_API_KEY the app logs the link instead.
RESEND_API_KEY=
EMAIL_FROM=Palette <noreply@palettes-app.com>
PUBLIC_BASE_URL=http://localhost:5500
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
GET    /api/v1/palettes
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me
DELETE /api/v1/auth/me
GET    /api/v1/auth/verify?token=...
POST   /api/v1/auth/resend-verification
PUT    /api/v1/auth/password
GET    /api/v1/favorites
POST   /api/v1/favorites/{slug}
DELETE /api/v1/favorites/{slug}
```

Admin actions require a Bearer token and `is_admin = true`. `GET /api/v1/palettes` is
paginated (`{ items, total, limit, offset }` with an `X-Total-Count` header; `limit` /
`offset` / `search` / `tag` / `sort` query params). Errors are returned as
`application/problem+json` (RFC 7807).

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
v4.7.0
```

---

## License

Licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE) — you may use, modify and
share this project for **noncommercial** purposes only. Commercial use is not permitted.
This is a source-available license, not an OSI open-source license.

Copyright 2026 Ingwald.
