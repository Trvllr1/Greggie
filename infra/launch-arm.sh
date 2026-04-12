#!/bin/bash
# Launch an OCI ARM (Ampere A1.Flex) instance — OCI Free Tier (4 OCPU / 24 GB)
# Checks capacity across all ADs, then launches when available.
#
# Prerequisites:
#   - OCI CLI configured (`oci setup config` or API key auth)
#   - VCN + subnet already exist (reuse the existing ones from the AMD instance)
#   - SSH public key at ~/.ssh/greggie-dev.pub
#
# Usage:
#   bash infra/launch-arm.sh                  # one-shot attempt
#   bash infra/launch-arm.sh --poll 60        # retry every 60s until capacity found
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
COMPARTMENT="ocid1.tenancy.oc1..aaaaaaaarbzw3qzhl4ifogap56eow7bdq55j6dqx62t4xzwposxbvdhunina"
SHAPE="VM.Standard.A1.Flex"
OCPUS=4
MEMORY_GB=24
BOOT_VOLUME_GB=50  # Free Tier allows up to 200 GB total across all instances

# Networking — fill these in from your existing VCN
# Find them: oci network subnet list --compartment-id $COMPARTMENT
SUBNET_OCID="${OCI_SUBNET_OCID:?Set OCI_SUBNET_OCID env var (oci network subnet list --compartment-id ...)}"

# SSH key for instance access
SSH_KEY_FILE="${SSH_KEY_FILE:-$HOME/.ssh/greggie-dev.pub}"

# Ubuntu 24.04 aarch64 (Canonical) — us-phoenix-1
# Find latest: oci compute image list --compartment-id $COMPARTMENT --operating-system "Canonical Ubuntu" --shape VM.Standard.A1.Flex --sort-by TIMECREATED --limit 5
IMAGE_OCID="${OCI_IMAGE_OCID:-ocid1.image.oc1.phx.aaaaaaaa}"  # REPLACE with actual image OCID

ADS=("fZaA:PHX-AD-1" "fZaA:PHX-AD-2" "fZaA:PHX-AD-3")
DISPLAY_NAME="greggie-arm"

# ── Parse args ────────────────────────────────────────────────────────────────
POLL_INTERVAL=0
if [[ "${1:-}" == "--poll" ]]; then
  POLL_INTERVAL="${2:-60}"
  echo "Polling mode: will retry every ${POLL_INTERVAL}s until capacity is found."
fi

# ── Functions ─────────────────────────────────────────────────────────────────
check_and_launch() {
  echo "[$(date)] Checking ARM capacity across ${#ADS[@]} ADs..."

  for AD in "${ADS[@]}"; do
    STATUS=$(oci compute compute-capacity-report create \
      --compartment-id "$COMPARTMENT" \
      --availability-domain "$AD" \
      --shape-availabilities "[{\"instanceShape\":\"$SHAPE\",\"instanceShapeConfig\":{\"ocpus\":$OCPUS,\"memoryInGBs\":$MEMORY_GB}}]" \
      --query 'data."shape-availabilities"[0]."availability-status"' \
      --raw-output 2>/dev/null || echo "ERROR")

    echo "  $AD: $STATUS"

    if [ "$STATUS" = "AVAILABLE" ]; then
      echo ""
      echo ">>> ARM CAPACITY FOUND in $AD <<<"
      echo ">>> Launching $SHAPE ($OCPUS OCPU / ${MEMORY_GB} GB) ..."
      echo ""

      launch_instance "$AD"
      return 0
    fi
  done

  echo "[$(date)] No ARM capacity available."
  return 1
}

launch_instance() {
  local AD="$1"

  # Validate SSH key exists
  if [ ! -f "$SSH_KEY_FILE" ]; then
    echo "ERROR: SSH key not found at $SSH_KEY_FILE"
    echo "Set SSH_KEY_FILE env var or place your key at ~/.ssh/greggie-dev.pub"
    exit 1
  fi

  # Validate image OCID was replaced
  if [[ "$IMAGE_OCID" == *"aaaaaaaa" ]]; then
    echo ""
    echo "ERROR: You need to set the IMAGE_OCID."
    echo "Find the latest Ubuntu 24.04 aarch64 image:"
    echo ""
    echo "  oci compute image list \\"
    echo "    --compartment-id $COMPARTMENT \\"
    echo "    --operating-system 'Canonical Ubuntu' \\"
    echo "    --operating-system-version '24.04' \\"
    echo "    --shape $SHAPE \\"
    echo "    --sort-by TIMECREATED --limit 3 \\"
    echo "    --query 'data[*].{id:id, name:\"display-name\", created:\"time-created\"}'"
    echo ""
    echo "Then: OCI_IMAGE_OCID=ocid1.image.oc1.phx.xxx bash infra/launch-arm.sh"
    exit 1
  fi

  INSTANCE_JSON=$(oci compute instance launch \
    --compartment-id "$COMPARTMENT" \
    --availability-domain "$AD" \
    --shape "$SHAPE" \
    --shape-config "{\"ocpus\": $OCPUS, \"memoryInGBs\": $MEMORY_GB}" \
    --image-id "$IMAGE_OCID" \
    --subnet-id "$SUBNET_OCID" \
    --boot-volume-size-in-gbs "$BOOT_VOLUME_GB" \
    --assign-public-ip true \
    --display-name "$DISPLAY_NAME" \
    --ssh-authorized-keys-file "$SSH_KEY_FILE" \
    --metadata '{"user_data": ""}' \
    --wait-for-state RUNNING \
    --wait-interval-seconds 15 \
    --max-wait-seconds 600)

  INSTANCE_ID=$(echo "$INSTANCE_JSON" | oci compute instance get --from-json /dev/stdin --query 'data.id' --raw-output 2>/dev/null || \
    echo "$INSTANCE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

  echo ""
  echo "=== Instance launched! ==="
  echo "Instance ID: $INSTANCE_ID"
  echo ""

  # Get the public IP
  echo "Fetching public IP..."
  sleep 5
  VNIC_ATTACHMENTS=$(oci compute vnic-attachment list \
    --compartment-id "$COMPARTMENT" \
    --instance-id "$INSTANCE_ID" \
    --query 'data[0]."vnic-id"' \
    --raw-output)

  PUBLIC_IP=$(oci network vnic get \
    --vnic-id "$VNIC_ATTACHMENTS" \
    --query 'data."public-ip"' \
    --raw-output)

  echo ""
  echo "============================================"
  echo "  ARM Instance Ready!"
  echo "  IP: $PUBLIC_IP"
  echo "  Shape: $SHAPE ($OCPUS OCPU / ${MEMORY_GB} GB)"
  echo "  AD: $AD"
  echo "============================================"
  echo ""
  echo "Next steps:"
  echo "  1. Reserve the public IP (to make it static):"
  echo "     oci network public-ip create --compartment-id $COMPARTMENT \\"
  echo "       --lifetime RESERVED --display-name greggie-arm-ip"
  echo ""
  echo "  2. Add ingress rules to the security list (ports 80, 443, 1935):"
  echo "     OCI Console > Networking > VCN > Security Lists > Default"
  echo ""
  echo "  3. SSH in and run the setup script:"
  echo "     ssh -i ~/.ssh/greggie-dev ubuntu@$PUBLIC_IP"
  echo "     bash infra/setup-arm.sh"
  echo ""
  echo "  4. Migrate data from AMD instance (137.131.51.134):"
  echo "     bash infra/migrate-to-arm.sh $PUBLIC_IP"
}

# ── Main ──────────────────────────────────────────────────────────────────────
if [ "$POLL_INTERVAL" -gt 0 ]; then
  while true; do
    if check_and_launch; then
      exit 0
    fi
    echo "Retrying in ${POLL_INTERVAL}s... (Ctrl+C to stop)"
    sleep "$POLL_INTERVAL"
  done
else
  check_and_launch || {
    echo ""
    echo "Tip: Run with --poll to keep retrying:"
    echo "  bash infra/launch-arm.sh --poll 60"
    echo ""
    echo "Or run in background:"
    echo "  nohup bash infra/launch-arm.sh --poll 60 > arm-poll.log 2>&1 &"
    exit 1
  }
fi
