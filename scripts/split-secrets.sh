#!/usr/bin/env bash
# One-shot migration: split the single secrets.enc.env into separate prod and staging files.
#
# Run this ON THE MACHINE THAT HOLDS THE AGE PRIVATE KEY (the VM), from the repo root:
#
#   bash scripts/split-secrets.sh
#
# Why it exists: secrets.enc.env accumulated a second copy of POSTGRES_DB,
# DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD. dotenv resolves
# duplicates last-wins, so production has silently been running on the *second* block while
# the first sits there looking authoritative. Splitting by hand risks picking the wrong one -
# for POSTGRES_DB that means pointing the app at a different database.
#
# So: secrets/prod.enc.env reproduces today's effective values exactly (last occurrence of
# each key wins, original key order preserved). Nothing about production changes.
# secrets/staging.enc.env starts from the same set but with freshly generated credentials, so
# staging never shares production's SECRET_KEY, database password or admin password.
#
# This script never prints a secret value. It reports key names only.
set -euo pipefail

SRC="${SRC:-secrets.enc.env}"
OUT_DIR="${OUT_DIR:-secrets}"

for tool in sops openssl awk; do
  command -v "$tool" >/dev/null || { echo "Missing required tool: $tool" >&2; exit 1; }
done
[ -f "$SRC" ] || { echo "Not found: $SRC (run from the repo root)" >&2; exit 1; }

# Plaintext only ever exists inside this 0700 temp dir, and only for the length of the run.
umask 077
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

echo "Decrypting $SRC (values are never printed)..."
sops --decrypt --input-type dotenv --output-type dotenv "$SRC" > "$work/all.env"

strip_comments() { grep -Ev '^[[:space:]]*(#|$)' "$1"; }

dupes="$(strip_comments "$work/all.env" | cut -d= -f1 | sort | uniq -d || true)"
if [ -n "$dupes" ]; then
  echo "Duplicate keys found (last occurrence is the one production uses):"
  echo "$dupes" | awk '{ print "  - " $0 }'
else
  echo "No duplicate keys found."
fi

# Keep the LAST value for each key, in order of first appearance.
strip_comments "$work/all.env" | awk -F= '
  { key = $1; val = substr($0, index($0, "=") + 1)
    if (!(key in seen)) order[++n] = key
    seen[key] = val }
  END { for (i = 1; i <= n; i++) print order[i] "=" seen[order[i]] }
' > "$work/prod.env"

# Staging: same keys, but anything that grants access gets a fresh value, and outbound
# integrations are switched off so staging cannot email real users or pollute Sentry.
set_key() {
  local file="$1" key="$2" value="$3"
  if grep -q "^${key}=" "$file"; then
    awk -v k="$key" -v v="$value" -F= '
      $1 == k { print k "=" v; next } { print }
    ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

cp "$work/prod.env" "$work/staging.env"
set_key "$work/staging.env" SECRET_KEY "$(openssl rand -base64 48 | tr -d '\n=+/')"
set_key "$work/staging.env" POSTGRES_PASSWORD "$(openssl rand -base64 24 | tr -d '\n=+/')"
set_key "$work/staging.env" DEFAULT_ADMIN_PASSWORD "$(openssl rand -base64 24 | tr -d '\n=+/')"
set_key "$work/staging.env" RESEND_API_KEY ""
set_key "$work/staging.env" SENTRY_DSN ""
set_key "$work/staging.env" SENTRY_ENVIRONMENT "staging"
set_key "$work/staging.env" COOKIE_SECURE "false"
set_key "$work/staging.env" PUBLIC_BASE_URL "http://localhost:5501"
set_key "$work/staging.env" CORS_ORIGINS "http://localhost:5501"

mkdir -p "$OUT_DIR"
sops --encrypt --input-type dotenv --output-type dotenv "$work/prod.env" > "$OUT_DIR/prod.enc.env"
sops --encrypt --input-type dotenv --output-type dotenv "$work/staging.env" > "$OUT_DIR/staging.enc.env"

echo
echo "Wrote $OUT_DIR/prod.enc.env and $OUT_DIR/staging.enc.env."
echo "Keys carried over:"
cut -d= -f1 "$work/prod.env" | sed 's/^/  - /'
echo
echo "Next steps:"
echo "  1. Verify prod round-trips to the same values as today:"
echo "       diff <(sops -d --input-type dotenv --output-type dotenv $SRC | sort -u) \\"
echo "            <(sops -d --input-type dotenv --output-type dotenv $OUT_DIR/prod.enc.env | sort -u)"
echo "     Only the duplicate keys listed above should differ, and only by losing the dead"
echo "     first copy."
echo "  2. Review staging: sops $OUT_DIR/staging.enc.env"
echo "     PUBLIC_BASE_URL / CORS_ORIGINS are placeholders - set them to the real staging origin."
echo "  3. git add $OUT_DIR/ && git commit"
echo "  4. Tell the assistant it is done: deploy.yml, docker-compose.staging.yml, .sops.yaml"
echo "     and docs/secrets.md still point at the old single file and must be switched in one"
echo "     follow-up commit that also deletes $SRC."
