#!/usr/bin/env bash
# Copyright (c) 2026 Perpetuator LLC
#
# Stop the cc-fe dev container.
#
# Usage:
#   scripts/dev_down.sh           # stop + remove the container, keep volumes
#   scripts/dev_down.sh --wipe    # also remove the node_modules/.angular volumes
#                                  # (forces a fresh dep install on the next up)
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.yml"

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running — nothing to stop." >&2
  exit 0
fi

if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
else
  DC=(docker-compose)
fi

if [[ "${1:-}" == "--wipe" ]]; then
  echo "▶ Stopping dev server and removing volumes (fresh node_modules next up)…"
  "${DC[@]}" -f "${COMPOSE_FILE}" down -v
else
  echo "▶ Stopping dev server (volumes preserved)…"
  "${DC[@]}" -f "${COMPOSE_FILE}" down
fi

echo "✅ Dev server stopped."
