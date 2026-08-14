#!/usr/bin/env bash
# PostgreSQL backup for the Palette stack. Dumps the compose `db` service to a gzipped file
# and prunes backups older than RETENTION_DAYS. Run from the repo root.
#
#   ./scripts/backup-db.sh
#
# Schedule daily on the VM with cron (crontab -e):
#   15 3 * * * cd /home/ubuntu/Palette && ./scripts/backup-db.sh >> backups/backup.log 2>&1
set -euo pipefail

RETENTION_DAYS="${RETENTION_DAYS:-14}"
BACKUP_DIR="${BACKUP_DIR:-backups}"

mkdir -p "$BACKUP_DIR"
stamp="$(date +%Y%m%d-%H%M%S)"
outfile="$BACKUP_DIR/palette-${stamp}.sql.gz"

# Dump from inside the db container, using its own POSTGRES_USER/POSTGRES_DB env (no need to
# parse backend/.env, whose values may contain shell metacharacters).
#
# Write to a .part file and rename only on success. The shell creates the redirect target
# before pg_dump can fail, so a failed dump would otherwise leave a truncated .sql.gz sitting
# next to the good ones, indistinguishable from a real backup until you try to restore it.
# The deploy workflow gates on this script's exit code, so the failure must be loud.
echo "Backing up database -> ${outfile}"
trap 'rm -f "${outfile}.part"' EXIT
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "${outfile}.part"
mv "${outfile}.part" "$outfile"
echo "Wrote $(du -h "$outfile" | cut -f1) to ${outfile}"

# Prune old backups.
find "$BACKUP_DIR" -name 'palette-*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -print -delete \
  | sed 's/^/Pruned /' || true
