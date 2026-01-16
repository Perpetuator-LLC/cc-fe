/**
 * Monitor Job Updates via WebSocket
 *
 * Connects to the GraphQL WebSocket and logs all job-related messages
 *
 * Usage: node scripts/monitor-job-updates.cjs [duration_seconds]
 */

const { graphqlQuery, loadEnvironment, getAccessToken } = require('./lib/test-utils.cjs');
const WebSocket = require('ws');

// Configuration
const DURATION = parseInt(process.argv[2] || '60', 10) * 1000;

// ANSI colors
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

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`${colors.dim}[${timestamp}]${colors.reset} ${colors[color]}${message}${colors.reset}`);
}

function logJson(label, obj) {
  console.log(`${colors.cyan}${label}:${colors.reset}`);
  console.log(JSON.stringify(obj, null, 2));
}

async function main() {
  log('=== Job Update Monitor ===', 'cyan');
  log(`Will monitor for ${DURATION / 1000} seconds`, 'dim');

  try {
    // Load environment and get token
    log('Loading environment...', 'dim');
    const env = loadEnvironment();
    log(`API_URL: ${env.API_URL}`, 'dim');

    log('Getting access token...', 'dim');
    const token = await getAccessToken();

    if (!token) {
      throw new Error('Failed to get access token');
    }
    log('Token obtained', 'dim');

    const apiUrl = env.API_URL || 'http://localhost:8000';

    // Build WebSocket URL
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${wsHost}/ws/graphql/?token=${token}`;

    log(`Connecting to: ${wsUrl.replace(token, '***')}`, 'dim');

    const ws = new WebSocket(wsUrl, ['graphql-transport-ws']);

    let connected = false;
    let messageCount = 0;
    let jobMessageCount = 0;

    ws.on('open', () => {
      log('WebSocket opened, sending connection_init', 'green');
      ws.send(JSON.stringify({
        type: 'connection_init',
        payload: {}
      }));
    });

    ws.on('message', (data) => {
      messageCount++;
      const message = JSON.parse(data.toString());

      // Log connection_ack
      if (message.type === 'connection_ack') {
        connected = true;
        log('Connection acknowledged', 'green');
        return;
      }

      // Check for job messages
      const isJobMessage =
        message.id === '_jobs' ||
        message.type?.startsWith('jobs.') ||
        message.payload?.data?.__typename?.startsWith('Job');

      if (isJobMessage) {
        jobMessageCount++;
        log(`\n=== JOB MESSAGE #${jobMessageCount} ===`, 'magenta');
        logJson('Message', message);

        // Extract job data if present
        if (message.payload?.data?.job) {
          const job = message.payload.data.job;
          log(`  UUID: ${job.uuid}`, 'yellow');
          log(`  Kind: ${job.kind}`, 'yellow');
          log(`  Status: ${job.status}`, job.status === 'RUNNING' ? 'green' : 'yellow');
        } else if (message.payload?.data?.jobs) {
          log(`  Jobs count: ${message.payload.data.jobs.length}`, 'yellow');
          message.payload.data.jobs.forEach(job => {
            log(`    - ${job.uuid}: ${job.kind} (${job.status})`, 'dim');
          });
        } else if (message.job) {
          const job = message.job;
          log(`  UUID: ${job.uuid}`, 'yellow');
          log(`  Kind: ${job.kind}`, 'yellow');
          log(`  Status: ${job.status}`, job.status === 'RUNNING' ? 'green' : 'yellow');
        } else if (message.jobs) {
          log(`  Jobs count: ${message.jobs.length}`, 'yellow');
          message.jobs.forEach(job => {
            log(`    - ${job.uuid}: ${job.kind} (${job.status})`, 'dim');
          });
        }
      } else if (message.type !== 'ping' && message.type !== 'pong' && message.type !== 'ka') {
        // Log other non-ping messages
        log(`Other message: type=${message.type}, id=${message.id}`, 'dim');
      }
    });

    ws.on('error', (error) => {
      log(`WebSocket error: ${error.message}`, 'red');
    });

    ws.on('close', (code, reason) => {
      log(`WebSocket closed: ${code} ${reason}`, 'yellow');
    });

    // Set up termination
    setTimeout(() => {
      log(`\n=== Summary ===`, 'cyan');
      log(`Total messages: ${messageCount}`, 'dim');
      log(`Job messages: ${jobMessageCount}`, 'dim');
      log(`Connected: ${connected}`, connected ? 'green' : 'red');
      ws.close();
      process.exit(0);
    }, DURATION);

    // Also handle Ctrl+C
    process.on('SIGINT', () => {
      log('\nInterrupted by user', 'yellow');
      ws.close();
      process.exit(0);
    });

  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();

