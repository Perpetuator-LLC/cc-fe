/*
 * Test script for checking intraday data availability
 * Usage: node scripts/test-intraday-availability.cjs [SYMBOL]
 */

const WebSocket = require('ws');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TOKEN_FILE = path.join(os.homedir(), '.capital-copilot/cli-tokens.json');

async function main() {
  const symbol = process.argv[2] || 'MSFT';

  const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
  const wsUrl = 'ws://127.0.0.1:8000/ws/graphql/?token=' + tokens.accessToken;

  console.log(`=== Testing Data Availability for ${symbol} ===\n`);

  const intervals = [
    { name: 'MIN_60 (Hourly)', value: 'MIN_60' },
    { name: 'MIN_30 (30 min)', value: 'MIN_30' },
    { name: 'MIN_15 (15 min)', value: 'MIN_15' },
    { name: 'DAILY', value: 'DAILY' },
    { name: 'WEEKLY', value: 'WEEKLY' },
  ];

  const results = [];

  for (const interval of intervals) {
    try {
      const result = await queryInterval(wsUrl, symbol, interval.value);
      results.push({ interval: interval.name, ...result });

      console.log(`${interval.name}:`);
      console.log(`  Total Records: ${result.totalCount}`);
      console.log(`  Has Older Data: ${result.hasOlderData}`);
      console.log(`  Oldest: ${result.oldestDate}`);
      console.log(`  Newest: ${result.newestDate}`);
      console.log(`  Range: ${result.days} days (~${result.months} months)`);
      console.log('');
    } catch (err) {
      console.log(`${interval.name}: ERROR - ${err.message}\n`);
      results.push({ interval: interval.name, error: err.message });
    }
  }

  // Analysis
  console.log('=== Analysis ===\n');

  const hourly = results.find(r => r.interval.includes('Hourly'));
  const daily = results.find(r => r.interval === 'DAILY');

  if (hourly && daily) {
    console.log(`Daily data: ${daily.totalCount} records spanning ${daily.months} months`);
    console.log(`Hourly data: ${hourly.totalCount} records spanning ${hourly.months} months`);

    if (hourly.hasOlderData) {
      console.log('\n✅ Backend indicates MORE hourly data is available!');
      console.log('   The frontend should be able to fetch older intraday data.');
    } else {
      console.log('\n⚠️ Backend indicates NO more hourly data is available.');
      console.log('   This is likely an Alpha Vantage or backend limitation.');
      console.log('   Alpha Vantage may only provide ~1 month of intraday data.');
    }
  }

  // Save results
  const outputPath = path.join(__dirname, '../logs/ai_link/intraday_availability.json');
  fs.writeFileSync(outputPath, JSON.stringify({ symbol, timestamp: new Date().toISOString(), results }, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
}

function queryInterval(wsUrl, symbol, interval) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.close();
        reject(new Error('Timeout'));
      }
    }, 10000);

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
            query: `query($symbol: String!, $interval: StockPriceInterval, $first: Int) {
              stockPriceConnection(symbol: $symbol, interval: $interval, first: $first) {
                totalCount
                pageInfo { hasOlderData hasNewerData oldestDate newestDate }
              }
            }`,
            variables: { symbol, interval, first: 5 }
          }
        }));
      }

      if ((msg.type === 'next' || msg.type === 'data') && msg.id === '1') {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);

          const d = msg.payload?.data?.stockPriceConnection;
          if (d) {
            const oldest = d.pageInfo?.oldestDate ? new Date(d.pageInfo.oldestDate) : null;
            const newest = d.pageInfo?.newestDate ? new Date(d.pageInfo.newestDate) : null;
            const days = oldest && newest ? Math.round((newest - oldest) / (1000 * 60 * 60 * 24)) : 0;

            resolve({
              totalCount: d.totalCount,
              hasOlderData: d.pageInfo?.hasOlderData,
              oldestDate: d.pageInfo?.oldestDate,
              newestDate: d.pageInfo?.newestDate,
              days,
              months: Math.round(days / 30)
            });
          } else {
            reject(new Error('No data in response'));
          }
          ws.close();
        }
      }

      if (msg.type === 'error') {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error(JSON.stringify(msg.payload)));
          ws.close();
        }
      }
    });

    ws.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

main().catch(console.error);

