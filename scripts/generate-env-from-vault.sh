#!/usr/bin/env bash
# Copyright (c) 2024-2026 Perpetuator LLC
#
# Generate environment.staging.ts from OpenBao secrets.
# Usage: ./scripts/generate-env-from-vault.sh [vault_path]
#
# Prerequisites:
#   - vault CLI installed
#   - VAULT_ADDR set (default: https://vault.perpetuator.io)
#   - Authenticated via AppRole or token
#
# OpenBao KV v2 path: secret/services/cc-fe/staging

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEMPLATE="${PROJECT_ROOT}/src/environments/environment.staging.ts.tpl"
OUTPUT="${PROJECT_ROOT}/src/environments/environment.staging.ts"

VAULT_PATH="${1:-secret/services/cc-fe/staging}"
VAULT_ADDR="${VAULT_ADDR:-https://vault.perpetuator.io}"

export VAULT_ADDR

# --- Auth via AppRole if not already authenticated ---
if ! vault token lookup &>/dev/null; then
  ROLE_ID_FILE="${ROLE_ID_FILE:-/etc/vault/vault-role-id}"
  SECRET_ID_FILE="${SECRET_ID_FILE:-/etc/vault/vault-secret-id}"

  if [[ -f "${ROLE_ID_FILE}" && -f "${SECRET_ID_FILE}" ]]; then
    echo "Authenticating to OpenBao via AppRole..."
    VAULT_TOKEN=$(vault write -field=token auth/approle/login \
      role_id="$(cat "${ROLE_ID_FILE}")" \
      secret_id="$(cat "${SECRET_ID_FILE}")")
    export VAULT_TOKEN
  else
    echo "ERROR: Not authenticated and AppRole files not found at:"
    echo "  ${ROLE_ID_FILE}"
    echo "  ${SECRET_ID_FILE}"
    echo "Set VAULT_TOKEN or provide AppRole credential files."
    exit 1
  fi
fi

# --- Fetch secrets from OpenBao ---
echo "Fetching secrets from ${VAULT_PATH}..."
SECRETS_JSON=$(vault kv get -format=json "${VAULT_PATH}" 2>/dev/null) || {
  echo "ERROR: Failed to read secrets from ${VAULT_PATH}"
  echo "Ensure the path exists and the token has read access."
  echo ""
  echo "To seed the secrets, run:"
  echo "  vault kv put ${VAULT_PATH} \\"
  echo "    api_url=https://stage-api.capitalcopilot.io \\"
  echo "    site_url=https://stage.capitalcopilot.io \\"
  echo "    stripe_public_key=pk_test_xxx \\"
  echo "    oauth_issuer=https://stage-api.capitalcopilot.io \\"
  echo "    oauth_client_id=YOUR_CLIENT_ID \\"
  echo "    oauth_scopes='read write'"
  exit 1
}

# --- Extract values ---
extract() {
  echo "${SECRETS_JSON}" | jq -r ".data.data.${1} // empty"
}

CC_FE_API_URL=$(extract api_url)
CC_FE_SITE_URL=$(extract site_url)
CC_FE_STRIPE_PUBLIC_KEY=$(extract stripe_public_key)
CC_FE_OAUTH_ISSUER=$(extract oauth_issuer)
CC_FE_OAUTH_CLIENT_ID=$(extract oauth_client_id)
CC_FE_OAUTH_SCOPES=$(extract oauth_scopes)

# --- Validate required values ---
MISSING=()
[[ -z "${CC_FE_API_URL}" ]] && MISSING+=(api_url)
[[ -z "${CC_FE_SITE_URL}" ]] && MISSING+=(site_url)
[[ -z "${CC_FE_STRIPE_PUBLIC_KEY}" ]] && MISSING+=(stripe_public_key)
[[ -z "${CC_FE_OAUTH_ISSUER}" ]] && MISSING+=(oauth_issuer)
[[ -z "${CC_FE_OAUTH_CLIENT_ID}" ]] && MISSING+=(oauth_client_id)

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "ERROR: Missing required secrets: ${MISSING[*]}"
  exit 1
fi

# Default oauth_scopes if not set
CC_FE_OAUTH_SCOPES="${CC_FE_OAUTH_SCOPES:-read write}"

# --- Generate environment file from template ---
export CC_FE_API_URL CC_FE_SITE_URL CC_FE_STRIPE_PUBLIC_KEY
export CC_FE_OAUTH_ISSUER CC_FE_OAUTH_CLIENT_ID CC_FE_OAUTH_SCOPES

envsubst < "${TEMPLATE}" > "${OUTPUT}"

echo "Generated ${OUTPUT} from OpenBao (${VAULT_PATH})"
echo "  API_URL:     ${CC_FE_API_URL}"
echo "  SITE_URL:    ${CC_FE_SITE_URL}"
echo "  OAUTH_ISSUER: ${CC_FE_OAUTH_ISSUER}"
echo "  STRIPE_KEY:  ${CC_FE_STRIPE_PUBLIC_KEY:0:20}..."
echo "  CLIENT_ID:   ${CC_FE_OAUTH_CLIENT_ID:0:10}..."
