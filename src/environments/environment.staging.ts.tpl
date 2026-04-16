// Copyright (c) 2025-2026 Perpetuator LLC
//
// TEMPLATE — Do not edit directly.
// Generated at build time by scripts/generate-env-from-vault.sh
// OpenBao path: secret/services/cc-fe/staging
//
export const environment = {
  production: true,
  API_URL: '${CC_FE_API_URL}',
  SITE_URL: '${CC_FE_SITE_URL}',
  STRIPE_PUBLIC_KEY: '${CC_FE_STRIPE_PUBLIC_KEY}',

  // OAuth2 Configuration
  OAUTH_ISSUER: '${CC_FE_OAUTH_ISSUER}',
  OAUTH_CLIENT_ID: '${CC_FE_OAUTH_CLIENT_ID}',
  OAUTH_SCOPES: '${CC_FE_OAUTH_SCOPES}',

  // No test credentials in staging
  TEST_EMAIL: '',
  TEST_PASSWORD: '',
};
