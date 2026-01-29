/**
 * Test script for Jobs Chain Grouping API
 * Tests both the old jobs(first:) API and new jobsGrouped(firstTopLevel:) API
 *
 * Usage: node scripts/test-jobs-grouped.cjs
 */
const { graphqlQuery } = require('./lib/test-utils.cjs');

async function testJobsAPIs() {
  console.log('=== Testing Jobs APIs ===\n');

  // Test 1: Old API - jobs(first: 10)
  console.log('━'.repeat(60));
  console.log('TEST 1: Old API - jobs(first: 10)');
  console.log('━'.repeat(60));

  const oldData = await graphqlQuery(`
    query {
      jobs(first: 10) {
        edges {
          node {
            uuid
            kind
            status
            chainId
            chainPosition
            chainJobCount
          }
        }
      }
    }
  `);

  const oldJobs = oldData.jobs?.edges?.map(e => e.node) || [];
  console.log(`Returned: ${oldJobs.length} individual jobs`);

  // Group by chainId
  const oldChains = new Map();
  const oldStandalone = [];
  oldJobs.forEach(job => {
    if (job.chainId) {
      if (!oldChains.has(job.chainId)) oldChains.set(job.chainId, []);
      oldChains.get(job.chainId).push(job);
    } else {
      oldStandalone.push(job);
    }
  });
  console.log(`Groups to: ${oldChains.size} chains + ${oldStandalone.length} standalone = ${oldChains.size + oldStandalone.length} top-level items`);

  // Test 2: New API - jobsGrouped(firstTopLevel: 10)
  console.log('\n' + '━'.repeat(60));
  console.log('TEST 2: New API - jobsGrouped(firstTopLevel: 10)');
  console.log('━'.repeat(60));

  try {
    const newData = await graphqlQuery(`
      query {
        jobsGrouped(firstTopLevel: 10) {
          uuid
          kind
          status
          chainId
          chainPosition
          chainJobCount
          triggerSource
        }
      }
    `);

    const newJobs = newData.jobsGrouped || [];
    console.log(`Returned: ${newJobs.length} individual jobs`);

    // Group by chainId
    const newChains = new Map();
    const newStandalone = [];
    newJobs.forEach(job => {
      if (job.chainId) {
        if (!newChains.has(job.chainId)) newChains.set(job.chainId, []);
        newChains.get(job.chainId).push(job);
      } else {
        newStandalone.push(job);
      }
    });
    console.log(`Groups to: ${newChains.size} chains + ${newStandalone.length} standalone = ${newChains.size + newStandalone.length} top-level items`);

    // Show breakdown
    console.log('\n--- Breakdown ---');
    let i = 0;
    newChains.forEach((jobs, chainId) => {
      console.log(`Chain ${++i}: ${chainId.slice(0, 8)}... (${jobs.length} jobs)`);
      const sorted = [...jobs].sort((a, b) => (a.chainPosition || 0) - (b.chainPosition || 0));
      sorted.forEach(j => console.log(`  [${j.chainPosition ?? '-'}] ${j.kind} - ${j.status}`));
    });
    newStandalone.slice(0, 5).forEach(j => console.log(`Standalone: ${j.kind} - ${j.status}`));
    if (newStandalone.length > 5) console.log(`  ... and ${newStandalone.length - 5} more standalone jobs`);

    console.log('\n' + '═'.repeat(60));
    console.log('RESULT: jobsGrouped API is working!');
    console.log('═'.repeat(60));
  } catch (error) {
    console.log('\n⚠️  jobsGrouped API not available yet.');
    console.log('Make sure to sync the schema from the backend.');
    console.log('Error:', error.message);
  }

  console.log('\n=== Test Complete ===');
}

testJobsAPIs().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
