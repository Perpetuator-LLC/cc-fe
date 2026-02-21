// Test script to debug job types from backend
const { graphqlQuery, loadEnvironment } = require('./lib/test-utils.cjs');

async function testJobTypes() {
  try {
    console.log('Fetching recent jobs from backend...\n');

    const query = `
      query {
        jobsGrouped(firstTopLevel: 10) {
          uuid
          kind
          status
          cost
          createdAt
          updatedAt
          chainJobs {
            uuid
            kind
            status
            cost
          }
        }
      }
    `;

    const data = await graphqlQuery(query);

    if (!data.jobsGrouped || data.jobsGrouped.length === 0) {
      console.log('No jobs found.');
      return;
    }

    console.log(`Found ${data.jobsGrouped.length} top-level jobs:\n`);

    data.jobsGrouped.forEach((job, i) => {
      console.log(`Job ${i + 1}:`);
      console.log(`  UUID: ${job.uuid}`);
      console.log(`  Kind: "${job.kind}" (type: ${typeof job.kind})`);
      console.log(`  Status: ${job.status}`);
      console.log(`  Cost: ${job.cost}`);
      console.log(`  Created: ${job.createdAt}`);

      if (job.chainJobs && job.chainJobs.length > 0) {
        console.log(`  Chain Jobs (${job.chainJobs.length}):`);
        job.chainJobs.forEach((cj, j) => {
          console.log(`    [${j}] Kind: "${cj.kind}", Status: ${cj.status}, Cost: ${cj.cost}`);
        });
      }
      console.log('');
    });

    // Check for any unknown job types
    const knownTypes = [
      'FETCH_NEWS', 'EXTRACT_NEWS', 'SUMMARIZE_NEWS', 'VALIDATE_NEWS',
      'CREATE_EPISODE', 'SELECT_UNUSED_NEWS', 'UPDATE_EPISODE_AUDIO',
      'PUBLISH_EPISODE_AUDIO', 'VALIDATE_EPISODE', 'VALIDATE_EPISODE_COMPLIANCE',
      'VALIDATE_EPISODE_FACTS', 'VALIDATE_EPISODE_LENGTH',
      'PUBLISH_LATEST_EPISODE_CHAIN', 'REFRESH_STOCK_LISTINGS',
      'SCHEDULE_JOB', 'CANCEL_SCHEDULED_JOB',
      'FETCH_COMPANY_INFO', 'FETCH_STOCK_PRICES', 'FETCH_BALANCE_SHEET',
      'FETCH_INCOME_STATEMENT', 'FETCH_CASH_FLOW', 'FETCH_EARNINGS',
      'CREATE_RESEARCH_TOPIC', 'RESEARCH_TOPIC', 'VALIDATE_RESEARCH',
      'GENERATE_RESEARCH_TRANSCRIPT', 'CREATE_RESEARCH_EPISODE',
      'PUBLISH_RESEARCH_TOPIC_EPISODE_CHAIN',
      'GENERATE_PODCAST', 'GENERATE_PODCAST_IMAGE', 'GENERATE_IMAGE',
      'GENERATE_PULSE', 'FETCH_PULSE_NEWS', 'RESEARCH_PULSE_CONTENT',
      'CREATE_PULSE_TRANSCRIPT', 'VALIDATE_PULSE', 'GENERATE_PULSE_AUDIO',
      'DELIVER_PULSE', 'PUBLISH_PULSE_CHAIN',
      'CREATE_RECORDING', 'GENERATE_TEXT_TO_SPEECH',
      'TEST_PRINT', 'TEST_RAISE'
    ];

    const allKinds = new Set();
    data.jobsGrouped.forEach(job => {
      allKinds.add(job.kind);
      if (job.chainJobs) {
        job.chainJobs.forEach(cj => allKinds.add(cj.kind));
      }
    });

    console.log('=== Analysis ===');
    console.log('All job kinds found:', [...allKinds]);

    const unknownKinds = [...allKinds].filter(k => !knownTypes.includes(k?.toUpperCase?.()));
    if (unknownKinds.length > 0) {
      console.log('\n⚠️  UNKNOWN JOB TYPES:', unknownKinds);
    } else {
      console.log('\n✅ All job types are known');
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testJobTypes();

