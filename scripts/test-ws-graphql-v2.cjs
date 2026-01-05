#!/usr/bin/env node
/**
 * Test WebSocket GraphQL connection to the backend
 *
 * Usage:
 *   node scripts/test-ws-graphql-v2.cjs [all|quote|chart|progressive|history|execute|intervals|hourly|commands|watchlist|dataorder]
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
const REFRESH_TOKEN_ROTATION_INTERVAL = 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_BUFFER = 5 * 60 * 1000;

function loadEnvironment() {
  const envPath = path.join(__dirname, '../src/environments/environment.ts');
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
    API_URL: extract('API_URL'),
    OAUTH_ISSUER: extract('OAUTH_ISSUER') || extract('API_URL'),
    OAUTH_CLIENT_ID: extract('OAUTH_CLIENT_ID'),
    OAUTH_SCOPES: extract('OAUTH_SCOPES') || 'read write',
    TEST_EMAIL: extract('TEST_EMAIL'),
    TEST_PASSWORD: extract('TEST_PASSWORD'),
  };
}

function ensureTokenDir() {
  if (!fs.existsSync(TOKEN_DIR)) {
    fs.mkdirSync(TOKEN_DIR, { mode: 0o700 });
  }
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
  ensureTokenDir();
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

function isAccessTokenExpired(tokens) {
  return Date.now() >= tokens.expiresAt - ACCESS_TOKEN_BUFFER;
}

function shouldRotateRefreshToken(tokens) {
  return Date.now() - tokens.refreshTokenCreatedAt > REFRESH_TOKEN_ROTATION_INTERVAL;
}

async function loginWithPassword(env) {
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
  console.log(`[TokenManager] Login successful.`);
  return tokens;
}

async function refreshAccessToken(env, refreshToken) {
  console.log('[TokenManager] Refreshing token...');
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
    refreshTokenCreatedAt: data.refresh_token !== refreshToken ? Date.now() : (existing?.refreshTokenCreatedAt || Date.now()),
  };
  saveTokens(tokens);
  console.log('[TokenManager] Token refreshed.');
  return tokens;
}

async function getAccessToken() {
  const env = loadEnvironment();
  let tokens = loadStoredTokens();
  if (!tokens) {
    tokens = await loginWithPassword(env);
    return tokens.accessToken;
  }
  if (!isAccessTokenExpired(tokens)) {
    if (shouldRotateRefreshToken(tokens)) {
      try {
        tokens = await refreshAccessToken(env, tokens.refreshToken);
      } catch (e) {
        console.warn('[TokenManager] Rotation failed:', e.message);
      }
    }
    return tokens.accessToken;
  }
  try {
    tokens = await refreshAccessToken(env, tokens.refreshToken);
    return tokens.accessToken;
  } catch (e) {
    console.log('[TokenManager] Refresh failed, re-logging in...');
    if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
    tokens = await loginWithPassword(env);
    return tokens.accessToken;
  }
}

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
  };
}

// GraphQL Queries
const STOCK_PRICE_CONNECTION = `
  query StockPriceConnection($symbol: String!, $interval: StockPriceInterval, $first: Int, $before: String) {
    stockPriceConnection(
      symbol: $symbol
      interval: $interval
      first: $first
      before: $before
    ) {
      edges {
        node {
          id
          date
          open
          high
          low
          close
          volume
        }
        cursor
      }
      pageInfo {
        hasOlderData
        hasNewerData
        oldestDate
        newestDate
        endCursor
      }
      totalCount
    }
  }
`;

const CHART_DATA_RANGE = `
  query ChartDataRange($symbol: String!, $startDate: DateTime!, $endDate: DateTime!, $interval: StockPriceInterval) {
    chartDataRange(
      symbol: $symbol
      startDate: $startDate
      endDate: $endDate
      interval: $interval
    ) {
      edges {
        node {
          id
          date
          open
          high
          low
          close
          volume
        }
        cursor
      }
      pageInfo {
        hasOlderData
        hasNewerData
        oldestDate
        newestDate
      }
      totalCount
    }
  }
`;

const QUOTE_QUERY = `
  query Quote($symbol: String!) {
    quote(symbol: $symbol) {
      symbol
      price
      open
      high
      low
      volume
      timestamp
      change
      changePercent
    }
  }
`;

const COMMAND_HISTORY_QUERY = `
  query CommandHistory($first: Int, $after: String, $search: String) {
    commandHistory(first: $first, after: $after, search: $search) {
      edges {
        node {
          id
          rawInput
          parsedCommand
          parsedSymbols
          status
          createdAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

const EXECUTE_COMMAND_MUTATION = `
  mutation ExecuteCommand($input: String!) {
    executeCommand(input: $input) {
      success
      message
      result {
        success
        message
        outputType
        data
        chartOptions
        metadata
        route {
          tab
          symbol
          exchange
          view
          interval
          period
          watchlistId
          dashboardId
          commandId
        }
      }
      execution {
        id
        status
      }
    }
  }
`;

const AVAILABLE_COMMANDS_QUERY = `
  query AvailableCommands {
    availableCommands {
      name
      aliases
      category
      description
      requiresSymbol
      arguments {
        name
        type
        options
        default
        description
        required
      }
      exampleUsage
      outputType
    }
  }
`;

const WATCHLIST_SYMBOLS_QUERY = `
  query WatchlistSymbols($watchlistId: UUID!, $first: Int, $orderBy: WatchlistSortField, $orderDirection: SortDirection, $search: String) {
    watchlistSymbols(watchlistId: $watchlistId, first: $first, orderBy: $orderBy, orderDirection: $orderDirection, search: $search) {
      edges {
        node {
          symbol
          displayName
          exchange
          sector
          industry
          marketCap
          lastAccessedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

const WATCHLISTS_QUERY = `
  query Watchlists {
    watchlists {
      uuid
      name
      itemCount
    }
  }
`;

function getWsUrl() {
  const env = loadEnvironment();
  return env.API_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws/graphql/';
}

async function createWebSocket(token) {
  return new Promise((resolve, reject) => {
    const wsUrl = `${getWsUrl()}?token=${token}`;
    console.log('Connecting to:', wsUrl.replace(token, '***'));
    const ws = new WebSocket(wsUrl, ['graphql-transport-ws']);

    ws.on('open', () => {
      console.log('WebSocket connected, sending connection_init...');
      ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'connection_ack') {
        console.log('Connection acknowledged');
        resolve(ws);
      } else if (message.type === 'connection_error') {
        reject(new Error(`Connection error: ${JSON.stringify(message.payload)}`));
      }
    });

    ws.on('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), 10000);
  });
}

async function sendQuery(ws, id, query, variables) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Query timeout')), 30000);

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
          reject(new Error(`Query error: ${JSON.stringify(message.payload)}`));
        } else if (message.type === 'complete') {
          clearTimeout(timeout);
          ws.off('message', handler);
          resolve(null);
        }
      }
    };

    ws.on('message', handler);
    ws.send(JSON.stringify({ id, type: 'subscribe', payload: { query, variables } }));
  });
}

function printTestResults(testName, success, details) {
  const status = success ? '✅' : '❌';
  console.log(`\n${status} ${testName}`);
  if (details) {
    console.log(JSON.stringify(details, null, 2));
  }
}

// Test Functions
async function testQuote(ws, symbol = 'AAPL') {
  console.log(`\n--- Testing Quote for ${symbol} ---`);
  try {
    const result = await sendQuery(ws, 'q1', QUOTE_QUERY, { symbol });
    printTestResults(`Quote for ${symbol}`, true, result);
  } catch (error) {
    printTestResults(`Quote for ${symbol}`, false, { error: String(error) });
  }
}

async function testStockPriceConnection(ws, symbol = 'AAPL', interval = 'DAILY') {
  console.log(`\n--- Testing StockPriceConnection for ${symbol} (${interval}) ---`);
  try {
    const result = await sendQuery(ws, 'spc1', STOCK_PRICE_CONNECTION, { symbol, interval, first: 10 });
    const data = result?.data?.stockPriceConnection;
    if (data) {
      printTestResults(`StockPriceConnection ${symbol} ${interval}`, true, {
        totalCount: data.totalCount,
        edgeCount: data.edges?.length,
        hasOlderData: data.pageInfo?.hasOlderData,
        oldestDate: data.pageInfo?.oldestDate,
        newestDate: data.pageInfo?.newestDate,
      });
    } else {
      printTestResults(`StockPriceConnection ${symbol} ${interval}`, false, result);
    }
  } catch (error) {
    printTestResults(`StockPriceConnection ${symbol} ${interval}`, false, { error: String(error) });
  }
}

async function testProgressiveLoading(ws, symbol = 'AAPL') {
  console.log(`\n--- Testing Progressive Loading for ${symbol} ---`);

  try {
    console.log('Step 1: Loading recent data...');
    const firstResult = await sendQuery(ws, 'pl1', STOCK_PRICE_CONNECTION, { symbol, interval: 'DAILY', first: 50 });
    const firstData = firstResult?.data?.stockPriceConnection;

    if (!firstData) {
      printTestResults('Progressive Loading - Initial', false, firstResult);
      return;
    }

    console.log(`Received ${firstData.edges?.length} candles, hasOlderData: ${firstData.pageInfo?.hasOlderData}`);

    if (firstData.pageInfo?.hasOlderData && firstData.pageInfo?.endCursor) {
      console.log(`Step 2: Loading older data using cursor: ${firstData.pageInfo.endCursor}`);
      const secondResult = await sendQuery(ws, 'pl2', STOCK_PRICE_CONNECTION, {
        symbol, interval: 'DAILY', first: 50, before: firstData.pageInfo.endCursor
      });
      const secondData = secondResult?.data?.stockPriceConnection;

      if (secondData) {
        printTestResults('Progressive Loading', true, {
          firstLoad: { count: firstData.edges?.length, oldest: firstData.pageInfo?.oldestDate },
          secondLoad: { count: secondData.edges?.length, oldest: secondData.pageInfo?.oldestDate, hasOlderData: secondData.pageInfo?.hasOlderData },
        });
      } else {
        printTestResults('Progressive Loading - Second', false, secondResult);
      }
    } else {
      printTestResults('Progressive Loading', true, { message: 'No older data available', count: firstData.edges?.length });
    }
  } catch (error) {
    printTestResults('Progressive Loading', false, { error: String(error) });
  }
}

async function testChartDataRange(ws, symbol = 'AAPL') {
  console.log(`\n--- Testing ChartDataRange for ${symbol} ---`);
  try {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
    console.log(`Requesting data from ${startDate} to ${endDate}`);

    const result = await sendQuery(ws, 'cdr1', CHART_DATA_RANGE, { symbol, startDate, endDate, interval: 'DAILY' });
    const data = result?.data?.chartDataRange;

    if (data) {
      printTestResults(`ChartDataRange ${symbol}`, true, {
        totalCount: data.totalCount,
        edgeCount: data.edges?.length,
        hasOlderData: data.pageInfo?.hasOlderData,
        oldestDate: data.pageInfo?.oldestDate,
        newestDate: data.pageInfo?.newestDate,
      });
    } else {
      printTestResults(`ChartDataRange ${symbol}`, false, result);
    }
  } catch (error) {
    printTestResults(`ChartDataRange ${symbol}`, false, { error: String(error) });
  }
}

async function testCommandHistory(ws, search) {
  console.log(`\n--- Testing Command History ${search ? `(search: "${search}")` : ''} ---`);
  try {
    const result = await sendQuery(ws, 'ch1', COMMAND_HISTORY_QUERY, { first: 10, search });
    const data = result?.data?.commandHistory;

    if (data) {
      printTestResults('Command History', true, {
        totalCount: data.totalCount,
        edgeCount: data.edges?.length,
        hasNextPage: data.pageInfo?.hasNextPage,
        commands: data.edges?.slice(0, 5).map(e => ({ input: e.node.rawInput, status: e.node.status })),
      });
    } else {
      printTestResults('Command History', false, result);
    }
  } catch (error) {
    printTestResults('Command History', false, { error: String(error) });
  }
}

async function testExecuteCommand(ws, command) {
  console.log(`\n--- Testing Execute Command: "${command}" ---`);
  try {
    const result = await sendQuery(ws, 'ec1', EXECUTE_COMMAND_MUTATION, { input: command });
    const data = result?.data?.executeCommand;

    if (data) {
      // Log full result for debugging route info
      console.log('\nFull result structure:');
      console.log('  result.route:', JSON.stringify(data.result?.route, null, 2));
      console.log('  result.metadata:', JSON.stringify(data.result?.metadata, null, 2));
      console.log('  result.data.chartControls:', JSON.stringify(data.result?.data?.chartControls, null, 2));

      printTestResults('Execute Command', data.success, {
        success: data.success,
        message: data.message,
        result: data.result ? {
          outputType: data.result.outputType,
          hasData: !!data.result.data,
          hasChartOptions: !!data.result.chartOptions,
          route: data.result.route,
          metadataSymbol: data.result.metadata?.symbol,
        } : null,
        executionId: data.execution?.id,
        executionStatus: data.execution?.status,
      });
    } else {
      printTestResults('Execute Command', false, result);
    }
  } catch (error) {
    printTestResults('Execute Command', false, { error: String(error) });
  }
}

async function testAvailableCommands(ws) {
  console.log(`\n--- Testing Available Commands ---`);
  try {
    const result = await sendQuery(ws, 'ac1', AVAILABLE_COMMANDS_QUERY, {});
    const data = result?.data?.availableCommands;

    if (data && Array.isArray(data)) {
      printTestResults('Available Commands', true, {
        commandCount: data.length,
        commands: data.map(c => ({
          name: c.name,
          aliases: c.aliases,
          category: c.category,
          requiresSymbol: c.requiresSymbol,
          argumentCount: c.arguments?.length || 0,
        })),
      });
    } else {
      printTestResults('Available Commands', false, result);
    }
  } catch (error) {
    printTestResults('Available Commands', false, { error: String(error) });
  }
}

async function testWatchlistSymbols(ws) {
  console.log(`\n--- Testing Watchlist Symbols ---`);
  try {
    // First get watchlists to find a valid ID
    const watchlistsResult = await sendQuery(ws, 'wl1', WATCHLISTS_QUERY, {});
    const watchlists = watchlistsResult?.data?.watchlists;

    if (!watchlists || watchlists.length === 0) {
      printTestResults('Watchlist Symbols', false, { error: 'No watchlists found' });
      return;
    }

    console.log(`Found ${watchlists.length} watchlists, testing first one: ${watchlists[0].name}`);
    const watchlistId = watchlists[0].uuid;

    // Test with sorting
    const result = await sendQuery(ws, 'ws1', WATCHLIST_SYMBOLS_QUERY, {
      watchlistId,
      first: 10,
      orderBy: 'RECENT',
      orderDirection: 'DESC',
    });
    const data = result?.data?.watchlistSymbols;

    if (data) {
      printTestResults('Watchlist Symbols', true, {
        watchlistId,
        totalCount: data.totalCount,
        edgeCount: data.edges?.length,
        hasNextPage: data.pageInfo?.hasNextPage,
        symbols: data.edges?.slice(0, 5).map(e => ({
          symbol: e.node.symbol,
          name: e.node.displayName,
          exchange: e.node.exchange,
        })),
      });
    } else {
      printTestResults('Watchlist Symbols', false, result);
    }
  } catch (error) {
    printTestResults('Watchlist Symbols', false, { error: String(error) });
  }
}

async function testDataOrder(ws, symbol = 'MSFT') {
  console.log(`\n--- Testing Data Order for ${symbol} ---`);
  try {
    const result = await sendQuery(ws, 'do1', STOCK_PRICE_CONNECTION, { symbol, interval: 'DAILY', first: 20 });
    const data = result?.data?.stockPriceConnection;

    if (data?.edges?.length > 0) {
      const edges = data.edges;
      console.log(`\nReceived ${edges.length} candles for ${symbol}:`);
      console.log(`PageInfo: oldestDate=${data.pageInfo?.oldestDate}, newestDate=${data.pageInfo?.newestDate}`);
      console.log(`\nFirst 5 candles (should be NEWEST first):`);
      edges.slice(0, 5).forEach((e, i) => {
        console.log(`  [${i}] ${e.node.date} - O:${e.node.open} H:${e.node.high} L:${e.node.low} C:${e.node.close}`);
      });
      console.log(`\nLast 5 candles (should be OLDEST):`);
      edges.slice(-5).forEach((e, i) => {
        console.log(`  [${edges.length - 5 + i}] ${e.node.date} - O:${e.node.open} H:${e.node.high} L:${e.node.low} C:${e.node.close}`);
      });

      // Check order: first date should be newer than last date for newest-first ordering
      const firstDate = new Date(edges[0].node.date);
      const lastDate = new Date(edges[edges.length - 1].node.date);
      const isNewestFirst = firstDate > lastDate;
      console.log(`\nData order: ${isNewestFirst ? 'NEWEST FIRST ✅' : 'OLDEST FIRST (needs reversal for chart)'}`);

      printTestResults('Data Order', true, {
        count: edges.length,
        orderType: isNewestFirst ? 'newest_first' : 'oldest_first',
        firstDate: edges[0].node.date,
        lastDate: edges[edges.length - 1].node.date,
        hasOlderData: data.pageInfo?.hasOlderData,
        endCursor: data.pageInfo?.endCursor,
      });
    } else {
      printTestResults('Data Order', false, { error: 'No edges returned' });
    }
  } catch (error) {
    printTestResults('Data Order', false, { error: String(error) });
  }
}

async function testIntervals(ws, symbol = 'AAPL') {
  const intervals = ['DAILY', 'WEEKLY', 'MONTHLY', 'HOURLY', 'MIN_60', 'MIN_30', 'MIN_15', 'MIN_5', 'MIN_1'];
  console.log(`\n--- Testing Intervals for ${symbol} ---`);

  for (const interval of intervals) {
    try {
      const result = await sendQuery(ws, `int_${interval}`, STOCK_PRICE_CONNECTION, { symbol, interval, first: 5 });
      const data = result?.data?.stockPriceConnection;

      if (data?.edges?.length > 0) {
        console.log(`  ✅ ${interval}: ${data.totalCount} total, got ${data.edges.length}`);
      } else if (data) {
        console.log(`  ⚠️  ${interval}: No data available (totalCount: ${data.totalCount})`);
      } else {
        console.log(`  ❌ ${interval}: Query failed`, result?.errors?.[0]?.message || 'Unknown error');
      }
    } catch (error) {
      console.log(`  ❌ ${interval}: ${String(error)}`);
    }
  }
}

async function testHourlyDetailed(ws, symbol = 'AAPL') {
  console.log(`\n--- Detailed Hourly Interval Investigation for ${symbol} ---`);

  // Test 1: Check chartDataAvailability
  console.log('\n1. Checking chartDataAvailability for HOURLY...');
  const CHART_AVAILABILITY = `
    query ChartDataAvailability($symbol: String!, $interval: StockPriceInterval) {
      chartDataAvailability(symbol: $symbol, interval: $interval) {
        symbol
        interval
        oldestDate
        newestDate
        totalRecords
        lastUpdated
      }
    }
  `;

  try {
    const availResult = await sendQuery(ws, 'avail_hourly', CHART_AVAILABILITY, { symbol, interval: 'HOURLY' });
    const avail = availResult?.data?.chartDataAvailability;
    if (avail) {
      const hasData = avail.totalRecords > 0;
      console.log(`   hasData: ${hasData}`);
      console.log(`   totalRecords: ${avail.totalRecords}`);
      console.log(`   oldestDate: ${avail.oldestDate}`);
      console.log(`   newestDate: ${avail.newestDate}`);
      console.log(`   lastUpdated: ${avail.lastUpdated}`);
    } else {
      console.log(`   Response: ${JSON.stringify(availResult, null, 2)}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 2: Also check MIN_60 (might be an alias)
  console.log('\n2. Checking chartDataAvailability for MIN_60...');
  try {
    const availResult = await sendQuery(ws, 'avail_min60', CHART_AVAILABILITY, { symbol, interval: 'MIN_60' });
    const avail = availResult?.data?.chartDataAvailability;
    if (avail) {
      const hasData = avail.totalRecords > 0;
      console.log(`   hasData: ${hasData}`);
      console.log(`   totalRecords: ${avail.totalRecords}`);
      console.log(`   lastUpdated: ${avail.lastUpdated}`);
    } else {
      console.log(`   Response: ${JSON.stringify(availResult, null, 2)}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 3: Try DAILY to confirm it works
  console.log('\n3. Checking chartDataAvailability for DAILY (control)...');
  try {
    const availResult = await sendQuery(ws, 'avail_daily', CHART_AVAILABILITY, { symbol, interval: 'DAILY' });
    const avail = availResult?.data?.chartDataAvailability;
    if (avail) {
      const hasData = avail.totalRecords > 0;
      console.log(`   hasData: ${hasData}`);
      console.log(`   totalRecords: ${avail.totalRecords}`);
      console.log(`   oldestDate: ${avail.oldestDate}`);
      console.log(`   newestDate: ${avail.newestDate}`);
    } else {
      console.log(`   Response: ${JSON.stringify(availResult, null, 2)}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 4: Try execute command with hourly
  console.log('\n4. Testing CHART command with hourly interval...');
  try {
    const cmdResult = await sendQuery(ws, 'exec_hourly', EXECUTE_COMMAND_MUTATION, {
      input: `STOCK:NASDAQ:${symbol} COMMAND:CHART -interval hourly`
    });
    const exec = cmdResult?.data?.executeCommand;
    if (exec) {
      console.log(`   success: ${exec.success}`);
      console.log(`   message: ${exec.message}`);
      if (exec.result?.chartOptions?.series) {
        const candleSeries = exec.result.chartOptions.series.find(s => s.type === 'candlestick');
        console.log(`   candlestick data points: ${candleSeries?.data?.length || 0}`);
      }
      if (exec.result?.metadata) {
        console.log(`   metadata: ${JSON.stringify(exec.result.metadata)}`);
      }
    } else {
      console.log(`   Response: ${JSON.stringify(cmdResult, null, 2)}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 5: Direct stockPriceConnection query for each intraday interval
  console.log('\n5. Testing stockPriceConnection directly for intraday intervals...');
  const intradayIntervals = ['HOURLY', 'MIN_60', 'MIN_30', 'MIN_15', 'MIN_5', 'MIN_1'];
  for (const interval of intradayIntervals) {
    try {
      const result = await sendQuery(ws, `spc_${interval}`, STOCK_PRICE_CONNECTION, { symbol, interval, first: 3 });
      const data = result?.data?.stockPriceConnection;
      if (data?.edges?.length > 0) {
        console.log(`   ✅ ${interval}: ${data.totalCount} total, got ${data.edges.length} (newest: ${data.edges[0]?.node?.date})`);
      } else if (data) {
        console.log(`   ⚠️  ${interval}: totalCount=${data.totalCount}, edges=${data.edges?.length || 0}`);
      } else {
        console.log(`   ❌ ${interval}: ${result?.errors?.[0]?.message || 'No data returned'}`);
      }
    } catch (error) {
      console.log(`   ❌ ${interval}: ${error.message}`);
    }
  }

  console.log('\n--- End Detailed Hourly Investigation ---');
}

// Main
async function runTests(testType) {
  console.log('=== WebSocket GraphQL Test Suite ===\n');

  const tokenInfo = getTokenInfo();
  if (tokenInfo) {
    console.log('Token Status:');
    console.log(`  Expires: ${tokenInfo.expiresAt.toISOString()}`);
    console.log(`  Refresh token age: ${tokenInfo.refreshTokenAge}`);
    console.log(`  Is expired: ${tokenInfo.isExpired}`);
  } else {
    console.log('No stored tokens, will login...');
  }

  const token = await getAccessToken();
  const ws = await createWebSocket(token);

  try {
    switch (testType) {
      case 'quote':
        await testQuote(ws, 'AAPL');
        await testQuote(ws, 'MSFT');
        break;
      case 'chart':
        await testStockPriceConnection(ws, 'AAPL', 'DAILY');
        await testChartDataRange(ws, 'AAPL');
        break;
      case 'progressive':
        await testProgressiveLoading(ws, 'AAPL');
        break;
      case 'intervals':
        await testIntervals(ws, 'AAPL');
        break;
      case 'hourly':
        await testHourlyDetailed(ws, 'AAPL');
        break;
      case 'history':
        await testCommandHistory(ws);
        await testCommandHistory(ws, 'AAPL');
        break;
      case 'execute':
        await testExecuteCommand(ws, 'STOCK:NASDAQ:AAPL COMMAND:CHART -interval daily');
        break;
      case 'commands':
        await testAvailableCommands(ws);
        break;
      case 'watchlist':
        await testWatchlistSymbols(ws);
        break;
      case 'dataorder':
        await testDataOrder(ws, 'MSFT');
        await testDataOrder(ws, 'AAPL');
        break;
      case 'all':
      default:
        await testQuote(ws, 'AAPL');
        await testStockPriceConnection(ws, 'AAPL', 'DAILY');
        await testProgressiveLoading(ws, 'AAPL');
        await testChartDataRange(ws, 'AAPL');
        await testIntervals(ws, 'AAPL');
        await testCommandHistory(ws);
        await testAvailableCommands(ws);
        await testWatchlistSymbols(ws);
        break;
    }
  } finally {
    console.log('\n=== Closing WebSocket ===');
    ws.close();
  }
}

const testType = process.argv[2] || 'all';
runTests(testType)
  .then(() => {
    console.log('\n=== Tests Complete ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n=== Test Failed ===');
    console.error(error);
    process.exit(1);
  });

