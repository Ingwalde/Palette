# Operations

## Health & readiness

- `GET /health` — **liveness**: the process is up. Always `200 {"status":"ok"}`.
- `GET /health/ready` — **readiness**: dependencies are reachable. Returns `200` with
  `{"status":"ready","checks":{"database":"ok","redis":"ok"}}` when the database (and Redis, if
  configured) respond, or `503 {"status":"not ready", ...}` otherwise.

The Compose `backend` service uses `/health/ready` as its container healthcheck, so
`docker compose ps` reports the backend healthy only once it can serve real traffic.

## Error tracking (Sentry)

Off unless `SENTRY_DSN` is set in `backend/.env`. When set, unhandled errors are reported to
Sentry with request context (method, path, status) via the auto-enabled FastAPI integration.
`SENTRY_ENVIRONMENT` (default `production`) and `SENTRY_TRACES_SAMPLE_RATE` (default `0.0`) are
optional. `send_default_pii` is off, so no user PII is attached.

To enable: create a project at <https://sentry.io> (free tier), copy its DSN, set
`SENTRY_DSN=...` in `backend/.env`, and redeploy.

### Frontend (browser)

The React app reports client errors and Web Vitals (LCP/CLS/INP) to Sentry when
`VITE_SENTRY_DSN` is set. Unlike the backend DSN, this is a **build-time** value: Vite inlines
it into the bundle, so it is passed as a Docker build arg (`--build-arg VITE_SENTRY_DSN=...`),
wired in CI from the `VITE_SENTRY_DSN` repository variable. With no DSN the Sentry SDK is
tree-shaken out entirely (no bundle cost). The DSN is public/client-safe, so it is a repo
variable, not a secret. Source maps are emitted so minified stack traces symbolicate.

To enable: create a React project in Sentry, copy its DSN, set the `VITE_SENTRY_DSN` repository
variable (GitHub → Settings → Variables), and let the next `main` build ship it.

## Database backups

`scripts/backup-db.sh` dumps the `db` service to a gzipped file under `backups/` and prunes
files older than `RETENTION_DAYS` (default 14). The `backups/` directory is git-ignored.

It runs in two places: on a cron schedule, and from `deploy.yml` immediately before `up -d` —
migrations apply automatically when the backend starts, so that is the last moment a rollback
is cheap. The script writes to a `.part` file and renames only on success, so a failed
`pg_dump` leaves nothing behind that looks like a usable backup; the deploy gates on its exit
code.

```bash
./scripts/backup-db.sh
```

Schedule it daily on the VM with cron (`crontab -e`):

```cron
15 3 * * * cd /home/ubuntu/Palette && ./scripts/backup-db.sh >> backups/backup.log 2>&1
```

Restore a dump:

```bash
gunzip -c backups/palette-YYYYMMDD-HHMMSS.sql.gz | docker compose exec -T db psql -U palette -d palette
```
