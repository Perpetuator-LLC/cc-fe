// Test History API - uniqueLatest deduplication
// Usage: node scripts/test-history.cjs [search_term]

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Load environment for backend URL
function loadEnvironment() {
  const envPath = path.join(__dirname, '../src/environments/environment.ts');
  const content = fs.readFileSync(envPath, 'utf-8');

  const wsUrlMatch = content.match(/wsUrl:\s*['"]([^'"]+)['"]/);
  const wsUrl = wsUrlMatch ? wsUrlMatch[1] : 'ws://127.0.0.1:8000/ws/graphql/';

  return { wsUrl };
}

// Load tokens
function loadTokens() {
  const tokenPath = path.join(process.env.HOME, '.capital-copilot/cli-tokens.json');
  if (!fs.existsSync(tokenPath)) {
    throw new Error('No tokens found. Run another test first to authenticate.');
  }
  return JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
}

const HISTORY_QUERY = `
  query GetCommandHistory($first: Int, $search: String, $uniqueLatest: Boolean) {
    commandHistory(first: $first, search: $search, uniqueLatest: $uniqueLatest) {
      edges {
        node {
          id
          rawInput
          parsedCommand
          status
          createdAt
        }
        cursor
        executionCount
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

async function testHistory(searchTerm = '') {
  const env = loadEnvironment();
  const tokens = loadTokens();

  const wsUrl = `${env.wsUrl}?token=${tokens.accessToken}`;
  console.log('Connecting to:', wsUrl.substring(0, 50) + '...');

  const ws = new WebSocket(wsUrl);

  return new Promise((resolve, reject) => {
    let queryCount = 0;
    const results = {};

    ws.on('open', () => {
      console.log('Connected, sending connection_init...');
      ws.send(JSON.stringify({ type: 'connection_init' }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'connection_ack') {
        console.log('Connection acknowledged\n');

        // Test 1: Without uniqueLatest (default - should show duplicates)
        console.log('=== Test 1: uniqueLatest=false (default) ===');
        console.log(`Search term: "${searchTerm || '(empty)'}"`);
        ws.send(JSON.stringify({
          id: 'test1',
          type: 'subscribe',
          payload: {
            query: HISTORY_QUERY,
            variables: { first: 20, search: searchTerm || null, uniqueLatest: false }
          }
        }));

        // Test 2: With uniqueLatest=true (should deduplicate)
        console.log('\n=== Test 2: uniqueLatest=true (deduplicated) ===');
        console.log(`Search term: "${searchTerm || '(empty)'}"`);
        ws.send(JSON.stringify({
          id: 'test2',
          type: 'subscribe',
          payload: {
            query: HISTORY_QUERY,
            variables: { first: 20, search: searchTerm || null, uniqueLatest: true }
          }
        }));
      }

      if (msg.type === 'next') {
        const testId = msg.id;
        const data = msg.payload?.data?.commandHistory;

        if (data) {
          results[testId] = data;
          queryCount++;

          console.log(`\n--- ${testId} Results ---`);
          console.log(`Total count: ${data.totalCount}`);
          console.log(`Edges returned: ${data.edges?.length || 0}`);
          console.log(`Has next page: ${data.pageInfo?.hasNextPage}`);

          // Show commands
          if (data.edges?.length > 0) {
            console.log('\nCommands:');
            data.edges.forEach((edge, i) => {
              const execCount = edge.executionCount ? ` (×${edge.executionCount})` : '';
              console.log(`  ${i + 1}. ${edge.node.rawInput}${execCount}`);
            });

            // Check for duplicates
            const rawInputs = data.edges.map(e => e.node.rawInput);
            const uniqueInputs = new Set(rawInputs);
            if (uniqueInputs.size < rawInputs.length) {
              console.log(`\n⚠️  DUPLICATES FOUND: ${rawInputs.length - uniqueInputs.size} duplicate(s)`);

              // Show which ones are duplicated
              const counts = {};
              rawInputs.forEach(input => {
                counts[input] = (counts[input] || 0) + 1;
              });
              Object.entries(counts).forEach(([input, count]) => {
                if (count > 1) {
                  console.log(`     "${input}" appears ${count} times`);
                }
              });
            } else {
              console.log('\n✅ No duplicates in returned results');
            }
          }

          // Close after both tests complete
          if (queryCount >= 2) {
            console.log('\n\n=== Summary ===');
            const test1Count = results['test1']?.edges?.length || 0;
            const test2Count = results['test2']?.edges?.length || 0;
            console.log(`uniqueLatest=false: ${test1Count} results (totalCount: ${results['test1']?.totalCount})`);
            console.log(`uniqueLatest=true:  ${test2Count} results (totalCount: ${results['test2']?.totalCount})`);

            if (test1Count > test2Count) {
              console.log(`\n✅ Deduplication working: ${test1Count - test2Count} fewer results with uniqueLatest=true`);
            } else if (test1Count === test2Count && test1Count > 0) {
              console.log('\n⚠️  Same count - either no duplicates in data or deduplication not working');
              console.log('   Check if the rawInput values are actually identical (case-sensitive)');
            }

            ws.close();
            resolve(results);
          }
        }
      }

      if (msg.type === 'error') {
        console.error('Error:', JSON.stringify(msg.payload, null, 2));
        ws.close();
        reject(new Error('Query failed'));
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
      reject(err);
    });

    ws.on('close', () => {
      console.log('\nConnection closed');
    });

    // Timeout
    setTimeout(() => {
      console.log('\nTimeout - closing connection');
      ws.close();
      resolve(results);
    }, 10000);
  });
}

// Run test
const searchTerm = process.argv[2] || '';
console.log('=== History Deduplication Test ===\n');

testHistory(searchTerm)
  .then(() => {
    console.log('\nTest complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });

