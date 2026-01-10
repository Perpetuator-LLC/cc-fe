#!/usr/bin/env node
// Copyright (c) 2025-2026 Perpetuator LLC
// Test chartDataRange endCursor behavior

const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const os = require('os');

const TOKEN_DIR = path.join(os.homedir(), '.capital-copilot');
const TOKEN_FILE = path.join(TOKEN_DIR, 'cli-tokens.json');

console.log('Reading tokens from:', TOKEN_FILE);
const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
console.log('Token expires at:', tokens.expiresAt);

const wsUrl = `ws://127.0.0.1:8000/ws/graphql/?token=${tokens.accessToken}`;
console.log('Connecting to:', wsUrl.substring(0, 50) + '...');

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('WebSocket opened');
  ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
});

ws.on('error', (e) => {
  console.error('WebSocket error:', e);
  process.exit(1);
});

ws.on('close', () => {
  console.log('WebSocket closed');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('Received message type:', msg.type);

  if (msg.type === 'connection_ack') {
    console.log('Testing chartDataRange for MSFT hourly (Nov 2025)...\n');
    ws.send(JSON.stringify({
      id: '1',
      type: 'subscribe',
      payload: {
        query: `query {
          chartDataRange(
            symbol: "MSFT",
            interval: MIN_60,
            startDate: "2025-11-01T00:00:00Z",
            endDate: "2025-12-01T00:00:00Z"
          ) {
            edges { node { date } cursor }
            pageInfo { hasOlderData hasNewerData endCursor startCursor oldestDate newestDate }
            totalCount
          }
        }`
      }
    }));
  }

  if (msg.type === 'next' || msg.type === 'data') {
    const d = msg.payload?.data?.chartDataRange;
    if (d) {
      console.log('chartDataRange Results:');
      console.log('  edges:', d.edges?.length);
      console.log('  totalCount:', d.totalCount);
      console.log('  pageInfo:');
      console.log('    hasOlderData:', d.pageInfo?.hasOlderData);
      console.log('    hasNewerData:', d.pageInfo?.hasNewerData);
      console.log('    endCursor:', d.pageInfo?.endCursor);
      console.log('    startCursor:', d.pageInfo?.startCursor);
      console.log('    oldestDate:', d.pageInfo?.oldestDate);
      console.log('    newestDate:', d.pageInfo?.newestDate);

      if (d.edges?.length > 0) {
        console.log('\n  First edge:');
        console.log('    date:', d.edges[0]?.node?.date);
        console.log('    cursor:', d.edges[0]?.cursor);
        console.log('\n  Last edge:');
        const last = d.edges[d.edges.length - 1];
        console.log('    date:', last?.node?.date);
        console.log('    cursor:', last?.cursor);
      }
    }
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (e) => {
  console.error('WebSocket error:', e);
  process.exit(1);
});

setTimeout(() => {
  console.log('Timeout');
  process.exit(1);
}, 10000);

