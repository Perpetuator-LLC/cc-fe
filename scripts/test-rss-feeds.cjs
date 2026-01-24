/**
 * Test RSS Feed queries
 */
const { graphqlQuery } = require('./lib/test-utils.cjs');

async function testRssFeedQueries() {
  console.log('=== Testing RSS Feed Queries ===\n');

  // Test 1: Existing rssFeeds query (Relay connection)
  console.log('1. Testing existing rssFeeds query (first 5)...');
  try {
    const result = await graphqlQuery(`
      query {
        rssFeeds(first: 5) {
          edges {
            node {
              uuid
              url
              name
              isReachable
              isParsable
              articlesPerDay
            }
          }
        }
      }
    `);
    console.log('   Found', result.rssFeeds.edges.length, 'feeds');
    result.rssFeeds.edges.forEach((e, i) => {
      console.log(`   ${i+1}. ${e.node.name || 'No Name'} | ${e.node.url.substring(0, 50)}...`);
    });
  } catch (e) {
    console.error('   ERROR:', e.message);
  }

  // Test 2: Try the new searchRssFeeds query
  console.log('\n2. Testing searchRssFeeds query (if available)...');
  try {
    const result = await graphqlQuery(`
      query {
        searchRssFeeds(query: "tech", limit: 5) {
          uuid
          url
          name
          articlesPerDay
        }
      }
    `);
    console.log('   Found', result.searchRssFeeds.length, 'feeds');
    result.searchRssFeeds.forEach((feed, i) => {
      console.log(`   ${i+1}. ${feed.name || 'No Name'} | ${feed.url.substring(0, 50)}...`);
    });
  } catch (e) {
    console.error('   ERROR:', e.message);
  }

  // Test 3: Try rssFeedsList query
  console.log('\n3. Testing rssFeedsList query (if available)...');
  try {
    const result = await graphqlQuery(`
      query {
        rssFeedsList(onlyValid: true) {
          uuid
          url
          name
          articlesPerDay
        }
      }
    `);
    console.log('   Found', result.rssFeedsList.length, 'feeds');
    if (result.rssFeedsList.length > 0) {
      console.log('   First 5:');
      result.rssFeedsList.slice(0, 5).forEach((feed, i) => {
        console.log(`   ${i+1}. ${feed.name || 'No Name'} | ${feed.url.substring(0, 50)}...`);
      });
    }
  } catch (e) {
    console.error('   ERROR:', e.message);
  }

  console.log('\n=== Test Complete ===');
}

testRssFeedQueries().catch(console.error);
