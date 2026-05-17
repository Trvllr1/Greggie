#!/bin/sh
# Smoke test for /internal/streams/auth endpoint.
# Run inside the backend container after `apk add --no-cache curl`.
set -e

REAL_KEY="${REAL_KEY:-8c3316caf2ce1f920a0126c8}"
BASE="http://127.0.0.1:8080/internal/streams/auth"

hit() {
  local label="$1"; shift
  local body="$1"; shift
  local expected="$1"; shift
  local code
  code=$(curl -s -o /tmp/resp.txt -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d "$body" "$BASE")
  local rb
  rb=$(cat /tmp/resp.txt)
  if [ "$code" = "$expected" ]; then
    echo "PASS  $label  HTTP=$code  body='$rb'"
  else
    echo "FAIL  $label  HTTP=$code (expected $expected)  body='$rb'"
  fi
}

echo "--- /internal/streams/auth smoke ---"
hit "fake-publish"            '{"action":"publish","path":"FAKE_DOES_NOT_EXIST","ip":"1.2.3.4","protocol":"rtmp"}'             401
hit "real-publish-bare"       "{\"action\":\"publish\",\"path\":\"$REAL_KEY\",\"ip\":\"1.2.3.4\",\"protocol\":\"rtmp\"}"        200
hit "real-publish-live-pref"  "{\"action\":\"publish\",\"path\":\"live/$REAL_KEY\",\"ip\":\"1.2.3.4\",\"protocol\":\"rtmp\"}"   200
hit "read-bypass"             '{"action":"read","path":"anything","ip":"1.2.3.4","protocol":"hls"}'                             200
hit "empty-publish"           '{"action":"publish","path":"","ip":"1.2.3.4","protocol":"rtmp"}'                                 401
