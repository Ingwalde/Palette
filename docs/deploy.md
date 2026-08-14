# Deployment & CI/CD

## Continuous delivery

`.github/workflows/ci.yml` runs on every PR and on pushes to `main`: backend lint and types,
the pytest suite, a dependency audit, the frontend lint/format/type/unit/build chain, the
Playwright e2e and axe suite, and the screenshot baselines in a pinned container.

`.github/workflows/deploy.yml` then **auto-deploys production**, but only after CI succeeds on
`main`. On the VM it:

1. checks out `github.event.workflow_run.head_sha` — the exact commit CI validated, not
   whatever `main` points at by the time the deploy runs;
2. decrypts `secrets/prod.enc.env` into `backend/.env`, refusing to overwrite unless the
   decrypt produced a real `SECRET_KEY`;
3. pulls the CI-built frontend image and builds the backend;
4. **takes a database backup** via `scripts/backup-db.sh`, because migrations run
   automatically in the app lifespan and `up -d` is the point of no return;
5. brings the stack up with `docker-compose.prod.yml` layered on, which blanks the dev-only
   CSP `connect-src`;
6. waits for `/health/ready` and fails the deploy if it never comes.

The checkout is a detached HEAD, so a locally modified file on the VM aborts the deploy rather
than being silently overwritten. That is deliberate.

### One-time setup (GitHub secrets + deploy key)

1. On the VM, create a dedicated deploy key (no passphrase) and authorize it:

   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/palette_deploy -N ""
   cat ~/.ssh/palette_deploy.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/palette_deploy          # the PRIVATE key — copy this
   ```

2. In GitHub → **Settings → Secrets and variables → Actions**, add:
   - `DEPLOY_HOST` — the VM IP (e.g. `82.70.50.145`)
   - `DEPLOY_USER` — the SSH user (e.g. `ubuntu`)
   - `DEPLOY_SSH_KEY` — the **private** key printed above

That's it — merging to `main` (after green CI) deploys automatically.

### Manual deploy (fallback)

Mirror what the workflow does, including the backup and the production overlay:

```bash
ssh <user>@<vm> '
  cd ~/Palette
  git fetch origin && git checkout --detach <sha>
  sops --decrypt --input-type dotenv --output-type dotenv secrets/prod.enc.env > backend/.env
  COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
  $COMPOSE pull frontend && $COMPOSE build backend
  bash scripts/backup-db.sh
  $COMPOSE up -d
'
```

### Rollback

```bash
ssh <user>@<vm> "cd ~/Palette && git checkout --detach <previous-good-sha> &&   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build"
```

Rolling back **code** is not rolling back the **schema**. Migrations already applied stay
applied, and an older backend may not understand the newer schema. If the bad deploy included a
migration, restore from the backup the deploy took just before it — see `docs/ops.md`.

## Staging (same VM)

An isolated second stack for smoke-testing, on different ports, its own database **and its own
secrets**. Decrypt them once before the first run, or the stack will not start — Compose
requires the file to exist:

```bash
sops --decrypt --input-type dotenv --output-type dotenv   secrets/staging.enc.env > backend/.env.staging
```

Staging has its own `SECRET_KEY`, database password and admin password, with Resend and Sentry
blanked, so it cannot email real users or report into the production Sentry project.
`docker-compose.staging.yml` sets `env_file` with `!override` rather than letting it merge, so
no production value can reach staging through a key staging forgot to set.

```bash
docker compose -p palette-staging -f docker-compose.yml -f docker-compose.staging.yml up -d --build
# backend  http://<vm-ip>:8001
# frontend http://<vm-ip>:5501
docker compose -p palette-staging -f docker-compose.yml -f docker-compose.staging.yml down
```

This is meant for **backend/API** smoke-testing (`curl http://<vm-ip>:8001/health/ready`, auth,
CRUD). It has its own Postgres/Redis, so it never touches production data.

### Full browser staging (optional upgrade)

Serving the staging **frontend** correctly needs its own origin, because the app's API base, CSP
and cookies all assume same-origin. To do it properly, give staging a subdomain behind Caddy:

1. Add a Cloudflare DNS record `staging.palettes-app.com` → the VM.
2. Add a Caddy site block:

   ```
   staging.palettes-app.com {
       handle_path /api/* {
           reverse_proxy localhost:8001
       }
       reverse_proxy localhost:5501
   }
   ```

3. Set `PUBLIC_BASE_URL=https://staging.palettes-app.com` and `COOKIE_SECURE=true` in the
   staging secrets (`sops secrets/staging.enc.env`), then re-decrypt to `backend/.env.staging`.

Then staging behaves exactly like production (https, same-origin, secure cookies).
