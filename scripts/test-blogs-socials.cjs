// Copyright (c) 2026 Perpetuator LLC
// Test script for blogs and socials APIs
const { graphqlQuery, loadEnvironment } = require('./lib/test-utils.cjs');

async function testBlogsAndSocials() {
  console.log('Testing Blogs and Socials APIs...\n');

  // Test blogs query
  console.log('1. Testing blogs query...');
  try {
    const blogsResult = await graphqlQuery(`
      query {
        blogs {
          id
          name
          slug
          status
          articleCount
        }
      }
    `);
    console.log('   Blogs:', JSON.stringify(blogsResult, null, 2));
  } catch (err) {
    console.log('   Error:', err.message);
  }

  // Test articles query
  console.log('\n2. Testing articles query...');
  try {
    const articlesResult = await graphqlQuery(`
      query {
        articles(limit: 5) {
          id
          title
          status
          createdAt
          blog {
            name
          }
        }
      }
    `);
    console.log('   Articles:', JSON.stringify(articlesResult, null, 2));
  } catch (err) {
    console.log('   Error:', err.message);
  }

  // Test socialAccounts query
  console.log('\n3. Testing socialAccounts query...');
  try {
    const socialResult = await graphqlQuery(`
      query {
        socialAccounts {
          id
          platform
          accountName
          status
          isActive
          broadcastCount
        }
      }
    `);
    console.log('   Social Accounts:', JSON.stringify(socialResult, null, 2));
  } catch (err) {
    console.log('   Error:', err.message);
  }

  // Test broadcasts query
  console.log('\n4. Testing broadcasts query...');
  try {
    const broadcastsResult = await graphqlQuery(`
      query {
        broadcasts(limit: 5) {
          id
          text
          status
          platform
          createdAt
        }
      }
    `);
    console.log('   Broadcasts:', JSON.stringify(broadcastsResult, null, 2));
  } catch (err) {
    console.log('   Error:', err.message);
  }

  // Test supportedPlatforms query
  console.log('\n5. Testing supportedPlatforms query...');
  try {
    const platformsResult = await graphqlQuery(`
      query {
        supportedPlatforms
      }
    `);
    console.log('   Supported Platforms:', JSON.stringify(platformsResult, null, 2));
  } catch (err) {
    console.log('   Error:', err.message);
  }

  console.log('\n✅ Tests complete!');
}

testBlogsAndSocials().catch(console.error);

