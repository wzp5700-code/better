#!/bin/sh
# Daily SQLite backup using the safe .backup command.
# Kept inside the `backup` service container.

set -eu

DATA_DIR="${DATA_DIR:-/app/data}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"

DB_FILE="$DATA_DIR/app.db"
if [ ! -f "$DB_FILE" ]; then
  echo "[backup] no db at $DB_FILE, skipping"
  exit 0
fi

mkdir -p "$BACKUP_DIR"
TS=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
TARGET="$BACKUP_DIR/app-${TS}.db"

sqlite3 "$DB_FILE" ".backup '$TARGET'"
echo "[backup] wrote $TARGET"

# prune
find "$BACKUP_DIR" -name "app-*.db" -type f -mtime "+${KEEP_DAYS}" -delete
echo "[backup] pruned backups older than ${KEEP_DAYS} days"