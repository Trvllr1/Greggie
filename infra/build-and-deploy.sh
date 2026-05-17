#!/usr/bin/env bash
# build-and-deploy.sh — dev-side release flow for greggie backend.
#
# What it does:
#   1. Cross-compiles the Go backend for linux/amd64 on this machine.
#   2. SCPs the binary + deploy-now.sh to the OCI VM.
#   3. SSHes in and runs ~/greggie/deploy-now.sh.
#
# Why: the OCI Free Tier AMD Micro instance (1 OCPU) cannot reliably build Go
# inside Docker — it OOMs or stalls. We do the heavy lift here and ship a
# 15-ish MB static binary instead.
#
# Usage:
#   VM_HOST=ubuntu@137.131.51.134 ./infra/build-and-deploy.sh
#   # or set VM_HOST in your shell rc
#
# Optional env:
#   VM_HOST          ssh target, e.g. ubuntu@137.131.51.134 (required)
#   VM_REPO_DIR      remote repo path (default: ~/greggie)
#   SSH_KEY          extra -i flag value (default: none — use ssh-agent)
#   GOARCH_OVERRIDE  set to "arm64" if you migrate to an Ampere ARM shape
#
# The binary is .gitignored on purpose; this script is the canonical way to
# move it onto the VM.

set -euo pipefail

if [[ -z "${VM_HOST:-}" ]]; then
  echo "ERROR: VM_HOST is not set. Example: VM_HOST=ubuntu@137.131.51.134"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VM_REPO_DIR="${VM_REPO_DIR:-~/greggie}"
GOARCH_TARGET="${GOARCH_OVERRIDE:-amd64}"

SSH_OPTS=()
SCP_OPTS=()
if [[ -n "${SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "$SSH_KEY")
  SCP_OPTS+=(-i "$SSH_KEY")
fi

echo ">>> Cross-compiling backend for linux/${GOARCH_TARGET}..."
(
  cd "$REPO_ROOT/backend"
  GOOS=linux GOARCH="$GOARCH_TARGET" CGO_ENABLED=0 \
    go build -ldflags='-s -w' -o greggie-backend-linux .
)
ls -lh "$REPO_ROOT/backend/greggie-backend-linux"

echo ">>> Copying binary + deploy script to $VM_HOST:$VM_REPO_DIR ..."
scp "${SCP_OPTS[@]}" \
  "$REPO_ROOT/backend/greggie-backend-linux" \
  "$VM_HOST:$VM_REPO_DIR/backend/greggie-backend-linux"
scp "${SCP_OPTS[@]}" \
  "$REPO_ROOT/deploy-now.sh" \
  "$VM_HOST:$VM_REPO_DIR/deploy-now.sh"

echo ">>> Running deploy-now.sh on $VM_HOST ..."
# shellcheck disable=SC2029
ssh "${SSH_OPTS[@]}" "$VM_HOST" "chmod +x $VM_REPO_DIR/deploy-now.sh && $VM_REPO_DIR/deploy-now.sh"

echo ">>> Done."
