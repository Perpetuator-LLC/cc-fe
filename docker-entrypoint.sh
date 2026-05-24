#!/bin/sh
# Copyright (c) 2024-2026 Perpetuator LLC
#
# Container entrypoint. Validates that required runtime configuration is set
# before starting the SSR server. Fails fast with a clear error if a deploy
# forgets to inject configuration — better than serving with placeholder URLs.

set -e

# --- Required ---
: "${CC_FE_API_URL:?Error: CC_FE_API_URL is required. Set it to your backend API URL (e.g. https://api.example.com).}"
: "${CC_FE_SITE_URL:?Error: CC_FE_SITE_URL is required. Set it to the public frontend URL (e.g. https://example.com).}"

# --- Optional with warnings ---
if [ -z "${CC_FE_OAUTH_ISSUER:-}" ]; then
  echo "[entrypoint] Warning: CC_FE_OAUTH_ISSUER is empty. OAuth login will not work." >&2
fi
if [ -z "${CC_FE_OAUTH_CLIENT_ID:-}" ]; then
  echo "[entrypoint] Warning: CC_FE_OAUTH_CLIENT_ID is empty. OAuth login will not work." >&2
fi
if [ -z "${CC_FE_STRIPE_PUBLIC_KEY:-}" ]; then
  echo "[entrypoint] Warning: CC_FE_STRIPE_PUBLIC_KEY is empty. Payment flows will not work." >&2
fi

echo "[entrypoint] Starting cc-fe with API_URL=${CC_FE_API_URL}, SITE_URL=${CC_FE_SITE_URL}"

exec "$@"
