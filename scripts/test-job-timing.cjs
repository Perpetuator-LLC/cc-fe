#!/usr/bin/env node
/**
 * Test Job Timing - Monitor job status updates in real-time
 *
 * This script executes a command and monitors job updates via WebSocket
 * to diagnose timing issues.
 *
 * Usage: node scripts/test-job-timing.cjs [command]
 *
 * Examples:
 *   node scripts/test-job-timing.cjs "CREATE EPISODE"
 *   node scripts/test-job-timing.cjs "AAPL CHART"
 *
 * Copyright (c) 2025-2026 Perpetuator LLC
 */

const { getAccessToken, loadEnvironment } = require('./lib/test-utils.cjs');
const WebSocket = require('ws');

const command = process.argv[2] || 'AAPL CHART';
const TIMEOUT = 120000; // 2 minutes max

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

async function main() {
  console.log('\n=== Job Timing Diagnostic ===\n');
  log(`Command: "${command}"`, 'cyan');

  const env = loadEnvironment();
  const token = await getAccessToken();

  const wsProtocol = env.API_URL.startsWith('https') ? 'wss' : 'ws';
  const wsHost = env.API_URL.replace(/^https?:\/\//, '');
  const wsUrl = `${wsProtocol}://${wsHost}/ws/graphql/?token=${token}`;

  log(`Connecting to WebSocket...`, 'dim');

  const ws = new WebSocket(wsUrl, ['graphql-transport-ws']);

  let connected = false;
  let commandSent = false;
  let executionId = null;
  let jobUpdates = [];
  let startTime = null;

  const timeout = setTimeout(() => {
    log('Timeout reached, closing...', 'yellow');
    printSummary();
    ws.close();
    process.exit(0);
  }, TIMEOUT);

  function printSummary() {
    console.log('\n=== Job Update Summary ===\n');

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
      console.log('-'.repeat(60));

      let prevTime = startTime;
      for (const u of updates) {
        const delta = prevTime ? (u.time - prevTime) : 0;
        const status = u.job?.status || 'unknown';
        const eventType = u.eventType || u.typename;
        console.log(`  ${u.time.toISOString().substring(11, 23)} (+${delta.toString().padStart(5)}ms) ${eventType}: ${status}`);
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

      // Wait a moment for initial jobs, then send command
      setTimeout(() => {
        if (!commandSent) {
          commandSent = true;
          startTime = new Date();
          log(`Sending command: ${command}`, 'blue');

          ws.send(JSON.stringify({
            id: 'exec1',
            type: 'subscribe',
            payload: {
              query: `mutation ExecuteCommand($input: String!) {
                executeCommand(input: $input) {
                  success
                  message
                  execution {
                    id
                    rawInput
                    status
                  }
                }
              }`,
              variables: { input: command }
            }
          }));
        }
      }, 500);
      return;
    }

    // Command execution response
    if (msg.id === 'exec1' && msg.type === 'next') {
      const exec = msg.payload?.data?.executeCommand;
      if (exec) {
        log(`Command response: success=${exec.success}, msg="${exec.message}"`, exec.success ? 'green' : 'red');
        if (exec.execution?.id) {
          executionId = exec.execution.id;
          log(`Execution ID: ${executionId}`, 'dim');
        }
      }
      return;
    }

    // Job messages
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
        eventType: payload.eventType,
        job
      });

      let statusColor = 'reset';
      if (status === 'pending') statusColor = 'yellow';
      else if (status === 'running') statusColor = 'blue';
      else if (status === 'completed' || status === 'success') statusColor = 'green';
      else if (status === 'failed') statusColor = 'red';

      log(`${typename} [+${elapsed}ms]: ${shortId} ${kind} -> ${status}`, statusColor);

      // If job completed or failed, wait a bit then exit
      if (status === 'completed' || status === 'success' || status === 'failed') {
        setTimeout(() => {
          printSummary();
          clearTimeout(timeout);
          ws.close();
          process.exit(0);
        }, 2000);
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
