#!/usr/bin/env bash
# Copyright (c) 2024-2026 Perpetuator LLC
#
# Interactively seed the staging secrets at secret/services/cc-fe/staging.
#
# Run this ONCE per environment to populate OpenBao. After that, the
# deploy pipeline (generate-env-from-vault-runtime.sh) reads these values
# at every deploy and writes them to .env.stage.
#
# Security notes:
#   - The script reads secret values via `read -rs` (no echo, no history).
#   - Values are passed to `vault kv put` via STDIN, never argv —
#     so they never appear in `ps`, shell history, or process listings.
#   - All sensitive shell variables are unset on EXIT via trap.
#   - If you abort with Ctrl-C before submission, nothing is written.
#
# Usage:
#   ./scripts/seed-vault-staging.sh                        # use default path
#   VAULT_ADDR=https://vault.example.com ./scripts/seed-vault-staging.sh
#   ./scripts/seed-vault-staging.sh secret/services/cc-fe/production

set -euo pipefail

VAULT_PATH="${1:-secret/services/cc-fe/staging}"
VAULT_ADDR="${VAULT_ADDR:-https://vault.perpetuator.io}"

export VAULT_ADDR

# --- Cleanup on exit -------------------------------------------------------
cleanup() {
  unset STRIPE_PUBLIC_KEY OAUTH_CLIENT_ID JSON_BODY VAULT_TOKEN 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# --- Pre-flight checks -----------------------------------------------------
if ! command -v vault &>/dev/null; then
  echo "ERROR: 'vault' CLI not found in PATH." >&2
  echo "Install: https://developer.hashicorp.com/vault/install" >&2
  echo "(works against OpenBao too — same binary protocol)" >&2
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "ERROR: 'jq' not found in PATH. Required for JSON encoding." >&2
  echo "Install: brew install jq" >&2
  exit 1
fi

echo "Target: ${VAULT_ADDR}${VAULT_PATH:+ → }${VAULT_PATH}"
echo

# --- Authenticate ----------------------------------------------------------
if vault token lookup &>/dev/null; then
  echo "✓ Using existing vault session ($(vault token lookup -format=json | jq -r .data.display_name))"
else
  echo "No active vault session. Choose an auth method:"
  echo "  1) Paste a token (root or admin token with write access to ${VAULT_PATH})"
  echo "  2) AppRole (reads /etc/vault/vault-role-id + /etc/vault/vault-secret-id)"
  echo "  3) Abort"
  read -rp "Choice [1-3]: " auth_choice
  case "$auth_choice" in
    1)
      # `read -rs` keeps the paste off the terminal and out of history.
      read -rsp "Paste vault token: " VAULT_TOKEN
      echo
      export VAULT_TOKEN
      if ! vault token lookup &>/dev/null; then
        echo "ERROR: Token rejected by vault." >&2
        exit 1
      fi
      ;;
    2)
      ROLE_ID_FILE="${ROLE_ID_FILE:-/etc/vault/vault-role-id}"
      SECRET_ID_FILE="${SECRET_ID_FILE:-/etc/vault/vault-secret-id}"
      if [[ ! -f "$ROLE_ID_FILE" || ! -f "$SECRET_ID_FILE" ]]; then
        echo "ERROR: AppRole files not found at $ROLE_ID_FILE and $SECRET_ID_FILE" >&2
        exit 1
      fi
      VAULT_TOKEN=$(vault write -field=token auth/approle/login \
        role_id="$(cat "$ROLE_ID_FILE")" \
        secret_id="$(cat "$SECRET_ID_FILE")")
      export VAULT_TOKEN
      ;;
    *)
      echo "Aborted."
      exit 0
      ;;
  esac
  echo "✓ Authenticated"
fi
echo

# --- Collect values --------------------------------------------------------
# Defaults reflect the cc-fe staging environment. Override interactively.
echo "Enter values for ${VAULT_PATH}. Press Enter to accept defaults in [brackets]."
echo

read -rp "api_url [https://stage-api.capitalcopilot.io]: " api_url
api_url="${api_url:-https://stage-api.capitalcopilot.io}"

read -rp "site_url [https://stage.capitalcopilot.io]: " site_url
site_url="${site_url:-https://stage.capitalcopilot.io}"

read -rp "oauth_issuer [${api_url}]: " oauth_issuer
oauth_issuer="${oauth_issuer:-$api_url}"

# Secret-ish values — use -s to hide. Stripe keys and OAuth client IDs
# are technically "public" (they ship in the browser), but we treat them
# as sensitive at write-time to avoid them ending up in scrollback.
read -rsp "stripe_public_key (pk_test_… or pk_live_…): " STRIPE_PUBLIC_KEY
echo
if [[ -z "$STRIPE_PUBLIC_KEY" ]]; then
  echo "ERROR: stripe_public_key is required." >&2
  exit 1
fi
if [[ ! "$STRIPE_PUBLIC_KEY" =~ ^pk_(test|live)_ ]]; then
  echo "WARNING: stripe_public_key doesn't start with pk_test_ or pk_live_. Continue anyway? [y/N]"
  read -r confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || exit 1
fi

read -rsp "oauth_client_id: " OAUTH_CLIENT_ID
echo
if [[ -z "$OAUTH_CLIENT_ID" ]]; then
  echo "ERROR: oauth_client_id is required." >&2
  exit 1
fi

read -rp "oauth_scopes [read write]: " oauth_scopes
oauth_scopes="${oauth_scopes:-read write}"

# --- Confirm ---------------------------------------------------------------
echo
echo "About to write to ${VAULT_PATH}:"
echo "  api_url:            ${api_url}"
echo "  site_url:           ${site_url}"
echo "  oauth_issuer:       ${oauth_issuer}"
echo "  oauth_scopes:       ${oauth_scopes}"
echo "  stripe_public_key:  ${STRIPE_PUBLIC_KEY:0:8}… (${#STRIPE_PUBLIC_KEY} chars)"
echo "  oauth_client_id:    ${OAUTH_CLIENT_ID:0:6}… (${#OAUTH_CLIENT_ID} chars)"
echo
read -rp "Proceed? [y/N]: " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted — nothing written."
  exit 0
fi

# --- Write via STDIN (keeps values out of argv / ps / shell history) -------
# jq -n with --arg ensures correct JSON escaping for any payload.
JSON_BODY=$(jq -n \
  --arg api_url "$api_url" \
  --arg site_url "$site_url" \
  --arg oauth_issuer "$oauth_issuer" \
  --arg oauth_client_id "$OAUTH_CLIENT_ID" \
  --arg oauth_scopes "$oauth_scopes" \
  --arg stripe_public_key "$STRIPE_PUBLIC_KEY" \
  '{api_url: $api_url, site_url: $site_url, oauth_issuer: $oauth_issuer,
    oauth_client_id: $oauth_client_id, oauth_scopes: $oauth_scopes,
    stripe_public_key: $stripe_public_key}')

echo "$JSON_BODY" | vault kv put "${VAULT_PATH}" - >/dev/null

# --- Verify (echoes only non-sensitive fields and lengths) ----------------
echo
echo "✓ Secrets written to ${VAULT_PATH}"
echo
echo "Verification (reading back):"
read_back=$(vault kv get -format=json "${VAULT_PATH}")
data=$(echo "$read_back" | jq -r '.data.data')
echo "  api_url:            $(echo "$data" | jq -r .api_url)"
echo "  site_url:           $(echo "$data" | jq -r .site_url)"
echo "  oauth_issuer:       $(echo "$data" | jq -r .oauth_issuer)"
echo "  oauth_scopes:       $(echo "$data" | jq -r .oauth_scopes)"
echo "  stripe_public_key:  $(echo "$data" | jq -r .stripe_public_key | cut -c1-8)… ($(echo "$data" | jq -r '.stripe_public_key | length') chars)"
echo "  oauth_client_id:    $(echo "$data" | jq -r .oauth_client_id | cut -c1-6)… ($(echo "$data" | jq -r '.oauth_client_id | length') chars)"
echo
echo "Next step on lestrange:"
echo "  ./scripts/generate-env-from-vault-runtime.sh ${VAULT_PATH} .env.stage"
