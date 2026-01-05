#!/usr/bin/env node
// Copyright (c) 2025-2026 Perpetuator LLC
// Test script for WebSocket GraphQL and chart data endpoints

const WebSocket = require('ws');

const API_URL = 'http://127.0.0.1:8000';
const WS_URL = 'ws://127.0.0.1:8000';
const TEST_EMAIL = 'nik.cimino+cc@gmail.com';
const TEST_PASSWORD = 'dywdA7-tobxiq-hamjeh';

// Store tokens
let accessToken = null;

const OAUTH_CLIENT_ID = 'BCZ0upsNuX9nZu0HxxYdpP6Fq1ZQGbICCuLzgDME';

/**
 * Login using OAuth2 Password Grant
 */
async function login() {
  console.log('\n=== LOGGING IN (OAuth2 Password Grant) ===');

  const body = new URLSearchParams({
    grant_type: 'password',
    username: TEST_EMAIL,
    password: TEST_PASSWORD,
    client_id: OAUTH_CLIENT_ID,
    scope: 'read write',
  });

  const response = await fetch(`${API_URL}/o/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Login failed:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  accessToken = data.access_token;

  console.log('Login successful!');
  console.log('Token type:', data.token_type);
  console.log('Expires in:', data.expires_in, 'seconds');
  console.log('Access token (first 50 chars):', accessToken.substring(0, 50) + '...');

  return accessToken;
}

/**
 * Test HTTP GraphQL query for chart data
 */
async function testChartDataHTTP(symbol = 'AAPL') {
  console.log('\n=== TESTING HTTP GRAPHQL - stockPriceConnection ===');

  const query = `
    query StockPriceConnection($symbol: String!, $interval: StockPriceInterval, $first: Int) {
      stockPriceConnection(symbol: $symbol, interval: $interval, first: $first) {
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
          startCursor
          endCursor
        }
        totalCount
      }
    }
  `;

  const response = await fetch(`${API_URL}/graphql/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query,
      variables: {
        symbol,
        interval: 'DAILY',
        first: 10,
      },
    }),
  });

  const data = await response.json();

  if (data.errors) {
    console.error('GraphQL errors:', JSON.stringify(data.errors, null, 2));
    return null;
  }

  const connection = data.data?.stockPriceConnection;
  console.log('Response received:');
  console.log('- Total count:', connection?.totalCount);
  console.log('- Edges count:', connection?.edges?.length);
  console.log('- PageInfo:', JSON.stringify(connection?.pageInfo, null, 2));

  if (connection?.edges?.length > 0) {
    console.log('- First edge:', JSON.stringify(connection.edges[0], null, 2));
  }

  return connection;
}

/**
 * Test Terminal WebSocket for command execution
 */
async function testTerminalWebSocket(symbol = 'AAPL') {
  console.log('\n=== TESTING TERMINAL WEBSOCKET ===');

  return new Promise((resolve, reject) => {
    const wsUrl = `${WS_URL}/ws/terminal/?token=${accessToken}`;
    console.log('Connecting to:', wsUrl.replace(accessToken, '***'));

    const ws = new WebSocket(wsUrl);
    const results = [];
    let messageCount = 0;
    const maxMessages = 5;

    ws.on('open', () => {
      console.log('Terminal WebSocket connected!');

      // Send a chart command
      const command = {
        action: 'execute',
        input: `STOCK:NASDAQ:${symbol} COMMAND:CHART -interval daily`,
      };

      console.log('Sending command:', JSON.stringify(command, null, 2));
      ws.send(JSON.stringify(command));
    });

    ws.on('message', (data) => {
      messageCount++;
      const message = JSON.parse(data.toString());
      results.push(message);

      console.log(`\nReceived message #${messageCount}:`);
      console.log('- Type:', message.type);

      if (message.type === 'command.result') {
        console.log('- Success:', message.result?.success);
        console.log('- Message:', message.result?.message);
        console.log('- Output type:', message.result?.outputType);
        console.log('- Has chartOptions:', !!message.result?.chartOptions);
        console.log('- chartOptions type:', typeof message.result?.chartOptions);

        if (message.result?.chartOptions) {
          const opts = message.result.chartOptions;
          if (typeof opts === 'string') {
            console.log('- chartOptions is STRING (length):', opts.length);
            console.log('- chartOptions preview:', opts.substring(0, 300) + '...');
          } else if (typeof opts === 'object') {
            const keys = Object.keys(opts);
            console.log('- chartOptions is OBJECT, keys:', keys.slice(0, 10));
            // Check if it looks like a spread string (numeric keys)
            if (keys.every(k => /^\d+$/.test(k))) {
              console.log('- WARNING: chartOptions looks like a spread string with numeric keys!');
              console.log('- First 10 values:', keys.slice(0, 10).map(k => opts[k]));
            }
          }
        }

        if (message.result?.data?.prices) {
          console.log('- Prices count:', message.result.data.prices.length);
          console.log('- First price:', JSON.stringify(message.result.data.prices[0], null, 2));
        }

        ws.close();
        resolve(results);
      } else if (message.type === 'connected') {
        console.log('- User ID:', message.userId);
      } else {
        console.log('- Full message keys:', Object.keys(message));
      }

      if (messageCount >= maxMessages) {
        ws.close();
        resolve(results);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
      reject(error);
    });

    ws.on('close', (code, reason) => {
      console.log(`\nWebSocket closed. Code: ${code}, Reason: ${reason || 'N/A'}`);
      resolve(results);
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log('Timeout - closing WebSocket');
        ws.close();
      }
      resolve(results);
    }, 15000);
  });
}

/**
 * Test autocomplete via WebSocket
 */
async function testAutocompleteWebSocket(input = 'AAPL') {
  console.log('\n=== TESTING AUTOCOMPLETE WEBSOCKET for:', input, '===');

  return new Promise((resolve, reject) => {
    const wsUrl = `${WS_URL}/ws/terminal/?token=${accessToken}`;

    const ws = new WebSocket(wsUrl);
    const results = [];

    ws.on('open', () => {
      console.log('Connected! Sending autocomplete request...');

      ws.send(JSON.stringify({
        action: 'autocomplete',
        input: input,
        limit: 10,
      }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      results.push(message);

      if (message.type === 'autocomplete') {
        console.log('\nAutocomplete response:');
        console.log('- Input:', message.input);
        console.log('- Suggestions count:', message.suggestions?.length);

        if (message.suggestions?.length > 0) {
          console.log('\nSuggestions:');
          message.suggestions.forEach((s, i) => {
            console.log(`  ${i + 1}. fqn: ${s.fqn}`);
            console.log(`     display: ${s.display}`);
            console.log(`     displaySecondary: ${s.displaySecondary || 'N/A'}`);
            console.log(`     type: ${s.type}`);
            console.log(`     exchange: ${s.exchange || 'N/A'}`);
            console.log('');
          });
        }

        ws.close();
        resolve(results);
      } else if (message.type === 'connected') {
        // Wait for autocomplete response
      }
    });

    ws.on('error', (error) => {
      console.error('Error:', error.message);
      reject(error);
    });

    ws.on('close', () => {
      resolve(results);
    });

    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      resolve(results);
    }, 5000);
  });
}

/**
 * Main test runner
 */
async function main() {
  console.log('='.repeat(60));
  console.log('WebSocket/GraphQL Testing Script');
  console.log('API:', API_URL);
  console.log('='.repeat(60));

  try {
    // Step 1: Login
    await login();

    // Step 2: Test HTTP GraphQL endpoints
    await testChartDataHTTP('AAPL');

    // Step 3: Test Terminal WebSocket
    await testTerminalWebSocket('AAPL');

    // Step 4: Test Autocomplete
    await testAutocompleteWebSocket('AAPL');
    await testAutocompleteWebSocket('tesla');
    await testAutocompleteWebSocket('TSLA');

    console.log('\n' + '='.repeat(60));
    console.log('ALL TESTS COMPLETED');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\nTest failed:', error);
    process.exit(1);
  }
}

main();

