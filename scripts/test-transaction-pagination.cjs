/**
 * Test transaction pagination APIs
 */
const { graphqlQuery } = require('./lib/test-utils.cjs');

async function testTransactionPagination() {
  console.log('=== Testing Transaction Pagination ===\n');

  // Test 1: Get total count
  console.log('1. Testing transactionsCount query...');
  try {
    const countResult = await graphqlQuery(`
      query { transactionsCount }
    `);
    console.log('   Total transactions:', countResult.transactionsCount);
  } catch (e) {
    console.error('   ERROR:', e.message);
  }

  // Test 2: Get first page with dates (default order)
  console.log('\n2. Testing first page with dates (default order)...');
  try {
    const page1 = await graphqlQuery(`
      query {
        transactions(first: 5) {
          pageInfo { hasNextPage endCursor }
          edges { node { uuid createdAt transactionType creditAmount balance } }
        }
      }
    `);
    console.log('   Items returned:', page1.transactions.edges.length);
    console.log('   First 5 transactions:');
    page1.transactions.edges.forEach((e, i) => {
      console.log(`     ${i+1}. ${e.node.createdAt} | ${e.node.transactionType} | ${e.node.creditAmount} | bal: ${e.node.balance}`);
    });
  } catch (e) {
    console.error('   ERROR:', e.message);
  }

  // Test 3: Get first page with ASC order (oldest first)
  console.log('\n3. Testing with orderBy="created_at" (oldest first)...');
  try {
    const oldest = await graphqlQuery(`
      query {
        transactions(first: 5, orderBy: "created_at") {
          pageInfo { hasNextPage endCursor }
          edges { node { uuid createdAt transactionType creditAmount balance } }
        }
      }
    `);
    console.log('   Items returned:', oldest.transactions.edges.length);
    console.log('   Oldest 5 transactions:');
    oldest.transactions.edges.forEach((e, i) => {
      console.log(`     ${i+1}. ${e.node.createdAt} | ${e.node.transactionType} | ${e.node.creditAmount} | bal: ${e.node.balance}`);
    });
  } catch (e) {
    console.error('   ERROR:', e.message);
  }

  // Test 4: Test "last" parameter for reverse pagination
  console.log('\n4. Testing "last" parameter for reverse pagination...');
  try {
    const lastPage = await graphqlQuery(`
      query {
        transactions(last: 5) {
          pageInfo { hasPreviousPage startCursor }
          edges { node { uuid createdAt transactionType creditAmount balance } }
        }
      }
    `);
    console.log('   Items returned:', lastPage.transactions.edges.length);
    console.log('   Last 5 transactions:');
    lastPage.transactions.edges.forEach((e, i) => {
      console.log(`     ${i+1}. ${e.node.createdAt} | ${e.node.transactionType} | ${e.node.creditAmount} | bal: ${e.node.balance}`);
    });
  } catch (e) {
    console.error('   ERROR:', e.message);
  }

  // Test 5: Verify last page with correct item count
  console.log('\n5. Testing last page calculation (like the component would)...');
  try {
    const totalCount = 12655;
    const pageSize = 10;
    const lastPageIndex = Math.ceil(totalCount / pageSize) - 1;
    const remainder = totalCount % pageSize;
    const lastPageSize = remainder === 0 ? pageSize : remainder;

    console.log(`   Total: ${totalCount}, pageSize: ${pageSize}`);
    console.log(`   Last page index: ${lastPageIndex}`);
    console.log(`   Items on last page: ${lastPageSize}`);

    // Get the last N items using 'last' parameter
    const lastPage = await graphqlQuery(`
      query GetLastPage($last: Int!) {
        transactions(last: $last, orderBy: "-created_at") {
          pageInfo { hasPreviousPage startCursor }
          edges { node { uuid createdAt transactionType creditAmount balance } }
        }
      }
    `, { last: lastPageSize });

    console.log(`   Retrieved ${lastPage.transactions.edges.length} items`);
    console.log('   Last page transactions (oldest first after reversal):');
    // The 'last' parameter returns in reverse order, so reverse to get chronological
    const reversed = [...lastPage.transactions.edges].reverse();
    reversed.forEach((e, i) => {
      console.log(`     ${i+1}. ${e.node.createdAt} | ${e.node.transactionType} | ${e.node.creditAmount} | bal: ${e.node.balance}`);
    });
  } catch (e) {
    console.error('   ERROR:', e.message);
  }

  console.log('\n=== Test Complete ===');
}

testTransactionPagination().catch(console.error);
