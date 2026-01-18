#!/usr/bin/env node
/**
 * Test Affiliate Landing Page API
 *
 * Tests what the affiliateLanding query returns
 */

const { graphqlQuery } = require('./lib/test-utils.cjs');

async function test() {
  console.log('=== Affiliate Landing API Test ===\n');

  const affiliateCode = process.argv[2] || 'CCA2';
  console.log(`Testing affiliate code: ${affiliateCode}\n`);

  try {
    // Test the affiliateLanding query (public, no auth needed)
    const result = await graphqlQuery(`
      query GetAffiliateLanding($affiliateCode: String!) {
        affiliateLanding(affiliateCode: $affiliateCode) {
          affiliateCode
          affiliateUsername
          brandImageUrl
          customMessage
        }
      }
    `, { affiliateCode });

    console.log('affiliateLanding response:');
    console.log(JSON.stringify(result, null, 2));

    if (result.affiliateLanding) {
      const landing = result.affiliateLanding;
      console.log('\n--- Summary ---');
      console.log(`Code: ${landing.affiliateCode}`);
      console.log(`Username: ${landing.affiliateUsername}`);
      console.log(`Custom Message: "${landing.customMessage || '(null)'}"`);
      console.log(`Brand Image: ${landing.brandImageUrl || '(none)'}`);

      // What the landing page should show
      const displayMessage = landing.customMessage || `Join ${landing.affiliateUsername}'s Network`;
      console.log(`\nExpected display: "${displayMessage}"`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

test().catch(console.error);
