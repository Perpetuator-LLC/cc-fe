#!/usr/bin/env node
// Copyright (c) 2026 Perpetuator LLC
// Test script for public blogs API (unauthenticated HTTP endpoints)

const { loadEnvironment, graphqlQuery, getAccessToken } = require('./lib/test-utils.cjs');

async function testPublicBlogsAPI() {
  const env = loadEnvironment();
  const API_URL = env.API_URL;

  console.log('='.repeat(60));
  console.log('Testing Public Blogs API');
  console.log('='.repeat(60));
  console.log(`API URL: ${API_URL}\n`);

  // Test 1: Public /blogs/ endpoint (unauthenticated)
  console.log('1. Testing PUBLIC /blogs/ endpoint (no auth)...');
  try {
    const response = await fetch(`${API_URL}/blogs/`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log(`   Response:`, JSON.stringify(data, null, 2));

    if (data.blogs && data.blogs.length > 0) {
      console.log(`   ✅ Found ${data.blogs.length} public blog(s)`);
    } else {
      console.log(`   ⚠️  No public blogs returned`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // Test 2: GraphQL blogs query (authenticated)
  console.log('\n2. Testing AUTHENTICATED GraphQL blogs query...');
  try {
    const result = await graphqlQuery(`
      query {
        blogs {
          id
          name
          slug
          enabled
          status
          articleCount
          createdAt
        }
      }
    `);
    console.log(`   Response:`, JSON.stringify(result, null, 2));

    if (result.blogs && result.blogs.length > 0) {
      console.log(`\n   Found ${result.blogs.length} blog(s) via authenticated query:`);
      result.blogs.forEach((blog, i) => {
        console.log(`   ${i + 1}. "${blog.name}" (slug: ${blog.slug})`);
        console.log(`      - enabled: ${blog.enabled}`);
        console.log(`      - status: ${blog.status}`);
        console.log(`      - articleCount: ${blog.articleCount}`);
      });
    } else {
      console.log(`   ⚠️  No blogs returned from authenticated query`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // Test 3: Public /articles/ endpoint (unauthenticated)
  console.log('\n3. Testing PUBLIC /articles/ endpoint (no auth)...');
  try {
    const response = await fetch(`${API_URL}/articles/?limit=5`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log(`   Response:`, JSON.stringify(data, null, 2));

    if (data.articles && data.articles.length > 0) {
      console.log(`   ✅ Found ${data.articles.length} public article(s)`);
    } else {
      console.log(`   ⚠️  No public articles returned`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // Test 4: GraphQL articles query (authenticated)
  console.log('\n4. Testing AUTHENTICATED GraphQL articles query...');
  try {
    const result = await graphqlQuery(`
      query {
        articles(limit: 5) {
          id
          title
          slug
          status
          createdAt
          blog {
            id
            name
            enabled
          }
        }
      }
    `);
    console.log(`   Response:`, JSON.stringify(result, null, 2));

    if (result.articles && result.articles.length > 0) {
      console.log(`\n   Found ${result.articles.length} article(s) via authenticated query:`);
      result.articles.forEach((article, i) => {
        console.log(`   ${i + 1}. "${article.title}"`);
        console.log(`      - status: ${article.status}`);
        console.log(`      - blog: ${article.blog?.name} (enabled: ${article.blog?.enabled})`);
      });
    } else {
      console.log(`   ⚠️  No articles returned from authenticated query`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`
For a blog to appear on the public /blogs page:
  - Blog must have: enabled = true

For an article to appear publicly:
  - Article must have: status = "published"
  - Parent blog must have: enabled = true

If blogs exist via authenticated query but NOT via public endpoint,
the blog's "enabled" flag is probably false.
`);
}

testPublicBlogsAPI().catch(console.error);

