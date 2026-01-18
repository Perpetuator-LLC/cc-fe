#!/usr/bin/env node
/**
 * Test Episode Creation Job Timing
 *
 * This script calls createLatestEpisodeChain and monitors job updates via WebSocket
 * to diagnose timing issues between job creation and status updates.
 *
 * Usage: node scripts/test-episode-job-timing.cjs [podcastUuid]
 *
 * If no podcast UUID is provided, fetches the first available podcast.
 *
 * Copyright (c) 2025-2026 Perpetuator LLC
 */

const { getAccessToken, loadEnvironment, graphqlQuery } = require('./lib/test-utils.cjs');
const WebSocket = require('ws');

const podcastUuidArg = process.argv[2];
const TIMEOUT = 180000; // 3 minutes max

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  magenta: '\x1b[35m',
};

function log(msg, color = 'reset') {
  const ts = new Date().toISOString().substring(11, 23);
  console.log(`${colors.dim}[${ts}]${colors.reset} ${colors[color]}${msg}${colors.reset}`);
}

async function getPodcastUuid() {
  if (podcastUuidArg) return podcastUuidArg;

  log('Fetching first podcast...', 'dim');
  const result = await graphqlQuery(`
    query {
      podcasts(first: 1) {
        edges {
          node {
            uuid
            name
          }
        }
      }
    }
  `);

  const podcast = result.podcasts?.edges?.[0]?.node;
  if (!podcast) {
    throw new Error('No podcasts found. Create a podcast first.');
  }

  log(`Using podcast: ${podcast.name} (${podcast.uuid})`, 'cyan');
  return podcast.uuid;
}

async function main() {
  console.log('\n=== Episode Job Timing Diagnostic ===\n');

  const env = loadEnvironment();
  const token = await getAccessToken();
  const podcastUuid = await getPodcastUuid();

  const wsProtocol = env.API_URL.startsWith('https') ? 'wss' : 'ws';
  const wsHost = env.API_URL.replace(/^https?:\/\//, '');
  const wsUrl = `${wsProtocol}://${wsHost}/ws/graphql/?token=${token}`;

  log('Connecting to WebSocket...', 'dim');

  const ws = new WebSocket(wsUrl, ['graphql-transport-ws']);

  let connected = false;
  let mutationSent = false;
  let startTime = null;
  let jobUpdates = [];
  let createdJobIds = new Set();

  const timeout = setTimeout(() => {
    log('Timeout reached, closing...', 'yellow');
    printSummary();
    ws.close();
    process.exit(0);
  }, TIMEOUT);

  function printSummary() {
    console.log('\n=== Job Update Timeline ===\n');

    if (jobUpdates.length === 0) {
      log('No job updates received!', 'red');
      return;
    }

    // Group by job UUID
    const jobsById = {};
    for (const update of jobUpdates) {
      const job = update.job;
      if (!job?.uuid) continue;
      if (!jobsById[job.uuid]) {
        jobsById[job.uuid] = [];
      }
      jobsById[job.uuid].push(update);
    }

    for (const [uuid, updates] of Object.entries(jobsById)) {
      const shortId = uuid.slice(0, 8);
      const kind = updates[0]?.job?.kind || 'unknown';
      console.log(`\nJob ${shortId} (${kind}):`);
      console.log('-'.repeat(70));

      let prevTime = startTime;
      for (const u of updates) {
        const delta = prevTime ? (u.time - prevTime) : 0;
        const elapsed = startTime ? (u.time - startTime) : 0;
        const status = u.job?.status || 'unknown';
        const eventType = u.typename;
        console.log(`  ${u.time.toISOString().substring(11, 23)} [+${elapsed.toString().padStart(6)}ms] (Δ${delta.toString().padStart(5)}ms) ${eventType}: ${status}`);
        prevTime = u.time;
      }
    }

    console.log('\n');
  }

  ws.on('open', () => {
    log('WebSocket opened, sending connection_init', 'green');
    ws.send(JSON.stringify({
      type: 'connection_init',
      payload: {}
    }));
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === 'connection_ack') {
      connected = true;
      log('Connection acknowledged', 'green');

      // Wait for initial jobs, then send mutation
      setTimeout(async () => {
        if (!mutationSent) {
          mutationSent = true;
          startTime = new Date();
          log('Calling createLatestEpisodeChain...', 'blue');

          try {
            const result = await graphqlQuery(`
              mutation CreateLatestEpisodeChain($podcastUuid: UUID!) {
                createLatestEpisodeChain(podcastUuid: $podcastUuid) {
                  success
                  message
                  jobs {
                    id
                    uuid
                    kind
                    status
                    error
                    createdAt
                    updatedAt
                  }
                }
              }
            `, { podcastUuid });

            const mutationTime = new Date();
            const mutationElapsed = mutationTime - startTime;

            const response = result.createLatestEpisodeChain;
            if (response?.success) {
              log(`Mutation success: ${response.message}`, 'green');
              log(`Mutation took ${mutationElapsed}ms`, 'dim');
              log(`Jobs created: ${response.jobs?.length || 0}`, 'cyan');

              response.jobs?.forEach(job => {
                createdJobIds.add(job.uuid);
                log(`  - ${job.uuid.slice(0, 8)}: ${job.kind} (${job.status})`, 'dim');
              });
            } else {
              log(`Mutation failed: ${response?.message || 'Unknown error'}`, 'red');
            }
          } catch (err) {
            log(`Mutation error: ${err.message}`, 'red');
          }
        }
      }, 1000);
      return;
    }

    // Job messages via WebSocket
    if (msg.id === '_jobs' && msg.type === 'next') {
      const payload = msg.payload?.data;
      if (!payload) return;

      const typename = payload.__typename;
      const now = new Date();
      const elapsed = startTime ? (now - startTime) : 0;

      if (typename === 'JobsInitial') {
        log(`JobsInitial: ${payload.jobs?.length || 0} active jobs`, 'cyan');
        return;
      }

      const job = payload.job;
      if (!job) return;

      const shortId = job.uuid?.slice(0, 8) || 'unknown';
      const status = job.status;
      const kind = job.kind;

      jobUpdates.push({
        time: now,
        typename,
        job
      });

      let statusColor = 'reset';
      if (status === 'pending') statusColor = 'yellow';
      else if (status === 'running') statusColor = 'blue';
      else if (status === 'completed' || status === 'success') statusColor = 'green';
      else if (status === 'failed') statusColor = 'red';

      log(`${typename} [+${elapsed}ms]: ${shortId} ${kind} -> ${status}`, statusColor);

      // Check if all created jobs are done
      if (createdJobIds.size > 0 && (status === 'completed' || status === 'success' || status === 'failed')) {
        // Count how many jobs are done
        const doneJobs = new Set();
        for (const update of jobUpdates) {
          const s = update.job?.status;
          if (s === 'completed' || s === 'success' || s === 'failed') {
            doneJobs.add(update.job?.uuid);
          }
        }

        // Check if all created jobs have completed
        let allDone = true;
        for (const id of createdJobIds) {
          if (!doneJobs.has(id)) {
            allDone = false;
            break;
          }
        }

        if (allDone) {
          log('All jobs completed!', 'green');
          setTimeout(() => {
            printSummary();
            clearTimeout(timeout);
            ws.close();
            process.exit(0);
          }, 2000);
        }
      }
    }
  });

  ws.on('error', (err) => {
    log(`WebSocket error: ${err.message}`, 'red');
  });

  ws.on('close', () => {
    log('WebSocket closed', 'dim');
    clearTimeout(timeout);
  });
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
