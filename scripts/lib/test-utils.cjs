#!/usr/bin/env node
/**
 * Shared authentication and API utilities for test scripts
 *
 * Usage:
 *   const { getAccessToken, graphqlQuery, loadEnvironment } = require('./lib/test-utils.cjs');
 *
 * Features:
 *   - Token caching in ~/.capital-copilot/cli-tokens.json
 *   - Automatic token refresh
 *   - GraphQL query helper with authentication
 *   - Environment loading from environment.ts
 *
 * Copyright (c) 2025-2026 Perpetuator LLC
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Token management paths
const TOKEN_DIR = path.join(os.homedir(), '.capital-copilot');
const TOKEN_FILE = path.join(TOKEN_DIR, 'cli-tokens.json');
const REFRESH_TOKEN_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const ACCESS_TOKEN_BUFFER = 5 * 60 * 1000; // 5 minutes buffer before expiry

/**
 * Load environment configuration from environment.ts
 */
function loadEnvironment() {
  const envPath = path.join(__dirname, '../../src/environments/environment.ts');
  if (!fs.existsSync(envPath)) {
    throw new Error(`Environment file not found: ${envPath}`);
  }
  const envContent = fs.readFileSync(envPath, 'utf-8');

  // Process line by line to skip commented lines
  const extract = (key) => {
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip commented lines
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        continue;
      }
      const match = line.match(new RegExp(`${key}:\\s*['"]([^'"]+)['"]`));
      if (match) {
        return match[1];
      }
    }
    return undefined;
  };

  return {
    API_URL: extract('API_URL') || 'http://localhost:8000',
    API_BASE_URL: extract('API_BASE_URL') || extract('API_URL') || 'http://localhost:8000',
    OAUTH_ISSUER: extract('OAUTH_ISSUER') || extract('API_URL') || 'http://localhost:8000',
    OAUTH_CLIENT_ID: extract('OAUTH_CLIENT_ID'),
    OAUTH_SCOPES: extract('OAUTH_SCOPES') || 'read write',
    TEST_EMAIL: extract('TEST_EMAIL'),
    TEST_PASSWORD: extract('TEST_PASSWORD'),
  };
}

/**
 * Ensure token directory exists
 */
function ensureTokenDir() {
  if (!fs.existsSync(TOKEN_DIR)) {
    fs.mkdirSync(TOKEN_DIR, { mode: 0o700 });
  }
}

/**
 * Load stored tokens from disk
 */
function loadStoredTokens() {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Save tokens to disk with secure permissions
 */
function saveTokens(tokens) {
  ensureTokenDir();
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

/**
 * Check if access token is expired (with buffer)
 */
function isAccessTokenExpired(tokens) {
  return Date.now() >= tokens.expiresAt - ACCESS_TOKEN_BUFFER;
}

/**
 * Check if refresh token should be rotated
 */
function shouldRotateRefreshToken(tokens) {
  return Date.now() - tokens.refreshTokenCreatedAt > REFRESH_TOKEN_ROTATION_INTERVAL;
}

/**
 * Login with username/password
 */
async function loginWithPassword(env) {
  if (!env.TEST_EMAIL || !env.TEST_PASSWORD) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD must be set in environment.ts');
  }

  console.log(`[Auth] Logging in as ${env.TEST_EMAIL}...`);

  const body = new URLSearchParams({
    grant_type: 'password',
    username: env.TEST_EMAIL,
    password: env.TEST_PASSWORD,
    client_id: env.OAUTH_CLIENT_ID,
    scope: env.OAUTH_SCOPES,
  });

  const response = await fetch(`${env.OAUTH_ISSUER}/o/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Login failed: ${error.error_description || error.error || response.statusText}`);
  }

  const data = await response.json();
  const tokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    tokenType: data.token_type,
    scope: data.scope,
    refreshTokenCreatedAt: Date.now(),
  };

  saveTokens(tokens);
  console.log(`[Auth] Login successful.`);
  return tokens;
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(env, refreshToken) {
  console.log('[Auth] Refreshing token...');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: env.OAUTH_CLIENT_ID,
  });

  const response = await fetch(`${env.OAUTH_ISSUER}/o/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Refresh failed: ${response.statusText}`);
  }

  const data = await response.json();
  const existing = loadStoredTokens();

  const tokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    tokenType: data.token_type,
    scope: data.scope,
    refreshTokenCreatedAt:
      data.refresh_token !== refreshToken ? Date.now() : existing?.refreshTokenCreatedAt || Date.now(),
  };

  saveTokens(tokens);
  console.log('[Auth] Token refreshed.');
  return tokens;
}

/**
 * Get a valid access token (cached, refreshed, or new login)
 */
async function getAccessToken() {
  const env = loadEnvironment();
  let tokens = loadStoredTokens();

  // No stored tokens - login fresh
  if (!tokens) {
    tokens = await loginWithPassword(env);
    return tokens.accessToken;
  }

  // Token still valid
  if (!isAccessTokenExpired(tokens)) {
    // Optionally rotate refresh token if old
    if (shouldRotateRefreshToken(tokens)) {
      try {
        tokens = await refreshAccessToken(env, tokens.refreshToken);
      } catch (e) {
        console.warn('[Auth] Rotation failed:', e.message);
      }
    }
    return tokens.accessToken;
  }

  // Token expired - try refresh
  try {
    tokens = await refreshAccessToken(env, tokens.refreshToken);
    return tokens.accessToken;
  } catch (e) {
    // Refresh failed - login fresh
    console.log('[Auth] Refresh failed, re-logging in...');
    if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
    tokens = await loginWithPassword(env);
    return tokens.accessToken;
  }
}

/**
 * Execute a GraphQL query with authentication
 *
 * @param {string} query - GraphQL query string
 * @param {object} variables - Query variables
 * @param {object} options - Additional options (endpoint, etc.)
 * @returns {Promise<object>} - Query result
 */
async function graphqlQuery(query, variables = {}, options = {}) {
  const env = loadEnvironment();
  const accessToken = await getAccessToken();
  const endpoint = options.endpoint || `${env.API_BASE_URL}/graphql/`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    const errorMessages = result.errors.map((e) => e.message).join(', ');
    throw new Error(`GraphQL Error: ${errorMessages}`);
  }

  return result.data;
}

/**
 * Get token info for debugging
 */
function getTokenInfo() {
  const tokens = loadStoredTokens();
  if (!tokens) return null;

  const age = Date.now() - tokens.refreshTokenCreatedAt;
  const hours = Math.floor(age / (60 * 60 * 1000));
  const minutes = Math.floor((age % (60 * 60 * 1000)) / (60 * 1000));

  return {
    expiresAt: new Date(tokens.expiresAt),
    refreshTokenAge: `${hours}h ${minutes}m`,
    isExpired: isAccessTokenExpired(tokens),
    needsRotation: shouldRotateRefreshToken(tokens),
  };
}

/**
 * Clear stored tokens (force re-login on next request)
 */
function clearTokens() {
  if (fs.existsSync(TOKEN_FILE)) {
    fs.unlinkSync(TOKEN_FILE);
    console.log('[Auth] Tokens cleared.');
  }
}

// Export utilities
module.exports = {
  loadEnvironment,
  getAccessToken,
  graphqlQuery,
  getTokenInfo,
  clearTokens,
  TOKEN_DIR,
  TOKEN_FILE,
};

