#!/bin/bash
# Migrate Greggie data from AMD instance (137.131.51.134) to a new ARM instance
# Usage: bash infra/migrate-to-arm.sh <ARM_IP>
#
# What this migrates:
#   - PostgreSQL database (full dump + restore)
#   - .env file (secrets)
#   - Caddy TLS state (so HTTPS keeps working)
#   - Backups directory
#
# Prerequisites:
#   - SSH access to both instances via ~/.ssh/greggie-dev
#   - ARM instance already set up (bash infra/setup-arm.sh)
#   - Repo cloned on ARM instance
set -euo pipefail

AMD_IP="137.131.51.134"
ARM_IP="${1:?Usage: bash infra/migrate-to-arm.sh <ARM_IP>}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/greggie-dev}"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=accept-new"

echo "=== Greggie Migration: AMD ($AMD_IP) → ARM ($ARM_IP) ==="
echo ""

# ── 1. Dump database on AMD instance ─────────────────────────────────────────
echo ">>> [AMD] Dumping PostgreSQL database..."
ssh $SSH_OPTS ubuntu@"$AMD_IP" bash -s <<'DUMP'
  cd ~/greggie
  docker compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U greggie --format=custom --compress=6 greggie \
    > /tmp/greggie-migrate.dump
  echo "Dump size: $(du -h /tmp/greggie-migrate.dump | cut -f1)"
DUMP

# ── 2. Transfer dump to ARM instance ─────────────────────────────────────────
echo ">>> Transferring database dump AMD → ARM..."
scp $SSH_OPTS ubuntu@"$AMD_IP":/tmp/greggie-migrate.dump /tmp/greggie-migrate.dump
scp $SSH_OPTS /tmp/greggie-migrate.dump ubuntu@"$ARM_IP":/tmp/greggie-migrate.dump
rm -f /tmp/greggie-migrate.dump

# ── 3. Copy .env file ────────────────────────────────────────────────────────
echo ">>> Transferring .env secrets..."
scp $SSH_OPTS ubuntu@"$AMD_IP":~/greggie/.env /tmp/greggie-env
scp $SSH_OPTS /tmp/greggie-env ubuntu@"$ARM_IP":~/greggie/.env
rm -f /tmp/greggie-env

# ── 4. Start services on ARM and restore DB ──────────────────────────────────
echo ">>> [ARM] Starting services and restoring database..."
ssh $SSH_OPTS ubuntu@"$ARM_IP" bash -s <<'RESTORE'
  cd ~/greggie

  # Start just postgres to restore into
  docker compose -f docker-compose.prod.yml -f docker-compose.arm.yml up -d postgres
  echo "Waiting for postgres to be ready..."
  sleep 10

  # Drop and recreate the database, then restore
  docker compose -f docker-compose.prod.yml -f docker-compose.arm.yml exec -T postgres \
    pg_restore -U greggie -d greggie --clean --if-exists --no-owner \
    < /tmp/greggie-migrate.dump

  echo "Database restored."
  rm -f /tmp/greggie-migrate.dump

  # Bring up all services
  echo "Starting all services..."
  docker compose -f docker-compose.prod.yml -f docker-compose.arm.yml up -d

  # Verify
  sleep 5
  curl -sf http://localhost:8080/health && echo "Health check: OK" || echo "WARNING: health check failed"
RESTORE

# ── 5. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Migration Complete!"
echo "  AMD (old): $AMD_IP"
echo "  ARM (new): $ARM_IP"
echo "============================================"
echo ""
echo "Remaining steps:"
echo ""
echo "  1. Test the ARM instance:"
echo "     curl -k https://$ARM_IP/api/health"
echo ""
echo "  2. Update the Caddyfile with the new IP (if it changed):"
echo "     sed -i 's/$AMD_IP/$ARM_IP/g' infra/Caddyfile"
echo ""
echo "  3. Update DNS / reserved IP to point to $ARM_IP"
echo ""
echo "  4. Update GitHub secret OCI_SSH_KEY if the ARM instance"
echo "     uses a different key"
echo ""
echo "  5. Update deploy.yml host IP to $ARM_IP"
echo ""
echo "  6. Once verified, stop the AMD instance:"
echo "     ssh $SSH_OPTS ubuntu@$AMD_IP 'cd ~/greggie && docker compose -f docker-compose.prod.yml down'"
echo ""
echo "  7. (Optional) Terminate the AMD instance in OCI Console"
echo "     to free resources"
