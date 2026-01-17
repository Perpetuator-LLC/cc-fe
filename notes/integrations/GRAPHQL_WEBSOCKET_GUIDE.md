# GraphQL WebSocket Integration Guide

**Created:** January 1, 2026  
**Updated:** January 16, 2026  
**Status:** ✅ Implemented

---

## Overview

The application uses a **single WebSocket connection** (`/ws/graphql/`) for all GraphQL operations, providing:

- Lower latency (persistent connection vs. HTTP request per operation)
- Unified connection management
- Subscription support for real-time updates

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
├─────────────────────────────────────────────────────────────┤
│                     Apollo Client                            │
│                          │                                   │
│                    GraphQLWsLink                             │
│                          │                                   │
│              ┌───────────┴───────────┐                       │
│              │   graphql-ws client   │                       │
│              └───────────┬───────────┘                       │
└──────────────────────────┼──────────────────────────────────┘
                           │
                    WebSocket Connection
                           │
                    wss://api.example.com/ws/graphql/
```

---

## Protocol

Uses the [graphql-ws](https://github.com/enisdenjo/graphql-ws) protocol with the `graphql-transport-ws` subprotocol.

### Message Types

**Client → Server:**

| Type | Description |
|------|-------------|
| `connection_init` | Initialize connection with auth |
| `subscribe` | Execute a GraphQL operation |
| `complete` | Cancel a subscription |
| `ping` | Keep-alive ping |

**Server → Client:**

| Type | Description |
|------|-------------|
| `connection_ack` | Connection accepted |
| `next` | GraphQL result data |
| `error` | GraphQL errors |
| `complete` | Operation finished |
| `pong` | Keep-alive pong |

---

## Connection Flow

```typescript
// Connect with subprotocol
const ws = new WebSocket('wss://api.example.com/ws/graphql/', 'graphql-transport-ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'connection_init',
    payload: { authorization: `Bearer ${accessToken}` }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'connection_ack') {
    console.log('Connected and authenticated');
  }
};
```

---

## Apollo Client Setup

```typescript
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const wsLink = new GraphQLWsLink(
  createClient({
    url: 'wss://api.example.com/ws/graphql/',
    connectionParams: () => ({
      authorization: `Bearer ${getAccessToken()}`
    }),
    retryAttempts: 5,
    shouldRetry: () => true,
    keepAlive: 30000,
  })
);

const client = new ApolloClient({
  link: wsLink,
  cache: new InMemoryCache()
});
```

---

## Real-Time Quote Subscriptions

Subscribe to symbol updates via the terminal WebSocket:

```typescript
// Subscribe
terminalWs.send({
  action: 'subscribe_symbols',
  symbols: ['AAPL', 'MSFT']
});

// Receive updates
terminalWs.messages$.pipe(
  filter(msg => msg.type === 'symbol.update')
).subscribe(quote => {
  console.log(`${quote.symbol}: $${quote.price}`);
});
```

### Quote Update Format

```typescript
interface SymbolUpdate {
  type: 'symbol.update';
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: string;
}
```

---

## Market Hours

Quotes refresh every 5 seconds during US market hours (9:30 AM - 4:00 PM ET). Outside market hours, the last quote is cached.

---

## Related Documentation

- [AUTH_COOKIE_GUIDE.md](./AUTH_COOKIE_GUIDE.md) - Authentication setup
- [GRAPHQL_DOCS.md](./GRAPHQL_DOCS.md) - GraphQL documentation generation

