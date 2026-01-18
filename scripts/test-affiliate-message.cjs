#!/usr/bin/env node
/**
 * Test Affiliate Custom Message API
 *
 * Tests the updateAffiliateProfile mutation to verify custom message saving
 *
 * Usage: node scripts/test-affiliate-message.cjs
 *
 * Copyright (c) 2025-2026 Perpetuator LLC
 */

const { graphqlQuery } = require('./lib/test-utils.cjs');

async function test() {
  console.log('=== Affiliate Custom Message API Test ===\n');

  // Step 1: Get current profile
  console.log('1. Getting current profile...');
  try {
    const profile = await graphqlQuery(`
      query {
        affiliateProfile {
          uuid
          code
          customMessage
        }
      }
    `);
    console.log('Current profile:', JSON.stringify(profile, null, 2));

    if (!profile.affiliateProfile) {
      console.log('\nNo affiliate profile found. User may not be an affiliate.');
      return;
    }

    const originalMessage = profile.affiliateProfile.customMessage;
    console.log(`\nOriginal customMessage: "${originalMessage || '(null)'}"`);

    // Step 2: Update with a test message
    const testMessage = `Test Message ${Date.now()}`;
    console.log(`\n2. Updating with test message: "${testMessage}"...`);

    const updateResult = await graphqlQuery(`
      mutation UpdateAffiliateProfile($customMessage: String) {
        updateAffiliateProfile(customMessage: $customMessage) {
          success
          message
          affiliateProfile {
            uuid
            customMessage
          }
        }
      }
    `, { customMessage: testMessage });

    console.log('Update result:', JSON.stringify(updateResult, null, 2));

    if (!updateResult.updateAffiliateProfile?.success) {
      console.log('\n❌ Update failed!');
      return;
    }

    const returnedMessage = updateResult.updateAffiliateProfile.affiliateProfile?.customMessage;
    console.log(`\nReturned customMessage: "${returnedMessage || '(null)'}"`);

    if (returnedMessage === testMessage) {
      console.log('✅ Message correctly returned in mutation response!');
    } else {
      console.log('❌ Message mismatch in mutation response!');
      console.log(`   Expected: "${testMessage}"`);
      console.log(`   Got: "${returnedMessage}"`);
    }

    // Step 3: Verify by re-fetching
    console.log('\n3. Verifying by re-fetching profile...');
    const profile2 = await graphqlQuery(`
      query {
        affiliateProfile {
          uuid
          code
          customMessage
        }
      }
    `);

    const verifiedMessage = profile2.affiliateProfile?.customMessage;
    console.log(`Verified customMessage: "${verifiedMessage || '(null)'}"`);

    if (verifiedMessage === testMessage) {
      console.log('✅ Message correctly persisted!');
    } else {
      console.log('❌ Message not persisted correctly!');
      console.log(`   Expected: "${testMessage}"`);
      console.log(`   Got: "${verifiedMessage}"`);
    }

    // Step 4: Restore original message
    console.log('\n4. Restoring original message...');
    await graphqlQuery(`
      mutation UpdateAffiliateProfile($customMessage: String) {
        updateAffiliateProfile(customMessage: $customMessage) {
          success
          message
        }
      }
    `, { customMessage: originalMessage });
    console.log('Original message restored.');

    console.log('\n=== Test Complete ===');

  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Response:', JSON.stringify(err.response, null, 2));
    }
  }
}

test().catch(console.error);
