#!/bin/sh
# Copyright (c) 2024-2026 Perpetuator LLC
#
# Container entrypoint.
#
# Two operating modes — choose ONE per deployment:
#
#  1. Direct env vars (self-hosting, dev, k8s with external secret operator):
#       Pass CC_FE_* env vars directly (-e flags, env_file, ConfigMap, etc.).
#       Entrypoint validates them and starts the server.
#
#  2. OpenBao/Vault fetch (production with HashiCorp Vault or OpenBao):
#       Set VAULT_ADDR and VAULT_PATH. Authenticate via any ONE of:
#         a. VAULT_TOKEN env var (e.g. injected by vault-agent sidecar)
#         b. VAULT_ROLE_ID + VAULT_SECRET_ID env vars (AppRole login —
#            CI/Gitea-secrets pattern; preferred when /etc/vault can't
#            be mounted, e.g. Docker-in-Docker runners)
#         c. AppRole files mounted at /etc/vault/vault-role-id and
#            /etc/vault/vault-secret-id (legacy; works when the host
#            can bind-mount its AppRole creds read-only into the
#            container — does not work inside DinD)
#       Lookup order is a → b → c. Entrypoint exchanges to a short-lived
#       token, fetches the secret payload, exports values as CC_FE_*,
#       revokes the token (best-effort), and execs the server. The
#       secrets never touch disk inside or outside the container.
#
# Mode 2 wins when both are set — Vault values overwrite any direct env vars.

set -e

ROLE_ID_FILE="${ROLE_ID_FILE:-/etc/vault/vault-role-id}"
SECRET_ID_FILE="${SECRET_ID_FILE:-/etc/vault/vault-secret-id}"

# ---- Mode 2: fetch from Vault/OpenBao --------------------------------------
if [ -n "${VAULT_ADDR:-}" ] && [ -n "${VAULT_PATH:-}" ]; then
  echo "[entrypoint] Fetching runtime config from ${VAULT_ADDR}/${VAULT_PATH}"

  # Get a token from the first available source:
  #   a. VAULT_TOKEN  (use as-is)
  #   b. VAULT_ROLE_ID + VAULT_SECRET_ID env vars  (AppRole login)
  #   c. AppRole files at $ROLE_ID_FILE / $SECRET_ID_FILE  (legacy, fails in DinD)
  if [ -z "${VAULT_TOKEN:-}" ]; then
    if [ -n "${VAULT_ROLE_ID:-}" ] && [ -n "${VAULT_SECRET_ID:-}" ]; then
      _role_id="$VAULT_ROLE_ID"
      _secret_id="$VAULT_SECRET_ID"
    elif [ -f "$ROLE_ID_FILE" ] && [ -f "$SECRET_ID_FILE" ]; then
      _role_id=$(cat "$ROLE_ID_FILE")
      _secret_id=$(cat "$SECRET_ID_FILE")
    else
      echo "[entrypoint] ERROR: VAULT_ADDR set but no auth available." >&2
      echo "[entrypoint] Provide one of:" >&2
      echo "[entrypoint]   - VAULT_TOKEN env var" >&2
      echo "[entrypoint]   - VAULT_ROLE_ID + VAULT_SECRET_ID env vars (AppRole)" >&2
      echo "[entrypoint]   - AppRole files at $ROLE_ID_FILE and $SECRET_ID_FILE" >&2
      exit 1
    fi

    VAULT_TOKEN=$(curl -sf "$VAULT_ADDR/v1/auth/approle/login" \
      -H 'Content-Type: application/json' \
      -d "$(printf '{"role_id":"%s","secret_id":"%s"}' "$_role_id" "$_secret_id")" \
      | jq -r '.auth.client_token') || {
        echo "[entrypoint] ERROR: AppRole login failed against $VAULT_ADDR" >&2
        unset _role_id _secret_id
        exit 1
      }
    unset _role_id _secret_id
  fi

  if [ -z "${VAULT_TOKEN:-}" ] || [ "$VAULT_TOKEN" = "null" ]; then
    echo "[entrypoint] ERROR: Could not obtain a vault token." >&2
    exit 1
  fi

  # Fetch the secret payload (KV v2 → .data.data.<key>)
  _payload=$(curl -sf -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/$VAULT_PATH") || {
      echo "[entrypoint] ERROR: Failed to read $VAULT_PATH" >&2
      curl -sf -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
        "$VAULT_ADDR/v1/auth/token/revoke-self" >/dev/null 2>&1 || true
      exit 1
    }

  # Export each value. Use a single jq pass to minimize the time secrets
  # live in shell variables.
  _data=$(echo "$_payload" | jq -r '.data.data')
  export CC_FE_API_URL=$(echo "$_data" | jq -r '.api_url // empty')
  export CC_FE_SITE_URL=$(echo "$_data" | jq -r '.site_url // empty')
  export CC_FE_OAUTH_ISSUER=$(echo "$_data" | jq -r '.oauth_issuer // empty')
  export CC_FE_OAUTH_CLIENT_ID=$(echo "$_data" | jq -r '.oauth_client_id // empty')
  export CC_FE_OAUTH_SCOPES=$(echo "$_data" | jq -r '.oauth_scopes // "read write"')
  export CC_FE_STRIPE_PUBLIC_KEY=$(echo "$_data" | jq -r '.stripe_public_key // empty')
  export CC_FE_PRODUCTION=${CC_FE_PRODUCTION:-true}

  # Revoke the short-lived token so it doesn't outlive its single use.
  # Best-effort — failure here is logged but doesn't abort the deploy.
  curl -sf -X POST -H "X-Vault-Token: $VAULT_TOKEN" \
    "$VAULT_ADDR/v1/auth/token/revoke-self" >/dev/null 2>&1 \
    || echo "[entrypoint] Warning: failed to revoke vault token (continuing)" >&2

  unset VAULT_TOKEN _payload _data
  echo "[entrypoint] Loaded runtime config from Vault."
fi

# ---- Validate (Mode 1 reaches here without fetching from Vault) -----------
: "${CC_FE_API_URL:?Error: CC_FE_API_URL is required. Set it directly or via VAULT_ADDR+VAULT_PATH.}"
: "${CC_FE_SITE_URL:?Error: CC_FE_SITE_URL is required. Set it directly or via VAULT_ADDR+VAULT_PATH.}"

# Soft warnings — these are required for full functionality but not for boot.
[ -z "${CC_FE_OAUTH_ISSUER:-}" ] && \
  echo "[entrypoint] Warning: CC_FE_OAUTH_ISSUER is empty. OAuth login will not work." >&2
[ -z "${CC_FE_OAUTH_CLIENT_ID:-}" ] && \
  echo "[entrypoint] Warning: CC_FE_OAUTH_CLIENT_ID is empty. OAuth login will not work." >&2
[ -z "${CC_FE_STRIPE_PUBLIC_KEY:-}" ] && \
  echo "[entrypoint] Warning: CC_FE_STRIPE_PUBLIC_KEY is empty. Payment flows will not work." >&2

echo "[entrypoint] Starting cc-fe with API_URL=${CC_FE_API_URL}, SITE_URL=${CC_FE_SITE_URL}"

exec "$@"
