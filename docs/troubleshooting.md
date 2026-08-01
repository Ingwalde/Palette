# Troubleshooting

Palette v4.0 runs on Docker Compose (PostgreSQL + backend + frontend).

## Backend is not available

Frontend message:

```text
Backend is not available
```

Check the stack is up:

```bash
docker compose ps
docker compose logs backend
```

Then verify:

```text
http://localhost:8000/docs
http://localhost:8000/api/palettes
```

---

## Backend refuses to start

The app hard-fails at startup if configuration is missing:

- `SECRET_KEY is missing or set to an insecure placeholder value` — set a strong
  `SECRET_KEY` in `backend/.env` (`python -c "import secrets; print(secrets.token_urlsafe(48))"`).
- `DATABASE_URL must be a PostgreSQL URL` — run via `docker compose up`, which sets it.

---

## Database connection errors

```bash
docker compose logs db
docker compose ps        # db should be "healthy"
```

The backend `depends_on` the db healthcheck, so it waits for PostgreSQL. If the db is
unhealthy, check the `POSTGRES_*` values in `backend/.env`.

---

## 401 Could not validate credentials

Possible reasons: token expired, backend restarted with a different `SECRET_KEY`, or
stale auth in localStorage.

Fix: log out and log in again, or clear these localStorage keys:

```text
palette:access-token
palette:user
```

---

## 403 Admin access is required

You are logged in, but your user is not admin. Use the admin account from `backend/.env`
(`DEFAULT_ADMIN_*`). To reseed a fresh admin, reset the database (below).

---

## Reset the database

```bash
docker compose down -v     # drops the pgdata volume
docker compose up --build  # recreates schema, reseeds palettes + admin
```

---

## Favorites not loading

Favorites require login. Check: backend is running, user is logged in, token exists in
localStorage, and `/api/favorites` works in Swagger with a Bearer token.

---

## Admin tab / footer links not visible

Expected for guests and regular users — the Admin tab and the footer API-docs/Changelog
links are shown only when `user.is_admin = true`. The backend still protects admin
endpoints even if `admin.html` is opened directly.

---

## Changes not showing in the browser

The dev nginx sends `no-store`, so a normal reload should fetch fresh files. If a change
still does not appear, do a hard reload (DevTools → right-click reload → "Empty Cache and
Hard Reload"). CSS assets are also tagged with `?v=<version>` and busted per release.

---

## Port already in use

If `5500` or `8000` is taken (`WinError 10013` / bind error), stop whatever holds the
port, or change the published port in `docker-compose.yml` (e.g. `"8001:8000"`).

---

## Viewing on a phone fails

See `docs/setup.md` → "View on another device". Ensure the phone is on the same Wi-Fi,
the phone origin is in `CORS_ORIGINS`, and the PC firewall allows inbound 5500/8000.
