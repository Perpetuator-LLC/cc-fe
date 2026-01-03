#!/usr/bin/env npx ts-node
// Copyright (c) 2025-2026 Perpetuator LLC
/**
 * Token Management Utility for CLI Scripts
 *
 * This module provides OAuth2 token management that mirrors the frontend logic.
 * - Reads credentials from environment.ts (not hardcoded)
 * - Stores tokens securely with proper file permissions
 * - Handles token refresh and rotation
 * - Shares logic patterns with frontend TokenStorageService
 *
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Read environment from the Angular environment file
interface Environment {
  API_URL: string;
  OAUTH_ISSUER: string;
  OAUTH_CLIENT_ID: string;
  OAUTH_SCOPES: string;
  TEST_EMAIL?: string;
  TEST_PASSWORD?: string;
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  scope: string;
  refreshTokenCreatedAt: number; // Track refresh token age for rotation
}

interface OAuth2TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

// Token storage location - in user's home directory with restricted permissions
const TOKEN_DIR = path.join(os.homedir(), '.capital-copilot');
const TOKEN_FILE = path.join(TOKEN_DIR, 'cli-tokens.json');

// Refresh token rotation interval (24 hours in milliseconds)
const REFRESH_TOKEN_ROTATION_INTERVAL = 24 * 60 * 60 * 1000;

// Access token expiry buffer (refresh 5 minutes before expiry)
const ACCESS_TOKEN_BUFFER = 5 * 60 * 1000;

/**
 * Parse environment.ts to extract configuration
 */
export function loadEnvironment(): Environment {
  const envPath = path.join(__dirname, '../../src/environments/environment.ts');

  if (!fs.existsSync(envPath)) {
    throw new Error(`Environment file not found: ${envPath}`);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');

  // Process line by line to skip commented lines
  const extract = (key: string): string | undefined => {
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

  const apiUrl = extract('API_URL');
  const oauthIssuer = extract('OAUTH_ISSUER') || apiUrl;
  const oauthClientId = extract('OAUTH_CLIENT_ID');
  const oauthScopes = extract('OAUTH_SCOPES') || 'read write';
  const testEmail = extract('TEST_EMAIL');
  const testPassword = extract('TEST_PASSWORD');

  if (!apiUrl || !oauthClientId) {
    throw new Error('Required environment variables not found in environment.ts');
  }

  return {
    API_URL: apiUrl,
    OAUTH_ISSUER: oauthIssuer!,
    OAUTH_CLIENT_ID: oauthClientId,
    OAUTH_SCOPES: oauthScopes,
    TEST_EMAIL: testEmail,
    TEST_PASSWORD: testPassword,
  };
}

/**
 * Ensure token directory exists with proper permissions
 */
function ensureTokenDir(): void {
  if (!fs.existsSync(TOKEN_DIR)) {
    fs.mkdirSync(TOKEN_DIR, { mode: 0o700 });
  }
}

/**
 * Load stored tokens from secure file
 */
function loadStoredTokens(): StoredTokens | null {
  if (!fs.existsSync(TOKEN_FILE)) {
    return null;
  }

  try {
    const content = fs.readFileSync(TOKEN_FILE, 'utf-8');
    return JSON.parse(content) as StoredTokens;
  } catch (error) {
    console.error('Failed to load stored tokens:', error);
    return null;
  }
}

/**
 * Save tokens to secure file with restricted permissions
 */
function saveTokens(tokens: StoredTokens): void {
  ensureTokenDir();
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

/**
 * Clear stored tokens
 */
export function clearTokens(): void {
  if (fs.existsSync(TOKEN_FILE)) {
    fs.unlinkSync(TOKEN_FILE);
  }
}

/**
 * Check if access token is expired or will expire soon
 */
function isAccessTokenExpired(tokens: StoredTokens): boolean {
  return Date.now() >= tokens.expiresAt - ACCESS_TOKEN_BUFFER;
}

/**
 * Check if refresh token should be rotated (older than 24 hours)
 */
function shouldRotateRefreshToken(tokens: StoredTokens): boolean {
  const age = Date.now() - tokens.refreshTokenCreatedAt;
  return age > REFRESH_TOKEN_ROTATION_INTERVAL;
}

/**
 * Login with password grant and get new tokens
 */
async function loginWithPassword(env: Environment): Promise<StoredTokens> {
  if (!env.TEST_EMAIL || !env.TEST_PASSWORD) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD must be set in environment.ts');
  }

  console.log(`[TokenManager] Logging in as ${env.TEST_EMAIL}...`);

  const body = new URLSearchParams({
    grant_type: 'password',
    username: env.TEST_EMAIL,
    password: env.TEST_PASSWORD,
    client_id: env.OAUTH_CLIENT_ID,
    scope: env.OAUTH_SCOPES,
  });

  const response = await fetch(`${env.OAUTH_ISSUER}/o/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Login failed: ${error.error_description || error.error || response.statusText}`);
  }

  const data: OAuth2TokenResponse = await response.json();

  const tokens: StoredTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    tokenType: data.token_type,
    scope: data.scope,
    refreshTokenCreatedAt: Date.now(),
  };

  saveTokens(tokens);
  console.log(`[TokenManager] Login successful. Token expires at ${new Date(tokens.expiresAt).toISOString()}`);

  return tokens;
}

/**
 * Refresh access token using refresh token
 * This also rotates the refresh token (backend returns new refresh token)
 */
async function refreshAccessToken(env: Environment, refreshToken: string): Promise<StoredTokens> {
  console.log('[TokenManager] Refreshing access token...');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: env.OAUTH_CLIENT_ID,
  });

  const response = await fetch(`${env.OAUTH_ISSUER}/o/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Token refresh failed: ${error.error_description || error.error || response.statusText}`);
  }

  const data: OAuth2TokenResponse = await response.json();

  // Get existing tokens to preserve refreshTokenCreatedAt if not rotating
  const existingTokens = loadStoredTokens();
  const isNewRefreshToken = data.refresh_token !== refreshToken;

  const tokens: StoredTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    tokenType: data.token_type,
    scope: data.scope,
    // Update refreshTokenCreatedAt if refresh token was rotated
    refreshTokenCreatedAt: isNewRefreshToken ? Date.now() : existingTokens?.refreshTokenCreatedAt || Date.now(),
  };

  saveTokens(tokens);

  if (isNewRefreshToken) {
    console.log('[TokenManager] Refresh token rotated.');
  }
  console.log(`[TokenManager] Token refreshed. New expiry: ${new Date(tokens.expiresAt).toISOString()}`);

  return tokens;
}

/**
 * Get a valid access token
 *
 * This is the main entry point for scripts to get an access token.
 * It handles:
 * 1. Loading stored tokens
 * 2. Refreshing expired access tokens
 * 3. Rotating refresh tokens if older than 24 hours
 * 4. Logging in if no valid tokens exist
 */
export async function getAccessToken(): Promise<string> {
  const env = loadEnvironment();
  let tokens = loadStoredTokens();

  // Case 1: No stored tokens - need to login
  if (!tokens) {
    tokens = await loginWithPassword(env);
    return tokens.accessToken;
  }

  // Case 2: Access token is still valid
  if (!isAccessTokenExpired(tokens)) {
    // Check if we should proactively rotate refresh token
    if (shouldRotateRefreshToken(tokens)) {
      console.log('[TokenManager] Refresh token is older than 24h, rotating...');
      try {
        tokens = await refreshAccessToken(env, tokens.refreshToken);
      } catch (error) {
        console.warn('[TokenManager] Proactive rotation failed, will retry on next call:', error);
        // Continue with existing valid access token
      }
    }
    return tokens.accessToken;
  }

  // Case 3: Access token expired, try to refresh
  console.log('[TokenManager] Access token expired, attempting refresh...');
  try {
    tokens = await refreshAccessToken(env, tokens.refreshToken);
    return tokens.accessToken;
  } catch (error) {
    console.error('[TokenManager] Token refresh failed:', error);

    // Refresh failed (token revoked, expired, etc.) - need to re-login
    console.log('[TokenManager] Attempting fresh login...');
    clearTokens();
    tokens = await loginWithPassword(env);
    return tokens.accessToken;
  }
}

/**
 * Get token info for debugging
 */
export function getTokenInfo(): { expiresAt: Date; refreshTokenAge: string; isExpired: boolean } | null {
  const tokens = loadStoredTokens();
  if (!tokens) {
    return null;
  }

  const refreshAge = Date.now() - tokens.refreshTokenCreatedAt;
  const hours = Math.floor(refreshAge / (60 * 60 * 1000));
  const minutes = Math.floor((refreshAge % (60 * 60 * 1000)) / (60 * 1000));

  return {
    expiresAt: new Date(tokens.expiresAt),
    refreshTokenAge: `${hours}h ${minutes}m`,
    isExpired: isAccessTokenExpired(tokens),
  };
}

// CLI interface for testing
if (require.main === module) {
  const command = process.argv[2];

  (async () => {
    try {
      switch (command) {
        case 'login': {
          const env = loadEnvironment();
          await loginWithPassword(env);
          console.log('Login successful!');
          break;
        }

        case 'token': {
          const token = await getAccessToken();
          console.log('Access Token:', token.substring(0, 20) + '...');
          break;
        }

        case 'info': {
          const info = getTokenInfo();
          if (info) {
            console.log('Token expires at:', info.expiresAt.toISOString());
            console.log('Refresh token age:', info.refreshTokenAge);
            console.log('Is expired:', info.isExpired);
          } else {
            console.log('No stored tokens');
          }
          break;
        }

        case 'clear':
          clearTokens();
          console.log('Tokens cleared');
          break;

        default:
          console.log('Usage: npx ts-node scripts/lib/token-manager.ts [login|token|info|clear]');
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  })();
}
