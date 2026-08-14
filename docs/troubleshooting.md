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
http://localhost:8000/health/ready
http://localhost:8000/api/v1/palettes
```

(Swagger is at `/api/docs`, not `/docs`, and only when `ENABLE_API_DOCS=true` — so it is
not a useful liveness check.)

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

Possible reasons: the access token expired, the backend restarted with a different
`SECRET_KEY`, or the session was revoked server-side — changing a password, resetting one, or
`logout-all` retires every token already issued.

Fix: sign in again. There is nothing to clear by hand; the app stores no auth in localStorage,
and the cookies are httpOnly. To force a clean slate, clear cookies for the site.

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

Favorites require a session. Tokens live in **httpOnly cookies**, not localStorage, so there is
nothing to inspect in devtools storage — check the Application → Cookies panel for
`access_token` instead. `GET /api/v1/auth/me` returning `401` means there is no session; the app
then attempts one `/auth/refresh`, which also returns `401` for a signed-out visitor. That pair
is normal and not an error.

---

## Admin tab / footer links not visible

Expected for guests and regular users — the Admin tab and the footer API-docs/Changelog
links are shown only when `user.is_admin = true`. The backend still protects admin
endpoints even if `/admin` is opened directly.

---

## Changes not showing in the browser

The dev nginx sends `no-store`, so a normal reload should fetch fresh files. If a change
still does not appear, do a hard reload (DevTools → right-click reload → "Empty Cache and
Hard Reload"). Built assets are content-hashed by Vite, so a released change always lands on a
new filename.

---

## Port already in use

If `5500` or `8000` is taken (`WinError 10013` / bind error), stop whatever holds the
port, or change the published port in `docker-compose.yml` (e.g. `"8001:8000"`).

---

## Viewing on a phone fails

See `docs/setup.md` → "View on another device". Ensure the phone is on the same Wi-Fi,
the phone origin is in `CORS_ORIGINS`, and the PC firewall allows inbound 5500/8000.

---

## Everyone was signed out after a release

Expected once, on the release that introduced revocable access tokens. Tokens carry a
`token_version` claim now, and one minted before the claim existed has none — so it is treated
as stale and rejected. Signing in again is the whole fix. See [`auth.md`](auth.md).

---

## The staging stack will not start

Compose requires `backend/.env.staging` to exist, and it is git-ignored because it holds
decrypted secrets. Create it once on the VM:

```bash
sops --decrypt --input-type dotenv --output-type dotenv secrets/staging.enc.env > backend/.env.staging
```

---

## A deploy aborted at the checkout step

The workflow checks out the exact commit CI validated, and refuses to overwrite local changes
on the VM. Something was edited in place — `git status` in `~/Palette` will show what. Commit
it or discard it; do not add `--force` to the deploy, which would hide the next one.
