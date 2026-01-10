#!/usr/bin/env node
// Copyright (c) 2025-2026 Perpetuator LLC
// Test cursor chain pagination for MSFT hourly data

const WebSocket = require('ws');
const tm = require('./lib/token-manager.cjs');

(async () => {
  const tokenManager = new tm();
  await tokenManager.ensureValidToken();
  const token = tokenManager.getAccessToken();

  const ws = new WebSocket(`ws://127.0.0.1:8000/ws/graphql/?token=${token}`);
  let step = 0;

  ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === 'connection_ack') {
      console.log('Step 1: Initial load (no cursor)');
      ws.send(JSON.stringify({
        id: '1',
        type: 'subscribe',
        payload: {
          query: `query { stockPriceConnection(symbol: "MSFT", interval: MIN_60, first: 50) {
            edges { node { date } }
            pageInfo { hasOlderData endCursor startCursor }
            totalCount
          }}`
        }
      }));
      step = 1;
    }

    if ((msg.type === 'next' || msg.type === 'data') && step > 0) {
      const conn = msg.payload?.data?.stockPriceConnection;
      if (!conn) return;

      const pi = conn.pageInfo;
      const endCursorDisplay = pi.endCursor ? pi.endCursor.substring(0, 30) + '...' : 'NULL';
      console.log(`Step ${step}: edges=${conn.edges?.length}, hasOlderData=${pi.hasOlderData}, endCursor=${endCursorDisplay}`);

      if (conn.edges?.length > 0) {
        console.log(`  First: ${conn.edges[0]?.node?.date}`);
        console.log(`  Last:  ${conn.edges[conn.edges.length - 1]?.node?.date}`);
      }

      if (step < 4 && pi.endCursor && pi.hasOlderData) {
        step++;
        console.log(`\nStep ${step}: Load older data using before=${pi.endCursor.substring(0, 30)}...`);
        ws.send(JSON.stringify({
          id: String(step),
          type: 'subscribe',
          payload: {
            query: `query($before: String) { stockPriceConnection(symbol: "MSFT", interval: MIN_60, first: 50, before: $before) {
              edges { node { date } }
              pageInfo { hasOlderData endCursor startCursor }
              totalCount
            }}`,
            variables: { before: pi.endCursor }
          }
        }));
      } else {
        console.log('\n=== Done ===');
        if (!pi.endCursor) console.log('Stopped because: endCursor is NULL');
        if (!pi.hasOlderData) console.log('Stopped because: hasOlderData is false');
        ws.close();
        process.exit(0);
      }
    }
  });

  ws.on('error', (e) => { console.error('WebSocket error:', e); process.exit(1); });
  setTimeout(() => { console.log('Timeout after 15s'); process.exit(1); }, 15000);
})();

