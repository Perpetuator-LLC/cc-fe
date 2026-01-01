# Frontend Migration Guide: Unified GraphQL WebSocket

**Created:** January 1, 2026  
**Status:** Ready for Implementation

---

## Overview

This guide covers migrating the frontend to use a **single WebSocket connection** (`/ws/graphql/`) for all GraphQL operations. This replaces:

- HTTP POST to `/graphql/` for queries and mutations
- Custom WebSocket to `/ws/terminal/` for autocomplete and commands

After migration, all API communication uses the `graphql-ws` protocol over a single persistent WebSocket connection.

---

## Benefits of Migration

| Before | After |
|--------|-------|
| HTTP for queries/mutations | Single WebSocket for everything |
| Separate WebSocket for terminal | Unified connection |
| Multiple connection management | One connection to manage |
| Higher latency (new HTTP request each time) | Lower latency (persistent connection) |
| No subscription support | Subscriptions ready when backend adds them |

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
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                      Backend                                 │
├──────────────────────────┴──────────────────────────────────┤
│              GraphQLWebSocketConsumer                        │
│                          │                                   │
│                   Graphene Schema                            │
│                          │                                   │
│    ┌─────────┬─────────┬─────────┬─────────┬─────────┐      │
│    │Terminal │Watchlist│  Data   │  Jobs   │   API   │      │
│    │ Query   │ Query   │  Query  │  Query  │  Query  │      │
│    └─────────┴─────────┴─────────┴─────────┴─────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Installation

```bash
npm install @apollo/client graphql graphql-ws
```

---

## Apollo Client Setup

### 1. Create WebSocket Link

```typescript
// src/app/graphql/websocket-link.ts
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient, Client } from 'graphql-ws';

let wsClient: Client | null = null;

export function createWebSocketLink(getToken: () => string | null): GraphQLWsLink {
  wsClient = createClient({
    url: getWebSocketUrl(),
    connectionParams: () => {
      const token = getToken();
      return token ? { authorization: `Bearer ${token}` } : {};
    },
    // Reconnection settings
    retryAttempts: 5,
    shouldRetry: () => true,
    retryWait: async (retries) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      await new Promise(resolve => 
        setTimeout(resolve, Math.min(1000 * Math.pow(2, retries), 16000))
      );
    },
    // Keep-alive
    keepAlive: 30000, // 30 seconds
    // Connection lifecycle
    on: {
      connected: () => console.log('GraphQL WebSocket connected'),
      closed: () => console.log('GraphQL WebSocket closed'),
      error: (error) => console.error('GraphQL WebSocket error:', error),
    },
  });

  return new GraphQLWsLink(wsClient);
}

export function getWsClient(): Client | null {
  return wsClient;
}

export function disconnectWebSocket(): void {
  if (wsClient) {
    wsClient.dispose();
    wsClient = null;
  }
}

function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = environment.apiHost || window.location.host;
  return `${protocol}//${host}/ws/graphql/`;
}
```

### 2. Configure Apollo Client

```typescript
// src/app/graphql/apollo-client.ts
import { ApolloClient, InMemoryCache, ApolloLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { createWebSocketLink, disconnectWebSocket } from './websocket-link';

let apolloClient: ApolloClient<any> | null = null;

export function createApolloClient(authService: AuthService): ApolloClient<any> {
  // Error handling link
  const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, locations, path }) => {
        console.error(
          `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
        );
      });
    }
    if (networkError) {
      console.error(`[Network error]: ${networkError}`);
      // Handle auth errors
      if ('statusCode' in networkError && networkError.statusCode === 401) {
        authService.logout();
      }
    }
  });

  // WebSocket link for all operations
  const wsLink = createWebSocketLink(() => authService.getAccessToken());

  apolloClient = new ApolloClient({
    link: ApolloLink.from([errorLink, wsLink]),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            // Cache policies for your queries
            watchlists: { merge: false },
            commands: { merge: false },
          },
        },
      },
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
      },
      query: {
        fetchPolicy: 'network-only',
      },
    },
  });

  return apolloClient;
}

export function getApolloClient(): ApolloClient<any> | null {
  return apolloClient;
}

export function resetApolloClient(): void {
  if (apolloClient) {
    apolloClient.clearStore();
  }
  disconnectWebSocket();
  apolloClient = null;
}
```

### 3. Angular Module Setup

```typescript
// src/app/graphql/graphql.module.ts
import { NgModule } from '@angular/core';
import { APOLLO_OPTIONS, ApolloModule } from 'apollo-angular';
import { createApolloClient } from './apollo-client';
import { AuthService } from '../auth/auth.service';

@NgModule({
  imports: [ApolloModule],
  providers: [
    {
      provide: APOLLO_OPTIONS,
      useFactory: (authService: AuthService) => createApolloClient(authService),
      deps: [AuthService],
    },
  ],
})
export class GraphQLModule {}
```

---

## Terminal Service Migration

### Before (Dual Connection)

```typescript
// OLD: terminal.service.ts
export class TerminalService {
  private ws: WebSocket | null = null;
  
  // HTTP for commands/hints
  loadCommands() {
    return this.apollo.query({ query: COMMANDS_QUERY });
  }
  
  // Custom WebSocket for autocomplete
  getAutocomplete(input: string) {
    this.ws?.send(JSON.stringify({
      action: 'autocomplete',
      input,
      limit: 10
    }));
  }
}
```

### After (Unified GraphQL)

```typescript
// NEW: terminal.service.ts
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

// GraphQL Queries
const COMMANDS_QUERY = gql`
  query Commands($category: String, $isActive: Boolean) {
    commands(category: $category, isActive: $isActive) {
      name
      description
      category
      requiresSymbol
      aliases
      exampleUsage
      creditsCost
    }
  }
`;

const TERMINAL_HINTS_QUERY = gql`
  query TerminalHints {
    terminalHints {
      quickExamples
      placeholderText
      emptyStateMessage
      dashboardHint
      chartSuggestion
    }
  }
`;

const AUTOCOMPLETE_QUERY = gql`
  query Autocomplete($input: String!, $limit: Int) {
    autocomplete(input: $input, limit: $limit) {
      fqn
      display
      displaySecondary
      type
      description
      score
      category
      requiresSymbol
      aliasFor
      symbol
      name
      assetType
      exchange
      country
      currency
    }
  }
`;

const EXECUTE_COMMAND_MUTATION = gql`
  mutation ExecuteCommand($input: String!) {
    executeCommand(input: $input) {
      success
      message
      executionId
      result {
        outputType
        data
        metadata
      }
    }
  }
`;

@Injectable({ providedIn: 'root' })
export class TerminalService {
  private commandsCache$ = new BehaviorSubject<Command[]>([]);
  private hintsCache$ = new BehaviorSubject<TerminalHints | null>(null);

  constructor(private apollo: Apollo) {
    this.initializeFromBackend();
  }

  private initializeFromBackend(): void {
    this.loadCommands().subscribe();
    this.loadTerminalHints().subscribe();
  }

  // Load commands list
  loadCommands(): Observable<Command[]> {
    return this.apollo.query<{ commands: Command[] }>({
      query: COMMANDS_QUERY,
      variables: { isActive: true }
    }).pipe(
      map(result => result.data.commands),
      tap(commands => this.commandsCache$.next(commands)),
      catchError(error => {
        console.error('Failed to load commands:', error);
        return of([]);
      })
    );
  }

  // Load terminal hints
  loadTerminalHints(): Observable<TerminalHints> {
    return this.apollo.query<{ terminalHints: TerminalHints }>({
      query: TERMINAL_HINTS_QUERY
    }).pipe(
      map(result => result.data.terminalHints),
      tap(hints => this.hintsCache$.next(hints)),
      catchError(error => {
        console.error('Failed to load hints:', error);
        return of(this.getEmptyHints());
      })
    );
  }

  // Get autocomplete suggestions - NOW USES GRAPHQL!
  getAutocomplete(input: string, limit: number = 10): Observable<AutocompleteSuggestion[]> {
    if (!input || input.length < 1) {
      return of([]);
    }

    return this.apollo.query<{ autocomplete: AutocompleteSuggestion[] }>({
      query: AUTOCOMPLETE_QUERY,
      variables: { input, limit },
      fetchPolicy: 'network-only' // Always fresh results
    }).pipe(
      map(result => result.data.autocomplete),
      catchError(error => {
        console.error('Autocomplete error:', error);
        return of([]);
      })
    );
  }

  // Execute a terminal command
  executeCommand(input: string, useAiFallback: boolean = true): Observable<CommandResult> {
    return this.apollo.mutate<{ executeCommand: CommandResult }>({
      mutation: EXECUTE_COMMAND_MUTATION,
      variables: { input, useAiFallback }
    }).pipe(
      map(result => result.data!.executeCommand),
      catchError(error => {
        console.error('Command execution error:', error);
        return of({
          success: false,
          message: error.message || 'Command execution failed',
          execution: undefined,
          result: undefined,
          job: undefined
        });
      })
    );
  }
  }

  // Get cached commands
  getCommands(): Command[] {
    return this.commandsCache$.getValue();
  }

  // Get cached hints
  getHints(): TerminalHints | null {
    return this.hintsCache$.getValue();
  }

  private getEmptyHints(): TerminalHints {
    return {
      quickExamples: [],
      placeholderText: 'Type a command or search...',
      emptyStateMessage: 'Type a symbol or command to get started',
      dashboardHint: '',
      chartSuggestion: ''
    };
  }
}
```

---

## Watchlist Service Migration

```typescript
// src/app/watchlist/watchlist.service.ts
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const WATCHLISTS_QUERY = gql`
  query Watchlists($watchlistType: String) {
    watchlists(watchlistType: $watchlistType) {
      uuid
      name
      description
      watchlistType
      isSystem
      isDefault
      canEdit
      itemCount
      items {
        symbol
        displayName
        assetType
        exchange
        sector
        industry
        marketCap
      }
    }
  }
`;

const SYSTEM_WATCHLISTS_QUERY = gql`
  query SystemWatchlists {
    systemWatchlists {
      uuid
      name
      description
      itemCount
      items {
        symbol
        displayName
        sector
        industry
        marketCap
        exchange
      }
    }
  }
`;

const ADD_TO_WATCHLIST_MUTATION = gql`
  mutation AddToWatchlist($symbol: String!, $watchlistId: UUID, $displayName: String, $assetType: String, $exchange: String) {
    addToWatchlist(symbol: $symbol, watchlistId: $watchlistId, displayName: $displayName, assetType: $assetType, exchange: $exchange) {
      success
      message
      item {
        symbol
        displayName
      }
    }
  }
`;

const REMOVE_FROM_WATCHLIST_MUTATION = gql`
  mutation RemoveFromWatchlist($watchlistId: UUID!, $symbol: String!) {
    removeFromWatchlist(watchlistId: $watchlistId, symbol: $symbol) {
      success
      message
    }
  }
`;

const CREATE_WATCHLIST_MUTATION = gql`
  mutation CreateWatchlist($name: String!, $description: String) {
    createWatchlist(name: $name, description: $description) {
      success
      message
      watchlist {
        uuid
        name
        description
      }
    }
  }
`;

const DELETE_WATCHLIST_MUTATION = gql`
  mutation DeleteWatchlist($watchlistId: UUID!) {
    deleteWatchlist(watchlistId: $watchlistId) {
      success
      message
    }
  }
`;

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  constructor(private apollo: Apollo) {}

  // Get all watchlists user can view (own + team + system)
  getWatchlists(watchlistType?: string): Observable<Watchlist[]> {
    return this.apollo.query<{ watchlists: Watchlist[] }>({
      query: WATCHLISTS_QUERY,
      variables: { watchlistType },
      fetchPolicy: 'cache-and-network'
    }).pipe(
      map(result => result.data.watchlists)
    );
  }

  // Get system watchlists only
  getSystemWatchlists(): Observable<Watchlist[]> {
    return this.apollo.query<{ systemWatchlists: Watchlist[] }>({
      query: SYSTEM_WATCHLISTS_QUERY,
      fetchPolicy: 'cache-and-network'
    }).pipe(
      map(result => result.data.systemWatchlists)
    );
  }

  // Add symbol to watchlist
  addToWatchlist(symbol: string, watchlistId?: string, metadata?: SymbolMetadata): Observable<MutationResult> {
    return this.apollo.mutate<{ addToWatchlist: MutationResult }>({
      mutation: ADD_TO_WATCHLIST_MUTATION,
      variables: {
        symbol,
        watchlistId,
        displayName: metadata?.displayName,
        assetType: metadata?.assetType,
        exchange: metadata?.exchange
      },
      refetchQueries: ['Watchlists']
    }).pipe(
      map(result => result.data!.addToWatchlist)
    );
  }

  // Remove symbol from watchlist
  removeFromWatchlist(watchlistId: string, symbol: string): Observable<MutationResult> {
    return this.apollo.mutate<{ removeFromWatchlist: MutationResult }>({
      mutation: REMOVE_FROM_WATCHLIST_MUTATION,
      variables: { watchlistId, symbol },
      refetchQueries: ['Watchlists']
    }).pipe(
      map(result => result.data!.removeFromWatchlist)
    );
  }

  // Create new watchlist
  createWatchlist(name: string, description?: string): Observable<CreateWatchlistResult> {
    return this.apollo.mutate<{ createWatchlist: CreateWatchlistResult }>({
      mutation: CREATE_WATCHLIST_MUTATION,
      variables: { name, description },
      refetchQueries: ['Watchlists']
    }).pipe(
      map(result => result.data!.createWatchlist)
    );
  }

  // Delete watchlist
  deleteWatchlist(watchlistId: string): Observable<MutationResult> {
    return this.apollo.mutate<{ deleteWatchlist: MutationResult }>({
      mutation: DELETE_WATCHLIST_MUTATION,
      variables: { watchlistId },
      refetchQueries: ['Watchlists']
    }).pipe(
      map(result => result.data!.deleteWatchlist)
    );
  }
}
```

---

## TypeScript Interfaces

```typescript
// src/app/graphql/types.ts

export interface Command {
  name: string;
  description: string;
  category: string;
  requiresSymbol: boolean;
  aliases: string[];
  exampleUsage: string;
  creditsCost: number;
}

export interface TerminalHints {
  quickExamples: string[];
  placeholderText: string;
  emptyStateMessage: string;
  dashboardHint: string;
  chartSuggestion: string;
}

export interface AutocompleteSuggestion {
  fqn: string;
  display: string;
  displaySecondary?: string;
  type: string;
  description?: string;
  score: number;
  // Command fields
  category?: string;
  requiresSymbol?: boolean;
  aliasFor?: string;
  // Symbol fields
  symbol?: string;
  name?: string;
  assetType?: string;
  exchange?: string;
  country?: string;
  currency?: string;
}

export interface CommandResult {
  success: boolean;
  message: string;
  execution?: {
    id: string;
    rawInput: string;
    parsedCommand: string;
    status: string;
  };
  result?: {
    success: boolean;
    message: string;
    outputType: string;
    data?: any;
    chartOptions?: any;
    metadata?: any;
  };
  job?: {
    uuid: string;
    status: string;
    kind: string;
  };
}

export interface Watchlist {
  uuid: string;
  name: string;
  description: string;
  watchlistType: string;
  isSystem: boolean;
  isDefault: boolean;
  canEdit: boolean;
  itemCount: number;
  items: WatchlistItem[];
}

export interface WatchlistItem {
  symbol: string;
  displayName: string;
  assetType: string;
  exchange: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
}

export interface MutationResult {
  success: boolean;
  message: string;
}

export interface CreateWatchlistResult extends MutationResult {
  watchlist?: {
    uuid: string;
    name: string;
    description: string;
  };
}

export interface SymbolMetadata {
  displayName?: string;
  assetType?: string;
  exchange?: string;
}
```

---

## FQN Format Reference

All terminal commands use Fully Qualified Names (FQN) for disambiguation:

| Type    | Format                       | Example                               |
|---------|------------------------------|---------------------------------------|
| Command | `COMMAND:<NAME>`             | `COMMAND:CHART`, `COMMAND:HELP`       |
| Stock   | `STOCK:<EXCHANGE>:<SYMBOL>`  | `STOCK:NYSE:DIS`, `STOCK:NASDAQ:AAPL` |
| Crypto  | `CRYPTO:<EXCHANGE>:<SYMBOL>` | `CRYPTO:COINBASE:BTC`                 |
| Index   | `INDEX:<PROVIDER>:<SYMBOL>`  | `INDEX:SP:500`                        |

### Example Commands

```
STOCK:NYSE:DIS COMMAND:CHART -period 1Y -interval daily
STOCK:NASDAQ:AAPL COMMAND:PRICE
STOCK:NASDAQ:AAPL STOCK:NASDAQ:MSFT COMMAND:COMPARE
COMMAND:HELP
```

**Note:** FQN parsing is case-insensitive. `stock:nyse:dis` works the same as `STOCK:NYSE:DIS`.

---

## Authentication Flow

### On Login

```typescript
// auth.service.ts
async login(credentials: Credentials): Promise<void> {
  const tokens = await this.authApi.login(credentials);
  this.storeTokens(tokens);
  
  // Apollo client will automatically use new token via connectionParams
  // No explicit reconnection needed - graphql-ws handles it
}
```

### On Token Refresh

```typescript
// auth.service.ts
async refreshToken(): Promise<void> {
  const newTokens = await this.authApi.refresh(this.getRefreshToken());
  this.storeTokens(newTokens);
  
  // graphql-ws will use new token on next operation
}
```

### On Logout

```typescript
// auth.service.ts
logout(): void {
  this.clearTokens();
  
  // Close WebSocket and clear Apollo cache
  resetApolloClient();
  
  this.router.navigate(['/login']);
}
```

---

## Error Handling

### Connection Errors

```typescript
// Handle in graphql-ws client setup
const wsClient = createClient({
  url: wsUrl,
  connectionParams: () => ({ authorization: `Bearer ${getToken()}` }),
  on: {
    error: (error) => {
      console.error('WebSocket error:', error);
      // Show user-friendly notification
      notificationService.error('Connection lost. Reconnecting...');
    },
    closed: (event) => {
      if (event.code === 4401) {
        // Unauthorized - token expired
        authService.refreshToken().catch(() => authService.logout());
      }
    },
    connected: () => {
      notificationService.success('Connected');
    }
  }
});
```

### GraphQL Errors

```typescript
// In your service
executeCommand(input: string): Observable<CommandResult> {
  return this.apollo.mutate(...).pipe(
    map(result => {
      if (result.errors) {
        // Handle GraphQL errors
        const errorMessage = result.errors.map(e => e.message).join(', ');
        throw new Error(errorMessage);
      }
      return result.data!.executeCommand;
    }),
    catchError(error => {
      // Log and return error result
      console.error('GraphQL error:', error);
      return of({
        success: false,
        message: error.message || 'An error occurred'
      });
    })
  );
}
```

---

## Migration Checklist

### Phase 1: Setup
- [ ] Install `@apollo/client`, `graphql`, `graphql-ws`
- [ ] Create `websocket-link.ts`
- [ ] Create `apollo-client.ts`
- [ ] Create `graphql.module.ts`
- [ ] Add `GraphQLModule` to `AppModule` imports

### Phase 2: Terminal Service
- [ ] Remove old WebSocket connection code
- [ ] Update `loadCommands()` to use Apollo
- [ ] Update `loadTerminalHints()` to use Apollo
- [ ] Update `getAutocomplete()` to use Apollo query
- [ ] Update `executeCommand()` to use Apollo mutation
- [ ] Remove hardcoded fallback commands/hints

### Phase 3: Watchlist Service
- [ ] Update `getWatchlists()` to use Apollo
- [ ] Update `getSystemWatchlists()` to use Apollo
- [ ] Update mutations (add, remove, create, delete)
- [ ] Handle `canEdit` field for UI permissions

### Phase 4: Other Services
- [ ] Migrate any remaining HTTP GraphQL calls
- [ ] Update job status polling (if applicable)

### Phase 5: Cleanup
- [ ] Remove old HTTP link configuration
- [ ] Remove `/ws/terminal/` connection code
- [ ] Remove unused imports and dependencies
- [ ] Update environment configuration

### Phase 6: Testing
- [ ] Test authentication flow
- [ ] Test autocomplete performance
- [ ] Test command execution
- [ ] Test watchlist CRUD operations
- [ ] Test reconnection after network loss
- [ ] Test token refresh during active session

---

## Performance Considerations

### Debouncing Autocomplete

```typescript
// In your component
private searchSubject = new Subject<string>();

ngOnInit() {
  this.searchSubject.pipe(
    debounceTime(150),  // Wait 150ms after last keystroke
    distinctUntilChanged(),
    switchMap(input => this.terminalService.getAutocomplete(input))
  ).subscribe(suggestions => {
    this.suggestions = suggestions;
  });
}

onInputChange(value: string) {
  this.searchSubject.next(value);
}
```

### Caching Strategy

```typescript
// In apollo-client.ts cache configuration
cache: new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Don't cache autocomplete - always fresh
        autocomplete: { merge: false },
        // Cache commands for session
        commands: {
          merge: true,
          read(existing) {
            return existing;
          }
        },
        // Cache terminal hints for session
        terminalHints: {
          merge: true
        }
      }
    }
  }
})
```

---

## Troubleshooting

### WebSocket Won't Connect

1. Check browser console for errors
2. Verify token is valid: `console.log(authService.getAccessToken())`
3. Check WebSocket URL is correct (wss:// for production)
4. Verify backend is running and `/ws/graphql/` endpoint is accessible

### Operations Return Errors

1. Check the `errors` array in the response
2. Verify the query/mutation matches the backend schema
3. Check authentication - some operations require auth

### Stale Data

1. Use `fetchPolicy: 'network-only'` for fresh data
2. Use `refetchQueries` after mutations
3. Call `apollo.client.clearStore()` on logout

---

## Related Documentation

- [GraphQL WebSocket Protocol](https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md)
- [Apollo Client WebSocket Setup](https://www.apollographql.com/docs/react/data/subscriptions/)
- [Backend GraphQL Schema](../schema.graphql)
- [FQN System Documentation](TERMINAL_WEBSOCKET_AUTOCOMPLETE.md)

