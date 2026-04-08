#!/bin/bash
# Greggie DB Backup — runs via cron on the OCI VM
# Keeps last 7 daily backups, rotates automatically
# Usage: Add to crontab: 0 3 * * * /home/ubuntu/greggie/infra/backup-db.sh
set -euo pipefail

BACKUP_DIR="/home/ubuntu/greggie-backups"
COMPOSE_FILE="/home/ubuntu/greggie/docker-compose.prod.yml"
RETAIN_DAYS=7
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/greggie-${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Dump via the running postgres container
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U greggie --no-owner --no-acl greggie \
  | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup complete: $BACKUP_FILE ($SIZE)"

# Rotate: delete backups older than RETAIN_DAYS
find "$BACKUP_DIR" -name "greggie-*.sql.gz" -mtime +${RETAIN_DAYS} -delete
REMAINING=$(find "$BACKUP_DIR" -name "greggie-*.sql.gz" | wc -l)
echo "[$(date)] Retained $REMAINING backup(s)"
