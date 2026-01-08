#!/usr/bin/env node
/**
 * Test script to verify backend features for frontend requirements
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Load token
const tokenPath = path.join(process.env.HOME, '.capital-copilot/cli-tokens.json');
let token;
try {
  const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  token = tokens.accessToken;
} catch (e) {
  console.error('Failed to load token:', e.message);
  process.exit(1);
}

const WS_URL = 'ws://127.0.0.1:8000/ws/graphql/?token=' + token;

function runQuery(name, query, variables = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout'));
    }, 10000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'connection_ack') {
        ws.send(JSON.stringify({
          id: '1',
          type: 'subscribe',
          payload: { query, variables }
        }));
      } else if (msg.type === 'next') {
        clearTimeout(timeout);
        ws.close();
        resolve(msg.payload);
      } else if (msg.type === 'error') {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(JSON.stringify(msg.payload)));
      }
    });

    ws.on('error', (e) => {
      clearTimeout(timeout);
      reject(e);
    });
  });
}

async function testRecentSymbols() {
  console.log('\n=== Test 1: recentSymbols with marketCap ===\n');
  try {
    const result = await runQuery('recentSymbols', `
      query {
        recentSymbols(limit: 5) {
          # REMOVED edges
            node {
              symbol
              displayName
              exchange
              sector
              industry
              marketCap
              accessCount
              lastAccessedAt
            }
          }
        }
      }
    `);

    const edges = result?.data?.recentSymbols?.edges || [];
    console.log(`Found ${edges.length} recent symbols`);

    let hasMarketCap = false;
    edges.forEach((edge, i) => {
      const n = edge.node;
      console.log(`  [${i}] ${n.symbol}: marketCap=${n.marketCap}, sector=${n.sector}`);
      if (n.marketCap !== null && n.marketCap !== undefined) hasMarketCap = true;
    });

    console.log(`\n✅ recentSymbols works`);
    console.log(`${hasMarketCap ? '✅' : '❌'} marketCap is ${hasMarketCap ? 'populated' : 'NOT populated'}`);
    return { works: true, hasMarketCap };
  } catch (e) {
    console.log('❌ recentSymbols failed:', e.message);
    return { works: false, hasMarketCap: false };
  }
}

async function testCommandMetadata() {
  console.log('\n=== Test 2: commandMetadata ===\n');
  try {
    const result = await runQuery('commandMetadata', `
      query CommandMetadata($command: String!) {
        commandMetadata(command: $command) {
          name
          description
          parameters {
            name
            shortName
            type
            required
            values
            description
          }
        }
      }
    `, { command: 'CHART' });

    const metadata = result?.data?.commandMetadata;
    if (metadata) {
      console.log(`Command: ${metadata.name}`);
      console.log(`Description: ${metadata.description}`);
      console.log(`Parameters: ${metadata.parameters?.length || 0}`);
      metadata.parameters?.forEach(p => {
        console.log(`  - ${p.name} (${p.type}): ${p.values?.join(', ') || 'no enum values'}`);
      });
      console.log('\n✅ commandMetadata works');
      return { works: true, hasParameters: (metadata.parameters?.length || 0) > 0 };
    } else {
      console.log('❌ commandMetadata returned null');
      return { works: false, hasParameters: false };
    }
  } catch (e) {
    console.log('❌ commandMetadata failed:', e.message);
    // Check if it's a "field not found" error
    if (e.message.includes('Cannot query field')) {
      console.log('   → Query does not exist in schema');
    }
    return { works: false, hasParameters: false };
  }
}

async function testStockPriceConnection() {
  console.log('\n=== Test 3: stockPriceConnection with dataZoom fields ===\n');
  try {
    const result = await runQuery('stockPriceConnection', `
      query StockPriceConnection($symbol: String!, $interval: StockPriceInterval, $first: Int) {
        stockPriceConnection(symbol: $symbol, interval: $interval, first: $first) {
          # REMOVED edges
            node {
              id
              date
              open
              high
              low
              close
              volume
              splitCoefficient
              dividendAmount
            }
          }
          pageInfo {
            hasOlderData
            oldestDate
            newestDate
          }
          totalCount
        }
      }
    `, { symbol: 'AAPL', interval: 'DAILY', first: 5 });

    const connection = result?.data?.stockPriceConnection;
    const edges = connection?.edges || [];
    console.log(`Found ${edges.length} price records (totalCount: ${connection?.totalCount})`);

    let hasSplitCoeff = false;
    let hasDividendAmt = false;
    edges.forEach((edge, i) => {
      const n = edge.node;
      console.log(`  [${i}] ${n.date}: O=${n.open} H=${n.high} L=${n.low} C=${n.close} split=${n.splitCoefficient} div=${n.dividendAmount}`);
      if (n.splitCoefficient !== null && n.splitCoefficient !== undefined) hasSplitCoeff = true;
      if (n.dividendAmount !== null && n.dividendAmount !== undefined) hasDividendAmt = true;
    });

    console.log(`\n✅ stockPriceConnection works`);
    console.log(`${hasSplitCoeff ? '✅' : '⚠️'} splitCoefficient: ${hasSplitCoeff ? 'present' : 'all null (may be no splits in sample)'}`);
    console.log(`${hasDividendAmt ? '✅' : '⚠️'} dividendAmount: ${hasDividendAmt ? 'present' : 'all null (may be no dividends in sample)'}`);

    return { works: true, hasSplitCoeff, hasDividendAmt };
  } catch (e) {
    console.log('❌ stockPriceConnection failed:', e.message);
    return { works: false, hasSplitCoeff: false, hasDividendAmt: false };
  }
}

async function testCommandHistory() {
  console.log('\n=== Test 4: commandHistory with uniqueLatest ===\n');
  try {
    // First test without uniqueLatest
    const result1 = await runQuery('commandHistory-all', `
      query {
        commandHistory(first: 10) {
          # REMOVED edges
            node {
              uuid
              rawInput
              parsedCommand
            }
            executionCount
          }
          totalCount
        }
      }
    `);

    const edges1 = result1?.data?.commandHistory?.edges || [];
    console.log(`Without uniqueLatest: ${edges1.length} results (total: ${result1?.data?.commandHistory?.totalCount})`);

    // Now test with uniqueLatest=true
    const result2 = await runQuery('commandHistory-unique', `
      query {
        commandHistory(first: 10, uniqueLatest: true) {
          # REMOVED edges
            node {
              uuid
              rawInput
              parsedCommand
            }
            executionCount
          }
          totalCount
        }
      }
    `);

    const edges2 = result2?.data?.commandHistory?.edges || [];
    console.log(`With uniqueLatest=true: ${edges2.length} results (total: ${result2?.data?.commandHistory?.totalCount})`);

    let hasExecutionCount = false;
    edges2.forEach((edge, i) => {
      const n = edge.node;
      console.log(`  [${i}] ${n.parsedCommand}: "${n.rawInput.substring(0, 40)}..." (x${edge.executionCount || 1})`);
      if (edge.executionCount !== null && edge.executionCount !== undefined && edge.executionCount > 0) {
        hasExecutionCount = true;
      }
    });

    const dedupWorks = edges2.length <= edges1.length;
    console.log(`\n${dedupWorks ? '✅' : '❌'} uniqueLatest ${dedupWorks ? 'appears to work' : 'NOT working'} (${edges1.length} → ${edges2.length})`);
    console.log(`${hasExecutionCount ? '✅' : '⚠️'} executionCount: ${hasExecutionCount ? 'populated' : 'not populated or all 1'}`);

    return { works: true, dedupWorks, hasExecutionCount };
  } catch (e) {
    console.log('❌ commandHistory failed:', e.message);
    return { works: false, dedupWorks: false, hasExecutionCount: false };
  }
}

async function testDataZoomConfig() {
  console.log('\n=== Test 5: CHART command dataZoom configuration ===\n');
  try {
    // Execute a CHART command and check the chartOptions for dataZoom config
    const result = await runQuery('executeCommand', `
      mutation ExecuteCommand($input: String!) {
        executeCommand(input: $input) {
          success
          message
          outputType
          chartOptions
          route {
            symbol
            interval
          }
        }
      }
    `, { input: 'STOCK:NASDAQ:AAPL COMMAND:CHART -interval daily' });

    const execResult = result?.data?.executeCommand;
    console.log(`Success: ${execResult?.success}`);
    console.log(`OutputType: ${execResult?.outputType}`);

    if (execResult?.chartOptions) {
      let chartOpts = execResult.chartOptions;
      // Parse if string
      if (typeof chartOpts === 'string') {
        chartOpts = JSON.parse(chartOpts);
      }

      const dataZoom = chartOpts?.dataZoom;
      if (dataZoom && dataZoom.length > 0) {
        const zoom = dataZoom[0];
        console.log('\nDataZoom configuration from backend:');
        console.log(`  type: ${zoom.type}`);
        console.log(`  rangeMode: ${JSON.stringify(zoom.rangeMode)}`);
        console.log(`  start: ${zoom.start}`);
        console.log(`  end: ${zoom.end}`);
        console.log(`  endValue: ${zoom.endValue}`);
        console.log(`  moveOnMouseMove: ${zoom.moveOnMouseMove}`);

        const hasRangeMode = zoom.rangeMode !== undefined;
        const hasEndValue = zoom.endValue !== undefined;

        console.log(`\n${hasRangeMode ? '✅' : '❌'} rangeMode: ${hasRangeMode ? 'present' : 'NOT present (needed for lockToRight)'}`);
        console.log(`${hasEndValue ? '✅' : '❌'} endValue: ${hasEndValue ? 'present' : 'NOT present (needed for lockToRight)'}`);

        return { works: true, hasRangeMode, hasEndValue };
      } else {
        console.log('⚠️ No dataZoom in chartOptions');
        return { works: true, hasRangeMode: false, hasEndValue: false };
      }
    } else {
      console.log('⚠️ No chartOptions in response (may need to wait for data fetch)');
      return { works: true, hasRangeMode: false, hasEndValue: false };
    }
  } catch (e) {
    console.log('❌ CHART command failed:', e.message);
    return { works: false, hasRangeMode: false, hasEndValue: false };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Backend Feature Verification for Frontend Requirements');
  console.log('='.repeat(60));

  const results = {};

  results.recentSymbols = await testRecentSymbols();
  results.commandMetadata = await testCommandMetadata();
  results.stockPriceConnection = await testStockPriceConnection();
  results.commandHistory = await testCommandHistory();
  results.dataZoomConfig = await testDataZoomConfig();

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  console.log('\n1. recentSymbols:');
  console.log(`   Query works: ${results.recentSymbols.works ? '✅' : '❌'}`);
  console.log(`   marketCap populated: ${results.recentSymbols.hasMarketCap ? '✅' : '❌'}`);

  console.log('\n2. commandMetadata:');
  console.log(`   Query exists: ${results.commandMetadata.works ? '✅' : '❌'}`);
  console.log(`   Has parameters: ${results.commandMetadata.hasParameters ? '✅' : '❌'}`);

  console.log('\n3. stockPriceConnection:');
  console.log(`   Query works: ${results.stockPriceConnection.works ? '✅' : '❌'}`);
  console.log(`   splitCoefficient field: ${results.stockPriceConnection.hasSplitCoeff ? '✅' : '⚠️ (may be null in sample)'}`);
  console.log(`   dividendAmount field: ${results.stockPriceConnection.hasDividendAmt ? '✅' : '⚠️ (may be null in sample)'}`);

  console.log('\n4. commandHistory:');
  console.log(`   Query works: ${results.commandHistory.works ? '✅' : '❌'}`);
  console.log(`   uniqueLatest dedup: ${results.commandHistory.dedupWorks ? '✅' : '❌'}`);
  console.log(`   executionCount: ${results.commandHistory.hasExecutionCount ? '✅' : '⚠️'}`);

  console.log('\n5. dataZoom (lockToRight):');
  console.log(`   CHART works: ${results.dataZoomConfig.works ? '✅' : '❌'}`);
  console.log(`   rangeMode in response: ${results.dataZoomConfig.hasRangeMode ? '✅' : '❌ NEEDS BACKEND UPDATE'}`);
  console.log(`   endValue in response: ${results.dataZoomConfig.hasEndValue ? '✅' : '❌ NEEDS BACKEND UPDATE'}`);

  console.log('\n');

  return results;
}

main().then((results) => {
  // Write results to file for fe1 document
  const outputPath = path.join(__dirname, '../logs/ai_link/test_results.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Results written to ${outputPath}`);
  process.exit(0);
}).catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});

