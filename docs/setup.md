# Setup Guide

Palette v4.0 runs on PostgreSQL via Docker Compose. Docker is the only supported way to
run it — there is no SQLite or non-Docker mode.

---

## Requirements

- Docker Desktop (Compose v2).
- A modern browser.

---

## 1. Environment file

Create `backend/.env` (copy `backend/.env.example`). `SECRET_KEY` is mandatory — the
app refuses to start with a missing or placeholder value. Generate one with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Example `backend/.env`:

```env
SECRET_KEY=replace-with-a-generated-secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
POSTGRES_USER=palette
POSTGRES_PASSWORD=palette
POSTGRES_DB=palette
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@palette.local
DEFAULT_ADMIN_PASSWORD=change-this-admin-password
```

`DATABASE_URL` is set automatically by Docker Compose from the `POSTGRES_*` values.
Do not commit `.env`.

---

## 2. Start the stack

From the project root:

```bash
docker compose up --build
```

This starts PostgreSQL (`db`), the backend and the static frontend (`nginx`). On first
boot the backend creates the schema and seeds the default palettes and admin user.

---

## 3. Open the app

```text
Frontend:       http://localhost:5500
Login:          http://localhost:5500/login
Account:        http://localhost:5500/profile
Favorites:      http://localhost:5500/favorites
Export:         http://localhost:5500/export
Admin:          http://localhost:5500/admin
Backend API:    http://localhost:8000/api/v1/palettes
```

The routes are extensionless — the `.html` pages belonged to the vanilla frontend, removed
in 4.8.0. Swagger lives at `http://localhost:8000/api/docs` and is off unless you set
`ENABLE_API_DOCS=true`.

Admin credentials come from `DEFAULT_ADMIN_*` in `.env`. Regular users can register
from the Login page.

---

## 4. Tests

The suite runs against a disposable PostgreSQL in a dedicated Compose profile:

```bash
docker compose --profile test run --rm tests
```

---

## 5. View on another device (same Wi-Fi)

The frontend uses a dynamic API base (`http://<host>:8000/api`), so the app also works
from another device on the same network — e.g. a phone.

1. Find the PC's LAN IP (Windows: `ipconfig` → IPv4 of the Wi-Fi adapter).
2. On the phone browser open `http://<PC-IP>:5500`.
3. Add that origin to `CORS_ORIGINS` in `backend/.env`
   (e.g. `...,http://<PC-IP>:5500`) and restart the backend:
   `docker compose up -d backend`.
4. If it does not connect, allow inbound ports 5500 and 8000 through the PC firewall.

---

## 6. Stop / reset

```bash
docker compose down        # stop containers, keep data
docker compose down -v     # also drop the pgdata volume (fresh database next up)
```
