#!/usr/bin/env node
/**
 * Test what times are returned from backend
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const WebSocket = require('ws');

// Load token
const tokenFile = path.join(os.homedir(), '.capital-copilot/cli-tokens.json');
const tokens = JSON.parse(fs.readFileSync(tokenFile, 'utf-8'));

const ws = new WebSocket('ws://127.0.0.1:8000/ws/graphql/?token=' + tokens.accessToken);

ws.on('open', () => {
  console.log('Connected to WebSocket');
  ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('Received message type:', msg.type);

  if (msg.type === 'connection_ack') {
    console.log('Connection acknowledged, sending query...');
    // Query for MSFT 30min WITH extended hours
    ws.send(JSON.stringify({
      id: '1',
      type: 'subscribe',
      payload: {
        query: `query TestTimes { stockPriceConnection(symbol: "MSFT", interval: MIN_30, first: 30, includeExtendedHours: false) { edges { node { date isExtendedHours } } totalCount } }`
      }
    }));
  } else if (msg.type === 'next') {
    console.log('Received data response');
    if (msg.payload && msg.payload.data) {
      const conn = msg.payload.data.stockPriceConnection;
      console.log('Total count:', conn?.totalCount);
      const edges = conn?.edges || [];
      console.log('Edges in response:', edges.length);
      edges.slice(0, 15).forEach(e => {
        const utc = e.node.date;
        const d = new Date(utc);
        const et = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
        const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
        console.log(`  ${date} ${et} ET (extended: ${e.node.isExtendedHours})`);
      });
    } else if (msg.payload && msg.payload.errors) {
      console.log('GraphQL Errors:', JSON.stringify(msg.payload.errors, null, 2));
    }
  } else if (msg.type === 'complete') {
    console.log('Query complete');
    ws.close();
    process.exit(0);
  } else if (msg.type === 'error') {
    console.error('Error:', JSON.stringify(msg.payload, null, 2));
    ws.close();
    process.exit(1);
  }
});

ws.on('error', (e) => { console.error('WebSocket Error:', e.message); process.exit(1); });
ws.on('close', () => { console.log('WebSocket closed'); });
setTimeout(() => { console.error('Timeout after 10s'); process.exit(1); }, 10000);

