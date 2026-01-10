/*
 * Test script to query chart data availability from the backend.
 * This helps understand how much historical data is available for each interval.
 *
 * Usage: node scripts/test-data-availability.cjs
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Load environment config
const envPath = path.join(__dirname, '../src/environments/environment.ts');
let wsUrl = 'ws://localhost:8000/ws/graphql/';
let email = '';
let password = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const emailMatch = envContent.match(/TEST_EMAIL:\s*['"]([^'"]+)['"]/);
  const passMatch = envContent.match(/TEST_PASSWORD:\s*['"]([^'"]+)['"]/);
  if (emailMatch) email = emailMatch[1];
  if (passMatch) password = passMatch[1];
} catch (e) {
  console.log('Could not read environment file, using defaults');
}

// Token storage
const tokenPath = path.join(process.env.HOME, '.capital-copilot/cli-tokens.json');

async function getTokens() {
  try {
    if (fs.existsSync(tokenPath)) {
      const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
      if (tokens.accessToken) {
        return tokens;
      }
    }
  } catch (e) {
    console.log('No cached tokens found');
  }

  // Login to get tokens
  console.log('Logging in...');
  const response = await fetch('http://localhost:8000/graphql/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation Login($email: String!, $password: String!) {
        tokenAuth(email: $email, password: $password) {
          token
          refreshToken
        }
      }`,
      variables: { email, password }
    })
  });

  const result = await response.json();
  if (result.errors) {
    throw new Error('Login failed: ' + JSON.stringify(result.errors));
  }

  const tokens = {
    accessToken: result.data.tokenAuth.token,
    refreshToken: result.data.tokenAuth.refreshToken
  };

  // Save tokens
  const dir = path.dirname(tokenPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2), { mode: 0o600 });

  return tokens;
}

async function queryDataAvailability(symbol, interval) {
  const tokens = await getTokens();

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `JWT ${tokens.accessToken}`
      }
    });

    ws.on('open', () => {
      // Send connection init
      ws.send(JSON.stringify({ type: 'connection_init' }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'connection_ack') {
        // Send the query
        ws.send(JSON.stringify({
          id: '1',
          type: 'subscribe',
          payload: {
            query: `query ChartDataAvailability($symbol: String!, $interval: StockPriceInterval) {
              chartDataAvailability(symbol: $symbol, interval: $interval) {
                symbol
                interval
                oldestDate
                newestDate
                totalRecords
                lastUpdated
              }
            }`,
            variables: { symbol, interval }
          }
        }));
      }

      if (msg.type === 'next' || msg.type === 'data') {
        const result = msg.payload?.data?.chartDataAvailability;
        resolve(result);
        ws.close();
      }

      if (msg.type === 'error') {
        reject(new Error(JSON.stringify(msg.payload)));
        ws.close();
      }
    });

    ws.on('error', (err) => {
      reject(err);
    });

    setTimeout(() => {
      reject(new Error('Timeout'));
      ws.close();
    }, 10000);
  });
}

async function queryChartDataRange(symbol, startDate, endDate, interval) {
  const tokens = await getTokens();

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `JWT ${tokens.accessToken}`
      }
    });

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'connection_init' }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'connection_ack') {
        ws.send(JSON.stringify({
          id: '1',
          type: 'subscribe',
          payload: {
            query: `query ChartDataRange($symbol: String!, $startDate: DateTime!, $endDate: DateTime!, $interval: StockPriceInterval) {
              chartDataRange(symbol: $symbol, startDate: $startDate, endDate: $endDate, interval: $interval) {
                totalCount
                pageInfo {
                  hasOlderData
                  hasNewerData
                  oldestDate
                  newestDate
                }
                edges {
                  node {
                    date
                    close
                  }
                }
              }
            }`,
            variables: { symbol, startDate, endDate, interval }
          }
        }));
      }

      if (msg.type === 'next' || msg.type === 'data') {
        const result = msg.payload?.data?.chartDataRange;
        resolve(result);
        ws.close();
      }

      if (msg.type === 'error') {
        reject(new Error(JSON.stringify(msg.payload)));
        ws.close();
      }
    });

    ws.on('error', reject);

    setTimeout(() => {
      reject(new Error('Timeout'));
      ws.close();
    }, 30000);
  });
}

async function main() {
  const symbol = process.argv[2] || 'MSFT';
  const outputPath = path.join(__dirname, '../logs/ai_link/data_availability_test.log');

  console.log(`\n=== Testing data availability for ${symbol} ===\n`);

  const results = [];
  const intervals = ['MIN_30', 'MIN_60', 'DAILY', 'WEEKLY', 'MONTHLY'];

  for (const interval of intervals) {
    try {
      console.log(`Checking ${interval}...`);
      const availability = await queryDataAvailability(symbol, interval);

      if (availability) {
        const oldest = availability.oldestDate ? new Date(availability.oldestDate) : null;
        const newest = availability.newestDate ? new Date(availability.newestDate) : null;
        const years = oldest && newest ? ((newest - oldest) / (1000 * 60 * 60 * 24 * 365)).toFixed(2) : 'N/A';

        const result = {
          interval,
          totalRecords: availability.totalRecords,
          oldestDate: availability.oldestDate,
          newestDate: availability.newestDate,
          yearsOfData: years,
          lastUpdated: availability.lastUpdated
        };

        results.push(result);
        console.log(`  ${interval}: ${availability.totalRecords} records, ${years} years`);
        console.log(`    Oldest: ${availability.oldestDate}`);
        console.log(`    Newest: ${availability.newestDate}`);
      } else {
        console.log(`  ${interval}: No data available`);
        results.push({ interval, error: 'No data available' });
      }
    } catch (err) {
      console.log(`  ${interval}: Error - ${err.message}`);
      results.push({ interval, error: err.message });
    }
  }

  // Test fetching older hourly data (go back 2 years)
  console.log('\n=== Testing older hourly data fetch ===\n');
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 2); // 2 years ago

    console.log(`Fetching MIN_60 data from ${startDate.toISOString()} to ${endDate.toISOString()}...`);

    const rangeData = await queryChartDataRange(
      symbol,
      startDate.toISOString(),
      endDate.toISOString(),
      'MIN_60'
    );

    if (rangeData) {
      console.log(`  Received: ${rangeData.totalCount} records`);
      console.log(`  hasOlderData: ${rangeData.pageInfo?.hasOlderData}`);
      console.log(`  Oldest in response: ${rangeData.pageInfo?.oldestDate}`);
      console.log(`  Newest in response: ${rangeData.pageInfo?.newestDate}`);

      // Sample first and last edges
      if (rangeData.edges?.length > 0) {
        console.log(`  First candle: ${rangeData.edges[0].node.date}`);
        console.log(`  Last candle: ${rangeData.edges[rangeData.edges.length - 1].node.date}`);
      }

      results.push({
        test: 'fetch_2_years_hourly',
        totalCount: rangeData.totalCount,
        hasOlderData: rangeData.pageInfo?.hasOlderData,
        oldestInResponse: rangeData.pageInfo?.oldestDate,
        newestInResponse: rangeData.pageInfo?.newestDate
      });
    }
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    results.push({ test: 'fetch_2_years_hourly', error: err.message });
  }

  // Write results to log file
  const output = {
    timestamp: new Date().toISOString(),
    symbol,
    results
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to ${outputPath}`);
}

main().catch(console.error);

