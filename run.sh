#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8888}"
HOST="${HOST:-0.0.0.0}"
WORKDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$WORKDIR"

echo "========================================="
echo " Starting Hoffice (Hermes Virtual Office)"
echo " Host: $HOST"
echo " Port: $PORT"
echo " Directory: $WORKDIR"
echo "========================================="

exec python3 -m uvicorn app:app --host "$HOST" --port "$PORT"
