#!/usr/bin/env bash
# Copyright (c) 2026 Perpetuator LLC
#
# Show the status of the cc-fe dev container (up/health/ports).
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.yml"

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running." >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
else
  DC=(docker-compose)
fi

"${DC[@]}" -f "${COMPOSE_FILE}" ps
