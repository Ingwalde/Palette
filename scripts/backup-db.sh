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
echo "Backing up database -> ${outfile}"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$outfile"
echo "Wrote $(du -h "$outfile" | cut -f1) to ${outfile}"

# Prune old backups.
find "$BACKUP_DIR" -name 'palette-*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -print -delete \
  | sed 's/^/Pruned /' || true
