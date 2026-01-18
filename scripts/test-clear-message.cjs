#!/usr/bin/env node
/**
 * Test clearing custom message (setting to null/empty)
 */
const { graphqlQuery } = require('./lib/test-utils.cjs');

async function test() {
  console.log('=== Test Clearing Custom Message ===\n');

  // Get current
  const p1 = await graphqlQuery(`query { affiliateProfile { customMessage } }`);
  console.log('1. Current:', p1.affiliateProfile?.customMessage);

  // Set a value first
  console.log('\n2. Setting to "Test Value"...');
  const r1 = await graphqlQuery(`
    mutation { updateAffiliateProfile(customMessage: "Test Value") {
      success message affiliateProfile { customMessage }
    }}
  `);
  console.log('   Result:', r1.updateAffiliateProfile?.affiliateProfile?.customMessage);

  // Now try to clear it with null
  console.log('\n3. Clearing with null...');
  const r2 = await graphqlQuery(`
    mutation { updateAffiliateProfile(customMessage: null) {
      success message affiliateProfile { customMessage }
    }}
  `);
  console.log('   Success:', r2.updateAffiliateProfile?.success);
  console.log('   Message:', r2.updateAffiliateProfile?.message);
  console.log('   Result:', r2.updateAffiliateProfile?.affiliateProfile?.customMessage);

  // Verify
  const p2 = await graphqlQuery(`query { affiliateProfile { customMessage } }`);
  console.log('\n4. Verify after clear:', p2.affiliateProfile?.customMessage);

  // Try with empty string
  console.log('\n5. Setting value again...');
  await graphqlQuery(`mutation { updateAffiliateProfile(customMessage: "Another Test") { success }}`);

  console.log('6. Clearing with empty string ""...');
  const r3 = await graphqlQuery(`
    mutation { updateAffiliateProfile(customMessage: "") {
      success message affiliateProfile { customMessage }
    }}
  `);
  console.log('   Success:', r3.updateAffiliateProfile?.success);
  console.log('   Result:', r3.updateAffiliateProfile?.affiliateProfile?.customMessage);

  console.log('\n=== Done ===');
}

test().catch(console.error);
