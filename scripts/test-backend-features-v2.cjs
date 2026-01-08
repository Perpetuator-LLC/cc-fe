#!/usr/bin/env node
/**
 * Test script to verify backend features for frontend requirements
 * Uses CORRECT schema based on src/app/schema.graphql
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
    // CORRECT schema: uses limit (not first), returns array (not edges)
    const result = await runQuery('recentSymbols', `
      query {
        recentSymbols(limit: 5) {
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
    `);

    const symbols = result?.data?.recentSymbols || [];
    console.log(`Found ${symbols.length} recent symbols`);

    let hasMarketCap = false;
    symbols.forEach((n, i) => {
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

async function testAvailableCommands() {
  console.log('\n=== Test 2: availableCommands (for auto-complete) ===\n');
  try {
    const result = await runQuery('availableCommands', `
      query {
        availableCommands {
          name
          description
          arguments {
            name
            type
            description
            default
            required
            options
          }
        }
      }
    `);

    const commands = result?.data?.availableCommands || [];
    console.log(`Found ${commands.length} commands`);

    // Find CHART command
    const chartCmd = commands.find(c => c.name === 'CHART');
    if (chartCmd) {
      console.log(`\nCHART command arguments:`);
      chartCmd.arguments?.forEach(arg => {
        const opts = arg.options ? `[${arg.options.join(', ')}]` : '';
        console.log(`  - ${arg.name} (${arg.type}): ${opts || 'no options'}`);
      });
    }

    console.log('\n✅ availableCommands works');
    return { works: true, hasCommands: commands.length > 0 };
  } catch (e) {
    console.log('❌ availableCommands failed:', e.message);
    return { works: false, hasCommands: false };
  }
}

async function testStockPriceConnection() {
  console.log('\n=== Test 3: stockPriceConnection with corporate actions ===\n');
  try {
    const result = await runQuery('stockPriceConnection', `
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
              splitCoefficient
              dividendAmount
              isSplit
              isDividend
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
    let hasIsSplit = false;
    let hasIsDividend = false;
    edges.forEach((edge, i) => {
      const n = edge.node;
      console.log(`  [${i}] ${n.date}: split=${n.splitCoefficient} div=${n.dividendAmount} isSplit=${n.isSplit} isDividend=${n.isDividend}`);
      if (n.splitCoefficient !== null && n.splitCoefficient !== undefined) hasSplitCoeff = true;
      if (n.dividendAmount !== null && n.dividendAmount !== undefined) hasDividendAmt = true;
      if (n.isSplit !== null && n.isSplit !== undefined) hasIsSplit = true;
      if (n.isDividend !== null && n.isDividend !== undefined) hasIsDividend = true;
    });

    console.log(`\n✅ stockPriceConnection works`);
    console.log(`${hasSplitCoeff ? '✅' : '⚠️'} splitCoefficient: ${hasSplitCoeff ? 'present' : 'all null'}`);
    console.log(`${hasDividendAmt ? '⚠️' : '⚠️'} dividendAmount: ${hasDividendAmt ? 'present' : 'all null'}`);
    console.log(`${hasIsSplit ? '✅' : '❌'} isSplit: ${hasIsSplit ? 'present' : 'NOT in schema'}`);
    console.log(`${hasIsDividend ? '✅' : '❌'} isDividend: ${hasIsDividend ? 'present' : 'NOT in schema'}`);

    return { works: true, hasSplitCoeff, hasDividendAmt, hasIsSplit, hasIsDividend };
  } catch (e) {
    console.log('❌ stockPriceConnection failed:', e.message);
    return { works: false, hasSplitCoeff: false, hasDividendAmt: false, hasIsSplit: false, hasIsDividend: false };
  }
}

async function testCommandHistory() {
  console.log('\n=== Test 4: commandHistory with uniqueLatest ===\n');
  try {
    const result1 = await runQuery('commandHistory-all', `
      query {
        commandHistory(first: 10) {
          edges {
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

    const result2 = await runQuery('commandHistory-unique', `
      query {
        commandHistory(first: 10, uniqueLatest: true) {
          edges {
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
      const count = edge.executionCount || 1;
      console.log(`  [${i}] ${n.parsedCommand}: "${n.rawInput.substring(0, 40)}..." (x${count})`);
      if (count > 1) hasExecutionCount = true;
    });

    const total1 = result1?.data?.commandHistory?.totalCount || 0;
    const total2 = result2?.data?.commandHistory?.totalCount || 0;
    const dedupWorks = total2 < total1;
    console.log(`\n${dedupWorks ? '✅' : '⚠️'} uniqueLatest dedup: ${total1} → ${total2}`);
    console.log(`${hasExecutionCount ? '✅' : '⚠️'} executionCount: ${hasExecutionCount ? 'populated' : 'not showing >1'}`);

    return { works: true, dedupWorks, hasExecutionCount };
  } catch (e) {
    console.log('❌ commandHistory failed:', e.message);
    return { works: false, dedupWorks: false, hasExecutionCount: false };
  }
}

async function testDataZoomConfig() {
  console.log('\n=== Test 5: CHART command dataZoom configuration ===\n');
  try {
    // CORRECT schema: result is nested under 'result' field
    const result = await runQuery('executeCommand', `
      mutation ExecuteCommand($input: String!) {
        executeCommand(input: $input) {
          success
          message
          result {
            outputType
            chartOptions
            route {
              symbol
              interval
            }
          }
        }
      }
    `, { input: 'STOCK:NASDAQ:AAPL COMMAND:CHART -interval daily' });

    const execResult = result?.data?.executeCommand;
    const cmdResult = execResult?.result;
    console.log(`Success: ${execResult?.success}`);
    console.log(`Message: ${execResult?.message?.substring(0, 100)}`);
    console.log(`OutputType: ${cmdResult?.outputType}`);

    if (cmdResult?.chartOptions) {
      let chartOpts = cmdResult.chartOptions;
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

        console.log(`\n${hasRangeMode ? '✅' : '❌'} rangeMode: ${hasRangeMode ? JSON.stringify(zoom.rangeMode) : 'NOT present'}`);
        console.log(`${hasEndValue ? '✅' : '❌'} endValue: ${hasEndValue ? zoom.endValue : 'NOT present'}`);

        return { works: true, hasRangeMode, hasEndValue };
      } else {
        console.log('⚠️ No dataZoom in chartOptions');
        console.log('chartOptions keys:', Object.keys(chartOpts || {}).slice(0, 10));
        return { works: true, hasRangeMode: false, hasEndValue: false };
      }
    } else {
      console.log('⚠️ No chartOptions in response');
      console.log('result keys:', Object.keys(cmdResult || {}));
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
  results.availableCommands = await testAvailableCommands();
  results.stockPriceConnection = await testStockPriceConnection();
  results.commandHistory = await testCommandHistory();
  results.dataZoomConfig = await testDataZoomConfig();

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  console.log('\n1. recentSymbols:');
  console.log(`   Query works: ${results.recentSymbols.works ? '✅' : '❌'}`);
  console.log(`   marketCap populated: ${results.recentSymbols.hasMarketCap ? '✅' : '❌'}`);

  console.log('\n2. availableCommands:');
  console.log(`   Query works: ${results.availableCommands.works ? '✅' : '❌'}`);
  console.log(`   Has commands: ${results.availableCommands.hasCommands ? '✅' : '❌'}`);

  console.log('\n3. stockPriceConnection:');
  console.log(`   Query works: ${results.stockPriceConnection.works ? '✅' : '❌'}`);
  console.log(`   splitCoefficient: ${results.stockPriceConnection.hasSplitCoeff ? '✅' : '⚠️'}`);
  console.log(`   dividendAmount: ${results.stockPriceConnection.hasDividendAmt ? '✅' : '⚠️'}`);

  console.log('\n4. commandHistory:');
  console.log(`   Query works: ${results.commandHistory.works ? '✅' : '❌'}`);
  console.log(`   uniqueLatest dedup: ${results.commandHistory.dedupWorks ? '✅' : '⚠️'}`);
  console.log(`   executionCount: ${results.commandHistory.hasExecutionCount ? '✅' : '⚠️'}`);

  console.log('\n5. dataZoom (lockToRight):');
  console.log(`   CHART works: ${results.dataZoomConfig.works ? '✅' : '❌'}`);
  console.log(`   rangeMode: ${results.dataZoomConfig.hasRangeMode ? '✅' : '❌ NEEDS BACKEND'}`);
  console.log(`   endValue: ${results.dataZoomConfig.hasEndValue ? '✅' : '❌ NEEDS BACKEND'}`);

  console.log('\n');

  // Write results
  const outputPath = path.join(__dirname, '../logs/ai_link/test_results.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Results written to ${outputPath}`);

  return results;
}

main().then(() => process.exit(0)).catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});

