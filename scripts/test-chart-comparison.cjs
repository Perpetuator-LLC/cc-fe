#!/usr/bin/env node
/**
 * Test script to compare chart responses from different invocation methods:
 * 1. Direct command: "STOCK:NASDAQ:AAPL COMMAND:CHART"
 * 2. StockPriceConnection query (used by ChartDataService for progressive loading)
 *
 * This helps identify differences in backend responses that cause UI inconsistencies.
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
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        continue;
      }
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

function loadStoredTokens() {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function isAccessTokenExpired(tokens) {
  return Date.now() >= tokens.expiresAt - ACCESS_TOKEN_BUFFER;
}

async function getAccessToken(env) {
  const stored = loadStoredTokens();
  if (stored && !isAccessTokenExpired(stored)) {
    return stored.accessToken;
  }
  // Login
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
    throw new Error(`Login failed: ${response.statusText}`);
  }
  const data = await response.json();
  return data.access_token;
}

// GraphQL queries
const EXECUTE_COMMAND = `
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
          tab symbol exchange view interval period watchlistId dashboardId commandId
        }
      }
      execution { id status }
    }
  }
`;

const STOCK_PRICE_CONNECTION = `
  query StockPriceConnection(
    $symbol: String!,
    $interval: StockPriceInterval!,
    $first: Int,
    $fqn: String
  ) {
    stockPriceConnection(
      symbol: $symbol,
      interval: $interval,
      first: $first,
      fqn: $fqn
    ) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          date
          open
          high
          low
          close
          volume
          symbol
          interval
        }
      }
      totalCount
    }
  }
`;

function connectWebSocket(env, token) {
  return new Promise((resolve, reject) => {
    const wsUrl = `ws://127.0.0.1:8000/ws/graphql/?token=${token}`;
    const ws = new WebSocket(wsUrl, 'graphql-transport-ws');

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'connection_ack') {
        resolve(ws);
      }
    });

    ws.on('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), 10000);
  });
}

function sendQuery(ws, id, query, variables) {
  return new Promise((resolve, reject) => {
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        if (msg.type === 'next') {
          ws.removeListener('message', handler);
          ws.send(JSON.stringify({ type: 'complete', id }));
          resolve(msg.payload);
        } else if (msg.type === 'error') {
          ws.removeListener('message', handler);
          reject(new Error(JSON.stringify(msg.payload)));
        }
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({
      id,
      type: 'subscribe',
      payload: { query, variables },
    }));
    setTimeout(() => reject(new Error('Query timeout')), 30000);
  });
}

async function main() {
  const env = loadEnvironment();
  console.log('=== Chart Comparison Test ===\n');

  const token = await getAccessToken(env);
  console.log('✓ Got access token\n');

  const ws = await connectWebSocket(env, token);
  console.log('✓ WebSocket connected\n');

  const symbol = 'AAPL';
  const exchange = 'NASDAQ';

  // Test 1: Execute CHART command (how terminal bar works)
  console.log('--- Test 1: Execute CHART Command ---');
  console.log(`Command: STOCK:${exchange}:${symbol} COMMAND:CHART -interval daily\n`);

  try {
    const result1 = await sendQuery(ws, 'cmd1', EXECUTE_COMMAND, {
      input: `STOCK:${exchange}:${symbol} COMMAND:CHART -interval daily`,
    });
    const exec = result1?.data?.executeCommand;

    console.log('Success:', exec?.success);
    console.log('Message:', exec?.message);
    console.log('OutputType:', exec?.result?.outputType);
    console.log('Route:', JSON.stringify(exec?.result?.route, null, 2));

    // Parse metadata
    let metadata = exec?.result?.metadata;
    if (typeof metadata === 'string') {
      try { metadata = JSON.parse(metadata); } catch {}
    }
    console.log('\nMetadata:');
    console.log('  Symbol:', metadata?.symbol);
    console.log('  Period:', metadata?.period);
    console.log('  Interval:', metadata?.interval);
    console.log('  DataPoints:', metadata?.dataPoints);
    console.log('  ChartControls:', !!metadata?.chartControls);

    // Parse chartOptions
    let chartOptions = exec?.result?.chartOptions;
    if (typeof chartOptions === 'string') {
      let attempts = 0;
      while (typeof chartOptions === 'string' && attempts < 5) {
        try { chartOptions = JSON.parse(chartOptions); attempts++; } catch { break; }
      }
    }

    if (chartOptions && typeof chartOptions === 'object') {
      console.log('\nChartOptions Structure:');
      console.log('  Keys:', Object.keys(chartOptions).join(', '));
      console.log('  Has title:', !!chartOptions.title);
      console.log('  Has tooltip:', !!chartOptions.tooltip);
      console.log('  Has grid:', !!chartOptions.grid);
      console.log('  Has xAxis:', !!chartOptions.xAxis);
      console.log('  Has yAxis:', !!chartOptions.yAxis);
      console.log('  Has series:', !!chartOptions.series);
      console.log('  Has dataZoom:', !!chartOptions.dataZoom);
      console.log('  Has axisPointer:', !!chartOptions.axisPointer);

      // Examine series
      if (chartOptions.series && Array.isArray(chartOptions.series)) {
        console.log('\n  Series:');
        chartOptions.series.forEach((s, i) => {
          console.log(`    [${i}] type: ${s.type}, name: ${s.name}, dataPoints: ${s.data?.length || 0}`);
          if (s.itemStyle) {
            console.log(`        itemStyle: color=${s.itemStyle.color}, color0=${s.itemStyle.color0}`);
          }
        });
      }

      // Examine dataZoom
      if (chartOptions.dataZoom) {
        console.log('\n  DataZoom:', JSON.stringify(chartOptions.dataZoom, null, 4));
      }

      // Examine axisPointer
      if (chartOptions.axisPointer) {
        console.log('\n  AxisPointer:', JSON.stringify(chartOptions.axisPointer, null, 4));
      }

      // Examine tooltip
      if (chartOptions.tooltip) {
        console.log('\n  Tooltip:', JSON.stringify(chartOptions.tooltip, null, 4));
      }

      // Examine xAxis
      if (chartOptions.xAxis) {
        const xAxis = Array.isArray(chartOptions.xAxis) ? chartOptions.xAxis[0] : chartOptions.xAxis;
        console.log('\n  xAxis:');
        console.log('    type:', xAxis.type);
        console.log('    axisPointer:', JSON.stringify(xAxis.axisPointer, null, 6));
      }

      // Examine yAxis
      if (chartOptions.yAxis) {
        const yAxis = Array.isArray(chartOptions.yAxis) ? chartOptions.yAxis[0] : chartOptions.yAxis;
        console.log('\n  yAxis:');
        console.log('    type:', yAxis.type);
        console.log('    position:', yAxis.position);
        console.log('    axisPointer:', JSON.stringify(yAxis.axisPointer, null, 6));
      }
    } else {
      console.log('\nChartOptions: Not available or invalid');
    }
  } catch (err) {
    console.error('Command execution error:', err.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 2: StockPriceConnection (how watchlist click works via ChartDataService)
  console.log('--- Test 2: StockPriceConnection Query ---');
  console.log(`Symbol: ${symbol}, Interval: DAILY, FQN: STOCK:${exchange}:${symbol}\n`);

  try {
    const result2 = await sendQuery(ws, 'spc1', STOCK_PRICE_CONNECTION, {
      symbol,
      interval: 'DAILY',
      first: 100,
      fqn: `STOCK:${exchange}:${symbol}`,
    });
    const conn = result2?.data?.stockPriceConnection;

    console.log('TotalCount:', conn?.totalCount);
    console.log('EdgeCount:', conn?.edges?.length);
    console.log('HasNextPage:', conn?.pageInfo?.hasNextPage);
    console.log('HasPreviousPage:', conn?.pageInfo?.hasPreviousPage);

    if (conn?.edges?.length > 0) {
      const first = conn.edges[0].node;
      const last = conn.edges[conn.edges.length - 1].node;
      console.log('\nFirst candle:', {
        date: first.date,
        open: first.open,
        high: first.high,
        low: first.low,
        close: first.close,
      });
      console.log('Last candle:', {
        date: last.date,
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
      });
    }

    console.log('\n** Note: StockPriceConnection returns RAW DATA only **');
    console.log('** The frontend builds chartOptions locally using ChartConfigService **');
    console.log('** This is different from executeCommand which returns chartOptions from backend **');
  } catch (err) {
    console.error('StockPriceConnection error:', err.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 3: Varying period/interval to see if options differ
  console.log('--- Test 3: Execute GP command (alternative chart command) ---');
  console.log(`Command: AAPL GP -period 1Y -interval daily\n`);

  try {
    const result3 = await sendQuery(ws, 'cmd2', EXECUTE_COMMAND, {
      input: 'AAPL GP -period 1Y -interval daily',
    });
    const exec = result3?.data?.executeCommand;

    console.log('Success:', exec?.success);
    console.log('Message:', exec?.message);
    console.log('OutputType:', exec?.result?.outputType);

    let chartOptions = exec?.result?.chartOptions;
    if (typeof chartOptions === 'string') {
      let attempts = 0;
      while (typeof chartOptions === 'string' && attempts < 5) {
        try { chartOptions = JSON.parse(chartOptions); attempts++; } catch { break; }
      }
    }

    if (chartOptions && typeof chartOptions === 'object') {
      console.log('\nChartOptions Keys:', Object.keys(chartOptions).join(', '));

      // Compare dataZoom
      if (chartOptions.dataZoom) {
        console.log('DataZoom:', JSON.stringify(chartOptions.dataZoom, null, 2));
      }
    }
  } catch (err) {
    console.error('GP command error:', err.message);
  }

  console.log('\n=== Summary ===\n');
  console.log('FINDING: There are TWO different chart rendering paths:');
  console.log('');
  console.log('1. COMMAND ENTRY (executeCommand mutation):');
  console.log('   - Backend generates complete chartOptions');
  console.log('   - Frontend applies applyDarkTheme() from WatchlistTab');
  console.log('   - May include different dataZoom, tooltip, axisPointer config');
  console.log('');
  console.log('2. WATCHLIST CLICK (StockPriceConnection query):');
  console.log('   - Backend returns only raw candle data');
  console.log('   - Frontend builds chartOptions via buildChartFromCandles()');
  console.log('   - Uses WatchlistTab\'s local chart configuration');
  console.log('');
  console.log('SOLUTION: Unify both paths to use a single ChartConfigService');
  console.log('that applies consistent theming regardless of data source.');

  ws.close();
}

main().catch(console.error);

