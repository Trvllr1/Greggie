#!/bin/bash
# Check OCI ARM (A1.Flex) capacity in us-phoenix-1 using Capacity Reports API
# Run from local machine (where OCI CLI is configured)
# Schedule: run manually or via Task Scheduler / cron
# When capacity is found, prints alert and creates flag file
set -euo pipefail

COMPARTMENT="ocid1.tenancy.oc1..aaaaaaaarbzw3qzhl4ifogap56eow7bdq55j6dqx62t4xzwposxbvdhunina"
SHAPE="VM.Standard.A1.Flex"
ADS=("fZaA:PHX-AD-1" "fZaA:PHX-AD-2" "fZaA:PHX-AD-3")
OCPUS=4
MEMORY=24

echo "[$(date)] Checking ARM capacity across ${#ADS[@]} ADs..."

for AD in "${ADS[@]}"; do
  STATUS=$(oci compute compute-capacity-report create \
    --compartment-id "$COMPARTMENT" \
    --availability-domain "$AD" \
    --shape-availabilities "[{\"instanceShape\":\"$SHAPE\",\"instanceShapeConfig\":{\"ocpus\":$OCPUS,\"memoryInGBs\":$MEMORY}}]" \
    --query 'data."shape-availabilities"[0]."availability-status"' \
    --raw-output 2>/dev/null || echo "ERROR")

  echo "  $AD: $STATUS"

  if [ "$STATUS" = "AVAILABLE" ]; then
    echo ""
    echo ">>> ARM CAPACITY FOUND in $AD! <<<"
    echo ">>> You can now launch a 4 OCPU / 24 GB ARM instance."
    echo ">>> Run: oci compute instance launch --shape VM.Standard.A1.Flex --availability-domain $AD ..."
    exit 0
  fi
done

echo "[$(date)] No ARM capacity available. Try again later."
exit 1
