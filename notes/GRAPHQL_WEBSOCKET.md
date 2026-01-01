# GraphQL over WebSocket

**Created:** January 1, 2026

## Overview

The backend supports executing GraphQL queries and mutations over WebSocket using the `graphql-ws` protocol. This allows the frontend to use a single WebSocket connection for both GraphQL operations and real-time subscriptions.

## Endpoint

```
wss://api.example.com/ws/graphql/
```

## Protocol

The implementation follows the [graphql-ws](https://github.com/enisdenjo/graphql-ws) protocol specification.

### Subprotocol

When connecting, request the `graphql-transport-ws` subprotocol:

```typescript
const ws = new WebSocket('wss://api.example.com/ws/graphql/', 'graphql-transport-ws');
```

## Connection Flow

### 1. Connect and Initialize

```typescript
// Connect
const ws = new WebSocket(url, 'graphql-transport-ws');

ws.onopen = () => {
  // Send connection_init with auth token
  ws.send(JSON.stringify({
    type: 'connection_init',
    payload: {
      authorization: `Bearer ${accessToken}`
    }
  }));
};

// Wait for connection_ack
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'connection_ack') {
    console.log('GraphQL WebSocket connected and authenticated');
  }
};
```

### 2. Execute Operations

```typescript
// Generate unique operation ID
const operationId = crypto.randomUUID();

// Send a query
ws.send(JSON.stringify({
  id: operationId,
  type: 'subscribe',
  payload: {
    query: `
      query GetTerminalHints {
        terminalHints {
          quickExamples
          placeholderText
          emptyStateMessage
        }
      }
    `,
    variables: {},
    operationName: 'GetTerminalHints'
  }
}));

// Handle response
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.id === operationId) {
    switch (message.type) {
      case 'next':
        console.log('Result:', message.payload.data);
        break;
      case 'error':
        console.error('Errors:', message.payload);
        break;
      case 'complete':
        console.log('Operation complete');
        break;
    }
  }
};
```

### 3. Mutations

```typescript
ws.send(JSON.stringify({
  id: crypto.randomUUID(),
  type: 'subscribe',
  payload: {
    query: `
      mutation AddToWatchlist($symbol: String!, $watchlistId: UUID) {
        addToWatchlist(symbol: $symbol, watchlistId: $watchlistId) {
          success
          message
          item {
            symbol
            displayName
          }
        }
      }
    `,
    variables: {
      symbol: 'AAPL',
      watchlistId: null
    },
    operationName: 'AddToWatchlist'
  }
}));
```

## Message Types

### Client → Server

| Type | Description |
|------|-------------|
| `connection_init` | Initialize connection, optionally with auth |
| `subscribe` | Execute a GraphQL operation |
| `complete` | Cancel a subscription |
| `ping` | Keep-alive ping |

### Server → Client

| Type | Description |
|------|-------------|
| `connection_ack` | Connection accepted |
| `next` | GraphQL result data |
| `error` | GraphQL errors |
| `complete` | Operation finished |
| `pong` | Keep-alive pong |

## Apollo Client Integration

### Installation

```bash
npm install @apollo/client graphql-ws
```

### Configuration

```typescript
import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// HTTP link for queries/mutations (fallback)
const httpLink = new HttpLink({
  uri: 'https://api.example.com/graphql/',
  headers: {
    authorization: `Bearer ${getAccessToken()}`
  }
});

// WebSocket link for all operations
const wsLink = new GraphQLWsLink(
  createClient({
    url: 'wss://api.example.com/ws/graphql/',
    connectionParams: () => ({
      authorization: `Bearer ${getAccessToken()}`
    }),
    // Reconnect on connection loss
    retryAttempts: 5,
    shouldRetry: () => true,
  })
);

// Split based on operation type (optional - can use wsLink for everything)
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,  // Use WS for subscriptions
  httpLink // Use HTTP for queries/mutations
);

// Or just use WebSocket for everything:
const client = new ApolloClient({
  link: wsLink,  // All operations over WebSocket
  cache: new InMemoryCache()
});
```

### Using All Operations Over WebSocket

To use WebSocket for **all** GraphQL operations (not just subscriptions):

```typescript
const client = new ApolloClient({
  link: wsLink,
  cache: new InMemoryCache()
});

// Now all queries and mutations go over WebSocket
const { data } = await client.query({
  query: gql`
    query Commands {
      commands {
        name
        description
        category
      }
    }
  `
});
```

## Comparison: HTTP vs WebSocket

| Feature | HTTP (`/graphql/`) | WebSocket (`/ws/graphql/`) |
|---------|-------------------|---------------------------|
| Latency | Higher (new connection per request) | Lower (persistent connection) |
| Subscriptions | ❌ Not supported | ✅ Supported |
| Multiplexing | ❌ No | ✅ Yes |
| Connection overhead | Per request | Once per session |
| Best for | Simple apps, SSR | Real-time apps, dashboards |

## Error Handling

```typescript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'error') {
    // GraphQL execution errors
    message.payload.forEach(error => {
      console.error('GraphQL Error:', error.message);
      if (error.path) {
        console.error('Path:', error.path.join('.'));
      }
    });
  }
};

ws.onerror = (event) => {
  // WebSocket connection error
  console.error('WebSocket error:', event);
};

ws.onclose = (event) => {
  if (event.code === 4401) {
    // Unauthorized - need to re-authenticate
    console.error('Authentication required');
  }
};
```

## Keep-Alive

Send periodic ping messages to keep the connection alive:

```typescript
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 30000); // Every 30 seconds
```

## Existing Endpoints

You can continue using the existing specialized WebSocket endpoints:

- `/ws/terminal/` - Terminal commands, autocomplete, chart updates
- `/ws/jobs/` - Job status updates
- `/ws/graphql/` - General GraphQL operations

The `/ws/graphql/` endpoint is ideal for:
- Loading initial data (commands, hints, watchlists)
- Mutations that don't need streaming updates
- Future subscriptions

The `/ws/terminal/` endpoint remains best for:
- Real-time autocomplete (optimized for typing)
- Command execution with streaming progress
- Chart data subscriptions

## Related Documentation

- [Terminal WebSocket API](TERMINAL_WEBSOCKET_AUTOCOMPLETE.md)
- [graphql-ws Protocol](https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md)
- [Apollo Client WebSocket](https://www.apollographql.com/docs/react/data/subscriptions/)

