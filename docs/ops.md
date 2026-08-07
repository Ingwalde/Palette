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

## Database backups

`scripts/backup-db.sh` dumps the `db` service to a gzipped file under `backups/` and prunes
files older than `RETENTION_DAYS` (default 14). The `backups/` directory is git-ignored.

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
