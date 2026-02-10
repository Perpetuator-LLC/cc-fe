/**
 * Test WebSocket Job Updates
 *
 * Tests the /ws/graphql/ endpoint for job status updates
 *
 * Usage: node scripts/test-ws-jobs.cjs
 */

const WebSocket = require('ws');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:8000';
const WS_URL = API_URL.replace(/^http/, 'ws');

// Token storage
const TOKEN_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.capital-copilot', 'cli-tokens.json');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logJson(label, obj) {
  console.log(`${colors.cyan}${label}:${colors.reset}`);
  console.log(JSON.stringify(obj, null, 2));
}

// Get access token
async function getAccessToken() {
  // Try to read from token file
  if (fs.existsSync(TOKEN_FILE)) {
    try {
      const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      if (tokens.accessToken) {
        log('Using cached access token', 'dim');
        return tokens.accessToken;
      }
    } catch (e) {
      // Ignore
    }
  }

  // Try to get from environment.ts
  const envPath = path.join(__dirname, '../src/environments/environment.ts');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const emailMatch = envContent.match(/TEST_EMAIL:\s*['"]([^'"]+)['"]/);
    const passwordMatch = envContent.match(/TEST_PASSWORD:\s*['"]([^'"]+)['"]/);

    if (emailMatch && passwordMatch) {
      const email = emailMatch[1];
      const password = passwordMatch[1];

      log(`Logging in as ${email}...`, 'dim');

      return new Promise((resolve, reject) => {
        const loginData = JSON.stringify({
          query: `
            mutation Login($email: String!, $password: String!) {
              tokenAuth(email: $email, password: $password) {
                success
                errors
                token {
                  token
                }
              }
            }
          `,
          variables: { email, password }
        });

        const url = new URL(`${API_URL}/graphql/`);
        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData),
          },
        };

        const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              const result = JSON.parse(data);
              if (result.data?.tokenAuth?.success && result.data.tokenAuth.token?.token) {
                const token = result.data.tokenAuth.token.token;

                // Cache token
                const dir = path.dirname(TOKEN_FILE);
                if (!fs.existsSync(dir)) {
                  fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(TOKEN_FILE, JSON.stringify({ accessToken: token }), { mode: 0o600 });

                resolve(token);
              } else {
                reject(new Error(`Login failed: ${JSON.stringify(result.data?.tokenAuth?.errors)}`));
              }
            } catch (e) {
              reject(e);
            }
          });
        });

        req.on('error', reject);
        req.write(loginData);
        req.end();
      });
    }
  }

  throw new Error('No access token available. Set TEST_EMAIL and TEST_PASSWORD in environment.ts');
}

// Main test
async function testWebSocketJobs() {
  log(`\n=== WebSocket Job Updates Test (v2 - ${new Date().toISOString()}) ===\n`, 'cyan');

  const accessToken = await getAccessToken();
  const wsUrl = `${WS_URL}/ws/graphql/`;

  log(`Connecting to: ${wsUrl}`, 'dim');

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, 'graphql-transport-ws');
    let connectionAcked = false;
    let initialJobsReceived = false;
    const receivedMessages = [];
    let timeout;

    ws.on('open', () => {
      log('WebSocket connected', 'green');

      // Send connection_init
      const initMessage = {
        type: 'connection_init',
        payload: {
          authorization: `Bearer ${accessToken}`,
        },
      };
      log('Sending connection_init...', 'dim');
      ws.send(JSON.stringify(initMessage));

      // Set timeout
      timeout = setTimeout(() => {
        log('\n--- Test Results ---', 'yellow');
        log(`Connection acknowledged: ${connectionAcked ? 'YES' : 'NO'}`, connectionAcked ? 'green' : 'red');
        log(`Initial jobs received: ${initialJobsReceived ? 'YES' : 'NO'}`, initialJobsReceived ? 'green' : 'red');
        log(`Total messages received: ${receivedMessages.length}`, 'blue');

        if (receivedMessages.length > 0) {
          log('\nAll messages received:', 'cyan');
          receivedMessages.forEach((msg, i) => {
            log(`  ${i + 1}. type: ${msg.type}`, 'dim');
          });
        }

        if (!connectionAcked) {
          log('\nERROR: connection_ack not received!', 'red');
          log('Check that the backend is sending connection_ack after connection_init', 'red');
        }

        if (!initialJobsReceived) {
          log('\nWARNING: jobs.initial not received', 'yellow');
          log('Backend should send jobs.initial after connection_ack (even if empty)', 'dim');
        }

        ws.close();
        resolve({
          connectionAcked,
          initialJobsReceived,
          messagesReceived: receivedMessages.length,
        });
      }, 8000);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        receivedMessages.push(message);
        log(`[MSG] Received: ${JSON.stringify(message).substring(0, 100)}...`, 'dim');

        // Check for NEW FORMAT: { type: "next", id: "_jobs", payload: { data: { __typename: "JobsInitial", ... } } }
        if (message.type === 'next' && message.id === '_jobs') {
          const typename = message.payload?.data?.__typename;
          const jobs = message.payload?.data?.jobs;
          const job = message.payload?.data?.job;

          switch (typename) {
            case 'JobsInitial':
              initialJobsReceived = true;
              log(`✓ Received JobsInitial (new format) with ${jobs?.length || 0} jobs`, 'green');
              if (jobs && jobs.length > 0) {
                logJson('Initial jobs (new format)', jobs.slice(0, 3));
              }
              break;

            case 'JobCreated':
              log(`✓ Job created (new format): ${job?.uuid} (${job?.kind})`, 'blue');
              break;

            case 'JobUpdate':
              log(`✓ Job update (new format): ${job?.uuid} -> ${job?.status}`, 'blue');
              break;

            case 'JobCompleted':
              log(`✓ Job completed (new format): ${job?.uuid}`, 'green');
              break;

            case 'JobFailed':
              log(`✓ Job failed (new format): ${job?.uuid} - ${job?.error}`, 'red');
              break;

            default:
              log(`Received job message (new format): ${typename}`, 'dim');
          }
          return; // Don't fall through to legacy handling
        }

        // LEGACY FORMAT handling
        switch (message.type) {
          case 'connection_ack':
            connectionAcked = true;
            log('✓ Received connection_ack', 'green');
            // After connection_ack, the backend should automatically send jobs.initial
            // But let's also log when we expect it
            log('Waiting for jobs.initial or JobsInitial message...', 'dim');
            break;

          case 'jobs.initial':
            initialJobsReceived = true;
            log(`✓ Received jobs.initial (legacy) with ${message.jobs?.length || 0} jobs`, 'green');
            if (message.jobs && message.jobs.length > 0) {
              logJson('Initial jobs (legacy)', message.jobs.slice(0, 3));
            }
            break;

          case 'jobs.created':
            log(`✓ Job created (legacy): ${message.job?.uuid} (${message.job?.kind})`, 'blue');
            break;

          case 'jobs.update':
            log(`✓ Job update (legacy): ${message.job?.uuid} -> ${message.job?.status}`, 'blue');
            break;

          case 'jobs.completed':
            log(`✓ Job completed (legacy): ${message.job?.uuid}`, 'green');
            break;

          case 'jobs.failed':
            log(`✓ Job failed (legacy): ${message.job?.uuid} - ${message.job?.error}`, 'red');
            break;

          case 'ka':
            // Keep-alive, ignore
            break;

          default:
            log(`Received: ${message.type}`, 'dim');
        }
      } catch (e) {
        log(`Failed to parse message: ${e.message}`, 'red');
      }
    });

    ws.on('error', (error) => {
      log(`WebSocket error: ${error.message}`, 'red');
      clearTimeout(timeout);
      reject(error);
    });

    ws.on('close', (code, reason) => {
      log(`WebSocket closed: ${code} ${reason}`, 'dim');
      clearTimeout(timeout);
    });
  });
}

// Run test
testWebSocketJobs()
  .then((result) => {
    log('\n=== Test Complete ===', 'cyan');
    process.exit(result.connectionAcked ? 0 : 1);
  })
  .catch((error) => {
    log(`\nTest failed: ${error.message}`, 'red');
    process.exit(1);
  });

