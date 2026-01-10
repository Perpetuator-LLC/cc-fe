#!/usr/bin/env node
// Copyright (c) 2025-2026 Perpetuator LLC
// Test script for hourly progressive loading with cursor pagination

const WebSocket = require('ws');
const path = require('path');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', 'src', 'environments', '.env.local') });

const TokenManager = require('./lib/token-manager.cjs');

async function testHourlyProgressive() {
  const tokenManager = new TokenManager();
  await tokenManager.ensureValidToken();
  const token = tokenManager.getAccessToken();

  const wsUrl = `ws://127.0.0.1:8000/ws/graphql/?token=${token}`;
  console.log('Testing Hourly Progressive Loading\n');

  return new Promise((resolve) => {
    const ws = new WebSocket(wsUrl);
    let step = 0;
    let firstPageEndCursor = null;
    let firstPageOldest = null;

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'connection_ack') {
        console.log('Connected. Step 1: Loading initial hourly data...');
        // First query - get recent hourly data
        ws.send(JSON.stringify({
          id: '1',
          type: 'subscribe',
          payload: {
            query: `
              query GetHourlyData($symbol: String!) {
                stockPriceConnection(symbol: $symbol, interval: MIN_60, first: 100) {
                  edges {
                    node { date open high low close volume }
                    cursor
                  }
                  pageInfo {
                    hasOlderData
                    hasNewerData
                    oldestDate
                    newestDate
                    endCursor
                    startCursor
                  }
                  totalCount
                }
              }
            `,
            variables: { symbol: 'MSFT' }
          }
        }));
        step = 1;
      }

      if ((msg.type === 'next' || msg.type === 'data') && msg.id === '1' && step === 1) {
        const data = msg.payload?.data?.stockPriceConnection;
        if (data) {
          const edges = data.edges || [];
          const pageInfo = data.pageInfo || {};

          console.log('\nStep 1 Results:');
          console.log('  Total count:', data.totalCount);
          console.log('  Received:', edges.length, 'candles');
          console.log('  hasOlderData:', pageInfo.hasOlderData);
          console.log('  hasNewerData:', pageInfo.hasNewerData);
          console.log('  oldestDate:', pageInfo.oldestDate);
          console.log('  newestDate:', pageInfo.newestDate);
          console.log('  endCursor:', pageInfo.endCursor?.substring(0, 30) + '...');

          if (edges.length > 0) {
            const oldest = edges[edges.length - 1]?.node;
            const newest = edges[0]?.node;
            console.log('  First candle date:', newest?.date);
            console.log('  Last candle date:', oldest?.date);
            firstPageOldest = oldest?.date;
          }

          firstPageEndCursor = pageInfo.endCursor;

          if (firstPageEndCursor && pageInfo.hasOlderData) {
            console.log('\nStep 2: Loading older data using cursor...');
            ws.send(JSON.stringify({
              id: '2',
              type: 'subscribe',
              payload: {
                query: `
                  query GetOlderHourlyData($symbol: String!, $before: String) {
                    stockPriceConnection(symbol: $symbol, interval: MIN_60, first: 100, before: $before) {
                      edges {
                        node { date open high low close volume }
                        cursor
                      }
                      pageInfo {
                        hasOlderData
                        hasNewerData
                        oldestDate
                        newestDate
                        endCursor
                      }
                      totalCount
                    }
                  }
                `,
                variables: { symbol: 'MSFT', before: firstPageEndCursor }
              }
            }));
            step = 2;
          } else {
            console.log('\nNo more data or no cursor available');
            ws.close();
            resolve();
          }
        }
      }

      if ((msg.type === 'next' || msg.type === 'data') && msg.id === '2' && step === 2) {
        const data = msg.payload?.data?.stockPriceConnection;
        if (data) {
          const edges = data.edges || [];
          const pageInfo = data.pageInfo || {};

          console.log('\nStep 2 Results (Older Data):');
          console.log('  Total count:', data.totalCount);
          console.log('  Received:', edges.length, 'candles');
          console.log('  hasOlderData:', pageInfo.hasOlderData);
          console.log('  oldestDate:', pageInfo.oldestDate);
          console.log('  newestDate:', pageInfo.newestDate);

          if (edges.length > 0) {
            const oldest = edges[edges.length - 1]?.node;
            const newest = edges[0]?.node;
            console.log('  First candle date:', newest?.date);
            console.log('  Last candle date:', oldest?.date);

            console.log('\n✅ Progressive loading working!');
            console.log('  First page oldest:', firstPageOldest);
            console.log('  Second page newest:', newest?.date);
            console.log('  Second page oldest:', oldest?.date);
          } else {
            console.log('\n⚠️ No candles returned on second request');
            console.log('  Backend may be auto-fetching. hasOlderData:', pageInfo.hasOlderData);
          }
        }
        ws.close();
        resolve();
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      resolve();
    });

    ws.on('close', () => {
      console.log('\nConnection closed');
      resolve();
    });

    // Timeout
    setTimeout(() => {
      console.log('Timeout - closing');
      ws.close();
      resolve();
    }, 30000);
  });
}

testHourlyProgressive().catch(console.error);

