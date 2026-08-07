# Deployment & CI/CD

## Continuous delivery

`.github/workflows/ci.yml` runs lint, type-check and the test suite on every PR and on pushes to
`main`. `.github/workflows/deploy.yml` then **auto-deploys production** — it runs only after the
CI workflow succeeds on `main`, SSHes to the VM, pulls, rebuilds and waits for `/health/ready`.

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

```bash
ssh <user>@<vm> "cd ~/Palette && git pull origin main && docker compose up -d --build && docker compose restart frontend"
```

### Rollback

```bash
ssh <user>@<vm> "cd ~/Palette && git checkout <previous-good-sha> && docker compose up -d --build"
```

## Staging (same VM)

An isolated second stack for smoke-testing, on different ports and its own database:

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

3. Give the staging stack its own `backend/.env` with `PUBLIC_BASE_URL=https://staging.palettes-app.com`
   and `COOKIE_SECURE=true`.

Then staging behaves exactly like production (https, same-origin, secure cookies).
