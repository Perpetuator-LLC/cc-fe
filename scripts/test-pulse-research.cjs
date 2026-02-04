#!/usr/bin/env node
/**
 * Test Pulse Research Data (agent actions, news, URLs)
 *
 * Tests what data is returned for pulse research fields:
 * - agentActions
 * - news
 * - researchUrls
 *
 * Copyright (c) 2026 Perpetuator LLC
 */

const { graphqlQuery } = require('./lib/test-utils.cjs');

async function main() {
  console.log('=== Testing Pulse Research Data ===\n');

  // First, get a list of pulses to find one we can test
  console.log('1. Fetching recent pulses...');
  const pulsesQuery = `
    query GetPulses {
      pulses(first: 5) {
        edges {
          node {
            uuid
            title
            status
            createdAt
            agentActions
          }
        }
      }
    }
  `;

  let pulses;
  try {
    pulses = await graphqlQuery(pulsesQuery);
    console.log('   Pulses result:', JSON.stringify(pulses, null, 2));
  } catch (err) {
    console.error('   Error fetching pulses:', err.message);
  }

  // Get a specific pulse with full details
  if (pulses?.pulses?.edges?.length > 0) {
    const firstPulse = pulses.pulses.edges[0].node;
    console.log(`\n2. Fetching full details for pulse: ${firstPulse.uuid}`);
    console.log(`   Title: ${firstPulse.title}`);
    console.log(`   Status: ${firstPulse.status}`);

    // Test the pulse query with all potential fields
    const pulseDetailQuery = `
      query GetPulseDetail($uuid: UUID!) {
        pulse(uuid: $uuid) {
          uuid
          title
          status
          transcript
          agentActions
        }
      }
    `;

    try {
      const pulseDetail = await graphqlQuery(pulseDetailQuery, { uuid: firstPulse.uuid });
      console.log('\n   Pulse Detail Result:');
      console.log('   - uuid:', pulseDetail?.pulse?.uuid);
      console.log('   - title:', pulseDetail?.pulse?.title);
      console.log('   - status:', pulseDetail?.pulse?.status);
      console.log('   - transcript length:', pulseDetail?.pulse?.transcript?.length || 0);
      console.log('   - agentActions:', pulseDetail?.pulse?.agentActions || 'null/undefined');

      // Parse agentActions if it exists
      if (pulseDetail?.pulse?.agentActions) {
        try {
          const actions = JSON.parse(pulseDetail.pulse.agentActions);
          console.log('\n   === Agent Actions Parsed ===');
          console.log(`   Found ${actions.length} actions:`);
          actions.forEach((action, i) => {
            console.log(`   ${i + 1}. ${action.tool} - ${action.status}`);
            if (action.result_summary) {
              console.log(`      Summary: ${action.result_summary}`);
            }
          });
        } catch (e) {
          console.log('   Could not parse agentActions:', e.message);
        }
      }
    } catch (err) {
      console.error('   Error fetching pulse detail:', err.message);
      if (err.graphQLErrors) {
        console.error('   GraphQL Errors:', JSON.stringify(err.graphQLErrors, null, 2));
      }
    }

    // Now test if news field exists - this may fail if schema doesn't have it
    console.log('\n3. Testing if news field exists...');
    const newsQuery = `
      query GetPulseWithNews($uuid: UUID!) {
        pulse(uuid: $uuid) {
          uuid
          title
          news {
            id
            title
            url
          }
        }
      }
    `;

    try {
      const newsResult = await graphqlQuery(newsQuery, { uuid: firstPulse.uuid });
      console.log('   News field exists!');
      console.log('   News items:', newsResult?.pulse?.news?.length || 0);
      if (newsResult?.pulse?.news?.length > 0) {
        console.log('   First news item:', newsResult.pulse.news[0]);
      }
    } catch (err) {
      console.log('   ❌ News field NOT in schema:', err.message);
    }

    // Test if researchUrls field exists
    console.log('\n4. Testing if researchUrls field exists...');
    const urlsQuery = `
      query GetPulseWithUrls($uuid: UUID!) {
        pulse(uuid: $uuid) {
          uuid
          title
          researchUrls
        }
      }
    `;

    try {
      const urlsResult = await graphqlQuery(urlsQuery, { uuid: firstPulse.uuid });
      console.log('   researchUrls field exists!');
      console.log('   URLs:', urlsResult?.pulse?.researchUrls?.length || 0);
      if (urlsResult?.pulse?.researchUrls?.length > 0) {
        urlsResult.pulse.researchUrls.forEach((url, i) => {
          console.log(`   ${i + 1}. ${url}`);
        });
      }
    } catch (err) {
      console.log('   ❌ researchUrls field NOT in schema:', err.message);
    }
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
