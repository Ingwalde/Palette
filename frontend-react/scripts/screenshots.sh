#!/usr/bin/env bash
# Bring up the real stack, recapture the README screenshots against it, tear it down.
#
#   ./scripts/screenshots.sh
#
# The images in docs/assets are meant to show the product with its real seeded data, so the
# capture needs the whole stack: nginx, FastAPI, PostgreSQL and Redis. Compose owns that, so
# this script owns Compose.
#
# Run it after a release, when the version string in the hero and footer has changed. The
# previous set was captured by hand and went eight releases without being touched — home.png
# was still advertising v4.7.1 in the hero.
#
# Ports are the published ones, 5500 and 8000, not alternatives. The front end computes its API
# base at runtime as http://<hostname>:8000 over plain http (src/lib/apiBase.ts), so moving the
# backend elsewhere would leave the browser calling a port with nothing behind it. A dev stack
# already on those ports has to come down first.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

CREATED_ENV=0
if [ ! -f backend/.env ]; then
  # CI starts from a clean checkout; backend/.env is gitignored and the app hard-fails without a
  # real SECRET_KEY. A developer's own file is never touched.
  echo "backend/.env is missing; writing a throwaway one for this run."
  cat > backend/.env <<ENV
SECRET_KEY=$(head -c 48 /dev/urandom | base64 | tr -d '\n=/+' | head -c 48)
POSTGRES_USER=palette
POSTGRES_PASSWORD=palette
POSTGRES_DB=palette
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@palette.local
DEFAULT_ADMIN_PASSWORD=screenshot-admin-pass-1
CORS_ORIGINS=http://localhost:5500
COOKIE_SECURE=false
RESEND_API_KEY=
SENTRY_DSN=
ENV
  CREATED_ENV=1
fi

# Read the admin credentials out of whatever env file is in play, so this works against a
# developer's own stack as well as a generated one. Values are passed to the suite, never
# printed.
ADMIN_USER=$(grep -E '^DEFAULT_ADMIN_USERNAME=' backend/.env | cut -d= -f2- || true)
ADMIN_PASSWORD=$(grep -E '^DEFAULT_ADMIN_PASSWORD=' backend/.env | cut -d= -f2- || true)

cleanup() {
  echo "Tearing the stack down."
  docker compose down -v --remove-orphans >/dev/null 2>&1 || true
  if [ "$CREATED_ENV" = "1" ]; then rm -f backend/.env; fi
}
trap cleanup EXIT

echo "Starting the stack."
docker compose up -d --build --wait

# --wait honours the healthchecks, but the frontend container has none, so confirm nginx is
# actually serving before handing over to the browser.
for i in $(seq 1 30); do
  if curl -fsS http://localhost:5500 >/dev/null 2>&1; then break; fi
  if [ "$i" = "30" ]; then echo "Frontend never answered on :5500" >&2; exit 1; fi
  sleep 2
done

cd frontend-react
SCREENSHOT_ADMIN_USER="$ADMIN_USER" \
SCREENSHOT_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  npx playwright test -c playwright.screenshots.config.ts "$@"

cd ..
echo
echo "Recaptured into docs/assets. Review them before committing:"
git --no-pager diff --stat -- docs/assets || true
