#!/usr/bin/env node
/**
 * Reusable GraphQL Query Test Script
 *
 * Usage:
 *   node scripts/test-graphql-query.cjs <query-name>
 *
 * Examples:
 *   node scripts/test-graphql-query.cjs msft-30min
 *   node scripts/test-graphql-query.cjs msft-30min-extended
 *   node scripts/test-graphql-query.cjs msft-daily
 *
 * Copyright (c) 2025-2026 Perpetuator LLC
 */

const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const os = require('os');

const WS_URL = 'ws://127.0.0.1:8000/ws/graphql/';

// Token management
const TOKEN_DIR = path.join(os.homedir(), '.capital-copilot');
const TOKEN_FILE = path.join(TOKEN_DIR, 'cli-tokens.json');
const ACCESS_TOKEN_BUFFER = 5 * 60 * 1000;

function loadEnvironment() {
  const envPath = path.join(__dirname, '../src/environments/environment.ts');
  if (!fs.existsSync(envPath)) {
    throw new Error(`Environment file not found: ${envPath}`);
  }
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const extract = (key) => {
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
      const match = line.match(new RegExp(`${key}:\\s*['"]([^'"]+)['"]`));
      if (match) return match[1];
    }
    return undefined;
  };
  return {
    API_URL: extract('API_URL'),
    OAUTH_ISSUER: extract('OAUTH_ISSUER') || extract('API_URL'),
    OAUTH_CLIENT_ID: extract('OAUTH_CLIENT_ID'),
    OAUTH_SCOPES: extract('OAUTH_SCOPES') || 'read write',
    TEST_EMAIL: extract('TEST_EMAIL'),
    TEST_PASSWORD: extract('TEST_PASSWORD'),
  };
}

function ensureTokenDir() {
  if (!fs.existsSync(TOKEN_DIR)) fs.mkdirSync(TOKEN_DIR, { mode: 0o700 });
}

function loadStoredTokens() {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8')); } catch { return null; }
}

function saveTokens(tokens) {
  ensureTokenDir();
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

function isAccessTokenExpired(tokens) {
  return Date.now() >= tokens.expiresAt - ACCESS_TOKEN_BUFFER;
}

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

async function refreshAccessToken(env, refreshToken) {
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
  if (!response.ok) throw new Error(`Refresh failed: ${response.statusText}`);
  const data = await response.json();
  const existing = loadStoredTokens();
  const tokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    tokenType: data.token_type,
    scope: data.scope,
    refreshTokenCreatedAt: data.refresh_token !== refreshToken ? Date.now() : (existing?.refreshTokenCreatedAt || Date.now()),
  };
  saveTokens(tokens);
  return tokens;
}

async function getAccessToken() {
  const env = loadEnvironment();
  let tokens = loadStoredTokens();
  if (!tokens) {
    tokens = await loginWithPassword(env);
    return tokens.accessToken;
  }
  if (!isAccessTokenExpired(tokens)) return tokens.accessToken;
  try {
    tokens = await refreshAccessToken(env, tokens.refreshToken);
    return tokens.accessToken;
  } catch (e) {
    console.log('[Auth] Refresh failed, re-logging in...');
    if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
    tokens = await loginWithPassword(env);
    return tokens.accessToken;
  }
}

// Predefined queries
const QUERIES = {
  'msft-30min': {
    description: 'MSFT 30min data without extended hours',
    query: `
      query {
        stockPriceConnection(
          symbol: "MSFT"
          interval: MIN_30
          first: 50
          includeExtendedHours: false
        ) {
          edges {
            node {
              date
              open
              high
              low
              close
              isExtendedHours
            }
          }
          totalCount
        }
      }
    `
  },
  'msft-30min-extended': {
    description: 'MSFT 30min data WITH extended hours',
    query: `
      query {
        stockPriceConnection(
          symbol: "MSFT"
          interval: MIN_30
          first: 200
          includeExtendedHours: true
        ) {
          edges {
            node {
              date
              open
              high
              low
              close
              isExtendedHours
            }
          }
          totalCount
        }
      }
    `
  },
  'msft-daily': {
    description: 'MSFT daily data',
    query: `
      query {
        stockPriceConnection(
          symbol: "MSFT"
          interval: DAILY
          first: 30
        ) {
          edges {
            node {
              date
              open
              high
              low
              close
              splitCoefficient
              dividendAmount
            }
          }
          totalCount
        }
      }
    `
  },
  'ma-daily': {
    description: 'MA (Mastercard) daily data for timezone testing',
    query: `
      query {
        stockPriceConnection(
          symbol: "MA"
          interval: DAILY
          first: 10
        ) {
          edges {
            node {
              date
              open
              high
              low
              close
              splitCoefficient
              dividendAmount
            }
          }
          totalCount
        }
      }
    `
  }
};

// Get query name from args
const queryName = process.argv[2] || 'msft-30min';
const queryConfig = QUERIES[queryName];

if (!queryConfig) {
  console.error(`Unknown query: ${queryName}`);
  console.error('Available queries:', Object.keys(QUERIES).join(', '));
  process.exit(1);
}

console.log(`=== GraphQL Query Test: ${queryName} ===`);
console.log(`Description: ${queryConfig.description}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('');

async function runQuery() {
  const accessToken = await getAccessToken();

  const wsUrl = `${WS_URL}?token=${accessToken}`;
  console.log('Connecting to:', wsUrl.replace(accessToken, '***'));

  const ws = new WebSocket(wsUrl, ['graphql-transport-ws']);
  let completed = false;

  ws.on('open', () => {
    console.log('WebSocket connected');
    ws.send(JSON.stringify({
      type: 'connection_init',
      payload: {}
    }));
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    // Debug: log all message types
    console.log(`[MSG] type=${msg.type}, id=${msg.id || 'none'}`);

    if (msg.type === 'connection_ack') {
      console.log('Connection acknowledged, sending query...');
      ws.send(JSON.stringify({
        id: '1',
        type: 'subscribe',
        payload: {
          query: queryConfig.query
        }
      }));
    } else if (msg.type === 'next' && msg.id === '1') {
      // Only process responses for our query (id: '1')
      completed = true;

      if (!msg.payload?.data?.stockPriceConnection) {
        console.log('No stockPriceConnection in response!');
        console.log('Payload keys:', Object.keys(msg.payload?.data || {}));
        ws.close();
        return;
      }

      const edges = msg.payload.data.stockPriceConnection.edges || [];
      const totalCount = msg.payload.data.stockPriceConnection.totalCount;

      console.log('');
      console.log(`Total count in DB: ${totalCount}`);
      console.log(`Edges returned: ${edges.length}`);
      console.log('');

      if (edges.length === 0) {
        console.log('No data returned!');
        ws.close();
        return;
      }

      // Analyze extended hours
      const extendedCount = edges.filter(e => e.node.isExtendedHours === true).length;
      const regularCount = edges.filter(e => e.node.isExtendedHours === false).length;
      console.log(`Extended hours candles: ${extendedCount}`);
      console.log(`Regular hours candles: ${regularCount}`);
      console.log('');

      console.log('First 10 candles (oldest):');
      edges.slice(0, 10).forEach((e, i) => {
        const d = new Date(e.node.date);
        const etTime = d.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        const etDate = d.toLocaleDateString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        const ext = e.node.isExtendedHours ? ' [EXT]' : '';
        console.log(`  ${String(i+1).padStart(2)}. ${etDate} ${etTime} ET${ext}`);
      });

      console.log('');
      console.log('Last 10 candles (newest):');
      const last10 = edges.slice(-10);
      last10.forEach((e, i) => {
        const d = new Date(e.node.date);
        const etTime = d.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        const etDate = d.toLocaleDateString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        const ext = e.node.isExtendedHours ? ' [EXT]' : '';
        console.log(`  ${String(edges.length - 10 + i + 1).padStart(2)}. ${etDate} ${etTime} ET${ext}`);
      });

      // Time analysis
      console.log('');
      console.log('=== Time Analysis ===');
      const newestCandle = edges[edges.length - 1];
      const oldestCandle = edges[0];
      const newestDate = new Date(newestCandle.node.date);
      const oldestDate = new Date(oldestCandle.node.date);

      console.log(`Oldest: ${oldestDate.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);
      console.log(`Newest: ${newestDate.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);

      const now = new Date();
      console.log(`Current time: ${now.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);

      const hoursDiff = (now - newestDate) / (1000 * 60 * 60);
      console.log(`Data age: ${hoursDiff.toFixed(1)} hours old`);

      if (hoursDiff > 24) {
        console.log('⚠️  WARNING: Data is more than 24 hours old!');
      }

      ws.close();
    } else if (msg.type === 'error') {
      console.error('GraphQL Error:', JSON.stringify(msg.payload, null, 2));
      ws.close();
    } else if (msg.type === 'complete') {
      ws.close();
    }
    // Ignore other messages (like jobs.initial)
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
    process.exit(1);
  });

  ws.on('close', () => {
    console.log('');
    console.log('=== Query Complete ===');
    process.exit(completed ? 0 : 1);
  });

  // Timeout after 10 seconds
  setTimeout(() => {
    if (!completed) {
      console.error('Timeout waiting for response');
      ws.close();
      process.exit(1);
    }
  }, 10000);
}

// Run the query
runQuery().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

