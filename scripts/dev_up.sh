#!/usr/bin/env bash
# Copyright (c) 2026 Perpetuator LLC
#
# Bring up the cc-fe dev container (ng serve + HMR) defined in
# docker-compose.yml — idempotent. `docker compose up -d` reuses a running
# container and only (re)creates what changed, so re-running is safe and fast.
#
# Usage:
#   scripts/dev_up.sh            # start the dev server (builds the image if missing)
#   scripts/dev_up.sh --build    # force-rebuild the image first (after dep changes)
#
# This is the same compose file JetBrains' "Dev Stack" run config and the
# VS Code "dev: up" task point at, so CLI and IDE can't drift.
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ docker is not installed / not on PATH." >&2
  echo "   Start Docker Desktop (or colima) and re-run, or run 'yarn start' natively." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "❌ The Docker daemon isn't running. Start Docker Desktop / colima first." >&2
  exit 1
fi

# `docker compose` (v2) vs legacy `docker-compose`.
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
else
  DC=(docker-compose)
fi

case "${1:-}" in
  --build)
    echo "▶ Rebuilding image and bringing up the dev server…"
    "${DC[@]}" -f "${COMPOSE_FILE}" up -d --build
    ;;
  "")
    echo "▶ Bringing up the dev server…"
    "${DC[@]}" -f "${COMPOSE_FILE}" up -d
    ;;
  *)
    echo "Unknown option: $1" >&2
    echo "Usage: $0 [--build]" >&2
    exit 2
    ;;
esac

echo "✅ Dev server is up at http://localhost:4200  (first cold compile can take ~30-90s)."
echo "   Follow logs with: docker compose logs -f web"
"${DC[@]}" -f "${COMPOSE_FILE}" ps
