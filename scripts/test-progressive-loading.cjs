#!/usr/bin/env node
/**
 * Test Progressive Loading Interval Behavior
 *
 * Investigates if the frontend is correctly handling hasOlderData
 * and not falling back to daily data.
 *
 * Usage:
 *   node scripts/test-progressive-loading.cjs SYMBOL INTERVAL
 *   node scripts/test-progressive-loading.cjs CL MIN_30
 *
 * Copyright (c) 2025-2026 Perpetuator LLC
 */

const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Token management
const TOKEN_DIR = path.join(os.homedir(), '.capital-copilot');
const TOKEN_FILE = path.join(TOKEN_DIR, 'cli-tokens.json');

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
    API_URL: extract('API_URL'),
    OAUTH_ISSUER: extract('OAUTH_ISSUER') || extract('API_URL'),
    OAUTH_CLIENT_ID: extract('OAUTH_CLIENT_ID'),
    OAUTH_SCOPES: extract('OAUTH_SCOPES') || 'read write',
    TEST_EMAIL: extract('TEST_EMAIL'),
    TEST_PASSWORD: extract('TEST_PASSWORD'),
  };
}

function loadStoredTokens() {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function saveTokens(tokens) {
  if (!fs.existsSync(TOKEN_DIR)) {
    fs.mkdirSync(TOKEN_DIR, { mode: 0o700 });
  }
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

async function loginWithPassword(env) {
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
  return response.json();
}

async function getAccessToken() {
  const stored = loadStoredTokens();
  if (stored && Date.now() < stored.expiresAt - 60000) {
    return stored.accessToken;
  }
  const env = loadEnvironment();
  const tokens = await loginWithPassword(env);
  const tokenData = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    refreshTokenCreatedAt: Date.now(),
  };
  saveTokens(tokenData);
  return tokens.access_token;
}

function getWsUrl() {
  const env = loadEnvironment();
  return env.API_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws/graphql/';
}

async function createWebSocket(token) {
  return new Promise((resolve, reject) => {
    const wsUrl = `${getWsUrl()}?token=${token}`;
    console.log('[WS] Connecting to:', wsUrl.replace(/token=.*/, 'token=***'));
    const ws = new WebSocket(wsUrl, ['graphql-transport-ws']);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'connection_ack') {
        console.log('[WS] Connection acknowledged');
        resolve(ws);
      } else if (message.type === 'connection_error') {
        reject(new Error(`Connection error: ${JSON.stringify(message.payload)}`));
      }
    });

    ws.on('error', (error) => {
      reject(error);
    });

    setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
  });
}

function sendQuery(ws, id, query, variables) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Query ${id} timed out`));
    }, 30000);

    const handler = (data) => {
      const message = JSON.parse(data.toString());
      if (message.id === id) {
        if (message.type === 'next') {
          clearTimeout(timeout);
          ws.off('message', handler);
          resolve(message.payload);
        } else if (message.type === 'error') {
          clearTimeout(timeout);
          ws.off('message', handler);
          reject(new Error(JSON.stringify(message.payload)));
        } else if (message.type === 'complete') {
          clearTimeout(timeout);
          ws.off('message', handler);
        }
      }
    };

    ws.on('message', handler);
    ws.send(JSON.stringify({
      id,
      type: 'subscribe',
      payload: { query, variables },
    }));
  });
}

// GraphQL Queries
const STOCK_PRICE_CONNECTION = `
  query StockPriceConnection($symbol: String!, $interval: StockPriceInterval, $first: Int, $fqn: String, $before: DateTime) {
    stockPriceConnection(symbol: $symbol, interval: $interval, first: $first, fqn: $fqn, before: $before) {
      totalCount
      edges {
        node {
          date
          open
          high
          low
          close
          volume
        }
      }
      pageInfo {
        hasOlderData
        hasNewerData
        oldestDate
        newestDate
        endCursor
      }
    }
  }
`;

const CHART_DATA_RANGE = `
  query ChartDataRange($symbol: String!, $startDate: DateTime!, $endDate: DateTime!, $interval: StockPriceInterval, $fqn: String) {
    chartDataRange(symbol: $symbol, startDate: $startDate, endDate: $endDate, interval: $interval, fqn: $fqn) {
      totalCount
      edges {
        node {
          date
          open
          high
          low
          close
          volume
        }
      }
      pageInfo {
        hasOlderData
        hasNewerData
        oldestDate
        newestDate
      }
    }
  }
`;

async function testProgressiveLoading(ws, symbol, interval) {
  console.log('\n' + '═'.repeat(70));
  console.log(`  PROGRESSIVE LOADING TEST: ${symbol} @ ${interval}`);
  console.log('═'.repeat(70));

  const fqn = `STOCK:NYSE:${symbol}`;

  // Step 1: Initial load with stockPriceConnection
  console.log('\n--- Step 1: Initial load via stockPriceConnection ---');
  let initialResult;
  try {
    initialResult = await sendQuery(ws, 'init1', STOCK_PRICE_CONNECTION, {
      symbol,
      interval: interval.toUpperCase(),
      first: 500,
      fqn,
    });
    const data = initialResult?.data?.stockPriceConnection;
    console.log(`  Total count: ${data?.totalCount || 0}`);
    console.log(`  Returned edges: ${data?.edges?.length || 0}`);
    console.log(`  hasOlderData: ${data?.pageInfo?.hasOlderData}`);
    console.log(`  hasNewerData: ${data?.pageInfo?.hasNewerData}`);
    console.log(`  oldestDate: ${data?.pageInfo?.oldestDate}`);
    console.log(`  newestDate: ${data?.pageInfo?.newestDate}`);

    if (data?.edges?.length > 0) {
      console.log(`  First candle: ${data.edges[0].node.date}`);
      console.log(`  Last candle: ${data.edges[data.edges.length - 1].node.date}`);
    }
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    return;
  }

  const pageInfo = initialResult?.data?.stockPriceConnection?.pageInfo;

  // Step 2: Simulate zoom-out by requesting older data
  console.log('\n--- Step 2: Simulate zoom-out - request older data ---');

  if (!pageInfo?.hasOlderData) {
    console.log('  ⚠️ hasOlderData is FALSE - no more data available at this interval');
    console.log('  ✅ Frontend should STOP here and show "no more data" message');
    console.log('  ❌ Frontend should NOT switch to DAILY interval');
  } else {
    console.log(`  hasOlderData is TRUE - more ${interval} data should be available`);

    // Try to get older data using the oldestDate as "before"
    const oldestDate = pageInfo.oldestDate;
    console.log(`  Requesting data before: ${oldestDate}`);

    try {
      const olderResult = await sendQuery(ws, 'older1', STOCK_PRICE_CONNECTION, {
        symbol,
        interval: interval.toUpperCase(),
        first: 500,
        fqn,
        before: oldestDate,
      });
      const data = olderResult?.data?.stockPriceConnection;
      console.log(`  Older data total count: ${data?.totalCount || 0}`);
      console.log(`  Older data edges: ${data?.edges?.length || 0}`);
      console.log(`  Older hasOlderData: ${data?.pageInfo?.hasOlderData}`);
      console.log(`  Older oldestDate: ${data?.pageInfo?.oldestDate}`);

      if (data?.edges?.length === 0) {
        console.log('\n  ⚠️ No older data returned - end of available data for this interval');
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }

  // Step 3: Test with chartDataRange (what the frontend uses for progressive loading)
  console.log('\n--- Step 3: Test chartDataRange (used by frontend progressive loading) ---');

  const oldestDate = pageInfo?.oldestDate;
  if (oldestDate) {
    const endDate = new Date(oldestDate);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 1); // Go back 1 month (what frontend does for intraday)

    console.log(`  Requesting range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`  Interval: ${interval}`);

    try {
      const rangeResult = await sendQuery(ws, 'range1', CHART_DATA_RANGE, {
        symbol,
        interval: interval.toUpperCase(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        fqn,
      });
      const data = rangeResult?.data?.chartDataRange;
      console.log(`  Range total count: ${data?.totalCount || 0}`);
      console.log(`  Range edges: ${data?.edges?.length || 0}`);
      console.log(`  Range hasOlderData: ${data?.pageInfo?.hasOlderData}`);
      console.log(`  Range oldestDate: ${data?.pageInfo?.oldestDate}`);

      if (data?.edges?.length > 0) {
        console.log(`  First candle: ${data.edges[0].node.date}`);
        console.log(`  Last candle: ${data.edges[data.edges.length - 1].node.date}`);
      } else {
        console.log('\n  ⚠️ No data returned for this range - end of available data');
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('  ANALYSIS');
  console.log('═'.repeat(70));

  console.log(`
Key points for frontend:

1. Check hasOlderData BEFORE requesting more data
   - If false, STOP and show "no more ${interval} data available"
   - NEVER fall back to DAILY interval

2. The frontend's loadOlderChartData() should:
   - Check this.hasOlderData() before making request
   - Set hasOlderData(false) when backend returns empty
   - NOT request DAILY data when intraday runs out

3. Current frontend behavior in checkProgressiveDataLoad():
   if (startPercent <= loadThreshold && !this.loadingMoreData() && this.hasOlderData()) {
     this.loadOlderChartData(); // Only called if hasOlderData is true
   }
   This looks correct ✅

4. But in loadOlderChartData():
   const backendInterval = this.mapIntervalToBackend(interval);

   VERIFY that 'interval' is the CURRENT chart interval, not 'DAILY'!
`);
}

async function main() {
  const symbol = process.argv[2] || 'CL';
  const interval = process.argv[3] || 'MIN_30';

  console.log('═'.repeat(70));
  console.log('  PROGRESSIVE LOADING INTERVAL INVESTIGATION');
  console.log('═'.repeat(70));
  console.log(`\nSymbol: ${symbol}`);
  console.log(`Interval: ${interval}`);
  console.log(`Date: ${new Date().toISOString()}`);

  const token = await getAccessToken();
  const ws = await createWebSocket(token);

  try {
    await testProgressiveLoading(ws, symbol, interval);
  } finally {
    ws.close();
    console.log('\n[WS] Connection closed');
  }
}

main().catch(console.error);

