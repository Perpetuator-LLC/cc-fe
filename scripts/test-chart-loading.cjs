#!/usr/bin/env node
/**
 * Test Chart Loading Behavior
 *
 * Investigates the issue where requesting intraday chart data returns
 * daily chart options initially, then correct data on refresh.
 *
 * Usage:
 *   node scripts/test-chart-loading.cjs [SYMBOL] [INTERVAL]
 *   node scripts/test-chart-loading.cjs WMT 30min
 *   node scripts/test-chart-loading.cjs GOOG HOURLY
 *   node scripts/test-chart-loading.cjs COST MIN_15
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
      }
      execution {
        uuid
        status
      }
    }
  }
`;

const STOCK_PRICE_CONNECTION = `
  query StockPriceConnection($symbol: String!, $interval: StockPriceInterval, $first: Int, $fqn: String) {
    stockPriceConnection(symbol: $symbol, interval: $interval, first: $first, fqn: $fqn) {
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
        oldestDate
        newestDate
      }
    }
  }
`;

function analyzeChartOptions(chartOptions, expectedInterval) {
  const analysis = {
    hasData: false,
    seriesCount: 0,
    candlestickDataPoints: 0,
    firstDate: null,
    lastDate: null,
    interval: 'unknown',
    issues: [],
  };

  if (!chartOptions) {
    analysis.issues.push('No chartOptions returned');
    return analysis;
  }

  // Parse if string
  const options = typeof chartOptions === 'string' ? JSON.parse(chartOptions) : chartOptions;

  // Check series
  if (options.series && Array.isArray(options.series)) {
    analysis.seriesCount = options.series.length;
    const candleSeries = options.series.find(s => s.type === 'candlestick');
    if (candleSeries?.data) {
      analysis.hasData = true;
      analysis.candlestickDataPoints = candleSeries.data.length;
    }
  }

  // Check xAxis for dates
  const xAxis = Array.isArray(options.xAxis) ? options.xAxis[0] : options.xAxis;
  if (xAxis?.data && xAxis.data.length > 0) {
    analysis.firstDate = xAxis.data[0];
    analysis.lastDate = xAxis.data[xAxis.data.length - 1];

    // Try to detect interval from dates
    if (xAxis.data.length >= 2) {
      const d1 = new Date(xAxis.data[0]);
      const d2 = new Date(xAxis.data[1]);
      const diffMs = Math.abs(d2 - d1);
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 0.5) {
        analysis.interval = 'intraday (< 30min)';
      } else if (diffHours < 2) {
        analysis.interval = 'hourly';
      } else if (diffHours < 12) {
        analysis.interval = 'multi-hour';
      } else if (diffHours < 36) {
        analysis.interval = 'daily';
      } else {
        analysis.interval = 'weekly+';
      }
    }
  }

  // Check for issues
  const expectedLower = expectedInterval.toLowerCase();
  const isExpectedIntraday = expectedLower.includes('min') || expectedLower.includes('hour') || expectedLower === '60min';

  if (isExpectedIntraday && analysis.interval === 'daily') {
    analysis.issues.push(`MISMATCH: Expected ${expectedInterval} but got daily data`);
  }

  if (analysis.candlestickDataPoints === 0) {
    analysis.issues.push('No candlestick data points');
  }

  // Check for old-style chart options (theming issues)
  if (options.backgroundColor && options.backgroundColor !== 'transparent') {
    analysis.issues.push(`Has backgroundColor: ${options.backgroundColor} (should be transparent or themed)`);
  }

  return analysis;
}

async function testChartLoading(ws, symbol, interval) {
  console.log('\n' + '═'.repeat(70));
  console.log(`  CHART LOADING TEST: ${symbol} @ ${interval}`);
  console.log('═'.repeat(70));

  const results = {
    symbol,
    interval,
    passes: [],
  };

  // Pass 1: Check if data exists via stockPriceConnection
  console.log('\n--- Pass 1: Check existing data via stockPriceConnection ---');
  try {
    const stockResult = await sendQuery(ws, 'sp1', STOCK_PRICE_CONNECTION, {
      symbol,
      interval: interval.toUpperCase(),
      first: 5,
    });
    const data = stockResult?.data?.stockPriceConnection;
    console.log(`  Total count: ${data?.totalCount || 0}`);
    console.log(`  Has older data: ${data?.pageInfo?.hasOlderData}`);
    if (data?.edges?.length > 0) {
      console.log(`  First date: ${data.edges[0].node.date}`);
      console.log(`  Last date: ${data.edges[data.edges.length - 1].node.date}`);
    }
    results.passes.push({
      name: 'stockPriceConnection',
      totalCount: data?.totalCount || 0,
      hasData: (data?.totalCount || 0) > 0,
    });
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    results.passes.push({ name: 'stockPriceConnection', error: error.message });
  }

  // Pass 2: Execute CHART command (first time)
  console.log('\n--- Pass 2: Execute CHART command (triggers fetch if needed) ---');
  const fqn = `STOCK:NASDAQ:${symbol}`;
  const command = `${fqn} COMMAND:CHART -interval ${interval.toLowerCase()}`;
  console.log(`  Command: ${command}`);

  try {
    const cmdResult = await sendQuery(ws, 'cmd1', EXECUTE_COMMAND, { input: command });
    const exec = cmdResult?.data?.executeCommand;

    console.log(`  Success: ${exec?.success}`);
    console.log(`  Message: ${exec?.message}`);
    console.log(`  Output Type: ${exec?.result?.outputType}`);

    // Analyze chartOptions
    const chartAnalysis = analyzeChartOptions(exec?.result?.chartOptions, interval);
    console.log(`  Chart Analysis:`);
    console.log(`    Has data: ${chartAnalysis.hasData}`);
    console.log(`    Data points: ${chartAnalysis.candlestickDataPoints}`);
    console.log(`    Detected interval: ${chartAnalysis.interval}`);
    console.log(`    First date: ${chartAnalysis.firstDate}`);
    console.log(`    Last date: ${chartAnalysis.lastDate}`);

    if (chartAnalysis.issues.length > 0) {
      console.log(`    ⚠️  ISSUES:`);
      chartAnalysis.issues.forEach(issue => console.log(`      - ${issue}`));
    }

    // Check metadata for job info
    let metadata = exec?.result?.metadata;
    if (typeof metadata === 'string') {
      try { metadata = JSON.parse(metadata); } catch {}
    }
    if (metadata?.jobId) {
      console.log(`    Job ID: ${metadata.jobId}`);
    }

    results.passes.push({
      name: 'CHART command (1st)',
      success: exec?.success,
      message: exec?.message,
      chartAnalysis,
      hasJobId: !!metadata?.jobId,
    });

  } catch (error) {
    console.log(`  Error: ${error.message}`);
    results.passes.push({ name: 'CHART command (1st)', error: error.message });
  }

  // Pass 3: Wait and re-check stockPriceConnection
  console.log('\n--- Pass 3: Wait 5 seconds then re-check stockPriceConnection ---');
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    const stockResult = await sendQuery(ws, 'sp2', STOCK_PRICE_CONNECTION, {
      symbol,
      interval: interval.toUpperCase(),
      first: 5,
    });
    const data = stockResult?.data?.stockPriceConnection;
    console.log(`  Total count: ${data?.totalCount || 0}`);
    if (data?.edges?.length > 0) {
      console.log(`  First date: ${data.edges[0].node.date}`);
    }
    results.passes.push({
      name: 'stockPriceConnection (after wait)',
      totalCount: data?.totalCount || 0,
      hasData: (data?.totalCount || 0) > 0,
    });
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    results.passes.push({ name: 'stockPriceConnection (after wait)', error: error.message });
  }

  // Pass 4: Execute CHART command again (should have data now)
  console.log('\n--- Pass 4: Execute CHART command again ---');
  try {
    const cmdResult = await sendQuery(ws, 'cmd2', EXECUTE_COMMAND, { input: command });
    const exec = cmdResult?.data?.executeCommand;

    console.log(`  Success: ${exec?.success}`);
    console.log(`  Message: ${exec?.message?.substring(0, 80)}...`);

    const chartAnalysis = analyzeChartOptions(exec?.result?.chartOptions, interval);
    console.log(`  Chart Analysis:`);
    console.log(`    Has data: ${chartAnalysis.hasData}`);
    console.log(`    Data points: ${chartAnalysis.candlestickDataPoints}`);
    console.log(`    Detected interval: ${chartAnalysis.interval}`);

    if (chartAnalysis.issues.length > 0) {
      console.log(`    ⚠️  ISSUES:`);
      chartAnalysis.issues.forEach(issue => console.log(`      - ${issue}`));
    } else {
      console.log(`    ✅ No issues detected`);
    }

    results.passes.push({
      name: 'CHART command (2nd)',
      success: exec?.success,
      chartAnalysis,
    });

  } catch (error) {
    console.log(`  Error: ${error.message}`);
    results.passes.push({ name: 'CHART command (2nd)', error: error.message });
  }

  return results;
}

async function main() {
  const symbol = process.argv[2] || 'WMT';
  const interval = process.argv[3] || 'MIN_30';

  console.log('═'.repeat(70));
  console.log('  CHART LOADING BEHAVIOR INVESTIGATION');
  console.log('═'.repeat(70));
  console.log(`\nSymbol: ${symbol}`);
  console.log(`Interval: ${interval}`);
  console.log(`Date: ${new Date().toISOString()}`);

  const token = await getAccessToken();
  const ws = await createWebSocket(token);

  try {
    const results = await testChartLoading(ws, symbol, interval);

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('  SUMMARY');
    console.log('═'.repeat(70));

    const pass1 = results.passes.find(p => p.name === 'stockPriceConnection');
    const pass2 = results.passes.find(p => p.name === 'CHART command (1st)');
    const pass3 = results.passes.find(p => p.name === 'stockPriceConnection (after wait)');
    const pass4 = results.passes.find(p => p.name === 'CHART command (2nd)');

    console.log(`\n1. Initial data available: ${pass1?.hasData ? 'YES' : 'NO'} (${pass1?.totalCount || 0} records)`);
    console.log(`2. First CHART command:`);
    if (pass2?.chartAnalysis) {
      console.log(`   - Has data: ${pass2.chartAnalysis.hasData}`);
      console.log(`   - Detected interval: ${pass2.chartAnalysis.interval}`);
      console.log(`   - Issues: ${pass2.chartAnalysis.issues.length > 0 ? pass2.chartAnalysis.issues.join(', ') : 'None'}`);
      console.log(`   - Job triggered: ${pass2.hasJobId ? 'YES' : 'NO'}`);
    }
    console.log(`3. After wait: ${pass3?.hasData ? 'YES' : 'NO'} (${pass3?.totalCount || 0} records)`);
    console.log(`4. Second CHART command:`);
    if (pass4?.chartAnalysis) {
      console.log(`   - Has data: ${pass4.chartAnalysis.hasData}`);
      console.log(`   - Detected interval: ${pass4.chartAnalysis.interval}`);
      console.log(`   - Issues: ${pass4.chartAnalysis.issues.length > 0 ? pass4.chartAnalysis.issues.join(', ') : 'None'}`);
    }

    // Recommendations
    console.log('\n' + '─'.repeat(70));
    console.log('  RECOMMENDATIONS FOR BACKEND');
    console.log('─'.repeat(70));

    if (pass2?.chartAnalysis?.issues?.some(i => i.includes('MISMATCH'))) {
      console.log(`
⚠️  ISSUE DETECTED: Backend returns DAILY chart when ${interval} is requested

The backend should NOT return chartOptions with daily data when intraday
data is being fetched. Instead, it should return:
  - outputType: 'message' or 'loading'
  - chartOptions: null
  - metadata: { jobId: '...', status: 'fetching', interval: '${interval}' }

This allows the frontend to:
  1. Show a proper loading indicator
  2. Poll for data or subscribe to job completion
  3. Only render the chart when correct interval data is available

Current behavior causes:
  - Flash of incorrect daily chart
  - Poor user experience
  - Chart style/theming inconsistencies
`);
    } else if (!pass1?.hasData && pass3?.hasData) {
      console.log(`
✅ Data fetch worked correctly, but consider:
  - Return loading state instead of empty chart
  - Provide job subscription for real-time updates
`);
    } else {
      console.log(`\n✅ Chart loading appears to work correctly for ${symbol} @ ${interval}`);
    }

  } finally {
    ws.close();
    console.log('\n[WS] Connection closed');
  }
}

main().catch(console.error);

