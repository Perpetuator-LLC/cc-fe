/**
 * Test script to check pulse data
 * Usage: node scripts/test-pulses.cjs
 */
const { graphqlQuery } = require('./lib/test-utils.cjs');

async function testPulses() {
  console.log('=== Testing Pulses API ===\n');

  // Get pulse configs first
  const configData = await graphqlQuery(`
    query {
      pulseConfigs(first: 5) {
        edges {
          node {
            uuid
            name
            lastGeneratedAt
          }
        }
      }
    }
  `);

  const configs = configData.pulseConfigs?.edges?.map(e => e.node) || [];
  console.log(`Found ${configs.length} pulse configs:\n`);

  for (const config of configs) {
    console.log(`Config: ${config.name} (${config.uuid.slice(0, 8)}...)`);
    console.log(`  Last Generated: ${config.lastGeneratedAt || 'Never'}`);

    // Get pulses for this config
    const pulsesData = await graphqlQuery(`
      query GetPulses($configUuid: UUID) {
        pulses(configUuid: $configUuid, first: 3) {
          edges {
            node {
              uuid
              title
              status
              audioUrl
              audioDurationSeconds
              wordCount
              createdAt
            }
          }
        }
      }
    `, { configUuid: config.uuid });

    const pulses = pulsesData.pulses?.edges?.map(e => e.node) || [];
    console.log(`  Pulses: ${pulses.length}`);

    pulses.forEach((pulse, i) => {
      console.log(`    [${i + 1}] ${pulse.title}`);
      console.log(`        Status: "${pulse.status}" (type: ${typeof pulse.status})`);
      console.log(`        AudioUrl: ${pulse.audioUrl ? pulse.audioUrl.slice(0, 50) + '...' : 'NULL'}`);
      console.log(`        Duration: ${pulse.audioDurationSeconds}s, Words: ${pulse.wordCount}`);

      // Check play button condition
      const canPlay = pulse.audioUrl && pulse.status === 'READY';
      console.log(`        Can Play (audioUrl && status === 'READY'): ${canPlay}`);
    });

    console.log('');
  }

  console.log('=== Test Complete ===');
}

testPulses().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
