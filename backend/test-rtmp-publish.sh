#!/bin/sh
# Run from VM to test RTMP publish auth via MediaMTX.
set -e

REAL_KEY="${REAL_KEY:-8c3316caf2ce1f920a0126c8}"
FAKE_KEY="FAKEKEY_DOES_NOT_EXIST_12345"

echo "================================================================"
echo "RTMP publish auth tests (MediaMTX → backend /internal/streams/auth)"
echo "================================================================"

run_publish() {
  local label="$1"
  local key="$2"
  echo ""
  echo "--- $label: rtmp://mediamtx:1935/$key ---"
  # 2-second test source, push and capture stderr.
  docker run --rm --network greggie_default jrottenberg/ffmpeg:7-alpine \
    -nostdin -hide_banner -loglevel info \
    -re -f lavfi -i "testsrc=size=320x240:rate=10:duration=2" \
    -f lavfi -i "sine=frequency=440:duration=2" \
    -c:v libx264 -preset ultrafast -tune zerolatency -g 20 \
    -c:a aac -ar 44100 -b:a 64k \
    -f flv "rtmp://mediamtx:1935/$key" 2>&1 | tail -20
  echo "--- exit=$? ---"
}

run_publish "FAKE_KEY (expect failure)" "$FAKE_KEY"
sleep 1
run_publish "REAL_KEY (expect success)" "$REAL_KEY"

echo ""
echo "================================================================"
echo "MediaMTX logs (last 30 lines):"
echo "================================================================"
docker logs --tail 30 greggie-mediamtx-1 2>&1 | tail -30

echo ""
echo "================================================================"
echo "Backend logs (mediamtx-auth lines):"
echo "================================================================"
docker logs --tail 100 greggie-backend-1 2>&1 | grep mediamtx-auth | tail -10
