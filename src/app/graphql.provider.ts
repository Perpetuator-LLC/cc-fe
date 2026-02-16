// Copyright (c) 2025-2026 Perpetuator LLC
import UploadHttpLink from 'apollo-upload-client/UploadHttpLink.mjs';
import { Apollo, APOLLO_OPTIONS } from 'apollo-angular';
import { ApplicationConfig, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApolloClient, ApolloLink, InMemoryCache, split } from '@apollo/client/core';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { setContext } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { createClient, Client } from 'graphql-ws';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { TokenStorageService } from './auth/token-storage.service';
import { TokenRefreshService } from './auth/token-refresh.service';
import { cachePolicyRegistry } from './cache-policies';
import { firstValueFrom } from 'rxjs';

const uri = environment.API_URL + '/graphql/';

// WebSocket URL for GraphQL subscriptions and real-time operations
function getWebSocketUrl(): string {
  const wsProtocol = environment.API_URL.startsWith('https') ? 'wss' : 'ws';
  const wsHost = environment.API_URL.replace(/^https?:\/\//, '');
  return `${wsProtocol}://${wsHost}/ws/graphql/`;
}

// Shared WebSocket client instance for GraphQL operations
let wsClient: Client | null = null;

/**
 * Get the shared GraphQL WebSocket client
 * Creates client on first call, reuses existing instance
 */
export function getGraphQLWsClient(tokenStorage: TokenStorageService): Client {
  if (!wsClient) {
    wsClient = createClient({
      url: getWebSocketUrl(),
      connectionParams: () => {
        const token = tokenStorage.getAccessToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
      // Reconnection settings
      retryAttempts: 10,
      shouldRetry: () => true,
      retryWait: async (retries) => {
        // Exponential backoff: 1s, 2s, 4s, 8s, ... up to 30s
        const delay = Math.min(1000 * Math.pow(2, retries), 30000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      },
      keepAlive: 30000, // Send ping every 30 seconds
      lazy: false, // Connect immediately when client is created
      on: {
        connected: () => console.debug('[GraphQL-WS] Connected'),
        closed: () => console.debug('[GraphQL-WS] Closed'),
        error: (error) => console.error('[GraphQL-WS] Error:', error),
      },
    });
  }
  return wsClient;
}

/**
 * Disconnect and dispose the WebSocket client
 * Call this on logout or when cleaning up
 */
export function disconnectGraphQLWs(): void {
  if (wsClient) {
    wsClient.dispose();
    wsClient = null;
    console.debug('[GraphQL-WS] Disconnected and disposed');
  }
}

// Shared state for managing concurrent refresh requests in GraphQL
let isRefreshingGraphQL = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Apollo GraphQL configuration
 *
 * Architecture (per AUTH_COOKIE_CROSS_DOMAIN.md):
 * - Sends Authorization: Bearer <token> header for authentication
 * - Sends credentials: 'include' for logged_in cookie (cross-subdomain)
 * - Backend validates the Bearer token, NOT the cookie
 * - Automatically refreshes token when expired or about to expire
 */
export function apolloOptionsFactory(): ApolloClient.Options {
  const tokenStorage = inject(TokenStorageService);
  const tokenRefreshService = inject(TokenRefreshService);
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);

  /**
   * Refresh the token and return the new access token
   */
  async function refreshAndGetToken(): Promise<string | null> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    // If already refreshing, wait for the existing promise
    if (isRefreshingGraphQL && refreshPromise) {
      return refreshPromise;
    }

    isRefreshingGraphQL = true;

    refreshPromise = firstValueFrom(tokenRefreshService.refreshToken(refreshToken))
      .then((success) => {
        isRefreshingGraphQL = false;
        refreshPromise = null;
        if (success) {
          return tokenStorage.getAccessToken();
        }
        return null;
      })
      .catch(() => {
        isRefreshingGraphQL = false;
        refreshPromise = null;
        return null;
      });

    return refreshPromise;
  }

  /**
   * Check if we should proactively refresh the token
   * Refresh if token is expired or will expire within 60 seconds
   */
  function shouldRefreshToken(): boolean {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      return false;
    }

    const expiresAt = tokenStorage.getExpiresAt();
    if (!expiresAt) {
      return false;
    }

    // Refresh if token expires within 60 seconds
    const refreshThreshold = 60000;
    return Date.now() >= expiresAt - refreshThreshold;
  }

  // Auth link adds Authorization header (with proactive refresh)
  // Respects useAnonymous context to skip auth for unauthenticated mutations (e.g., recordTrace)
  const authLink = setContext(async (_, context) => {
    const { headers, useAnonymous } = context;

    // Skip authentication for anonymous requests (e.g., trace recording)
    if (useAnonymous) {
      return { headers };
    }

    let token = tokenStorage.getAccessToken();
    const isExpired = tokenStorage.isAccessTokenExpired();

    // Proactive refresh: refresh if token is expired or about to expire
    if (shouldRefreshToken() || isExpired) {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        token = await refreshAndGetToken();
      }
    }

    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  });

  // Error link handles 401s and retries with refreshed token
  // Skips retry for anonymous requests (they shouldn't need auth)
  const errorLink = new ErrorLink(({ error, operation, forward }) => {
    // Don't try to refresh token for anonymous requests
    const context = operation.getContext();
    if (context['useAnonymous']) {
      return;
    }

    // Check for authentication errors
    let isAuthError = false;

    if (CombinedGraphQLErrors.is(error)) {
      // GraphQL errors - check for auth-related error codes/messages
      isAuthError = error.errors.some(
        (err) =>
          err.extensions?.['code'] === 'UNAUTHENTICATED' ||
          err.message.toLowerCase().includes('not authenticated') ||
          err.message.toLowerCase().includes('authentication required') ||
          err.message.toLowerCase().includes('authentication credentials invalid') ||
          err.message.toLowerCase().includes('token not valid') ||
          err.message.toLowerCase().includes('token is invalid or expired'),
      );
    } else if (error && 'statusCode' in error && (error as { statusCode?: number }).statusCode === 401) {
      // Network error with 401 status
      isAuthError = true;
    }

    if (isAuthError) {
      // Return a new observable that refreshes token and retries
      return new Observable((observer) => {
        refreshAndGetToken()
          .then((newToken) => {
            if (newToken) {
              // Update the operation context with new token
              const oldHeaders = operation.getContext()['headers'] || {};
              operation.setContext({
                headers: {
                  ...oldHeaders,
                  authorization: `Bearer ${newToken}`,
                },
              });

              // Retry the request
              const subscriber = forward(operation).subscribe({
                next: (value) => observer.next(value),
                error: (err) => observer.error(err),
                complete: () => observer.complete(),
              });

              return () => subscriber.unsubscribe();
            } else {
              // Token refresh failed, let the error propagate
              observer.error(error);
              return undefined;
            }
          })
          .catch((err) => {
            observer.error(err);
          });
      });
    }

    // Not an auth error, don't retry
    return;
  });

  // Upload link with credentials for cookies (HTTP)
  const uploadLink = new UploadHttpLink({
    uri,
    credentials: 'include', // For logged_in cookie
  });

  // HTTP link chain (upload with auth and error handling)
  const httpLink = ApolloLink.from([errorLink, authLink, uploadLink]);

  // Only use WebSocket in browser environment (SSR doesn't support WebSocket properly)
  let finalLink: ApolloLink;

  if (isBrowser) {
    // WebSocket link for subscriptions and real-time operations
    const wsClient = getGraphQLWsClient(tokenStorage);
    const wsLink = new GraphQLWsLink(wsClient);

    // Split link: use WebSocket for subscriptions, HTTP for queries/mutations
    finalLink = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
      },
      wsLink, // Use WebSocket for subscriptions
      httpLink, // Use HTTP for queries and mutations
    );
  } else {
    // On server (SSR), only use HTTP - no WebSocket support
    console.debug('[GraphQL] SSR mode - WebSocket disabled');
    finalLink = httpLink;
  }

  return {
    link: finalLink,
    cache: new InMemoryCache({
      typePolicies: cachePolicyRegistry.getAll(),
    }),
  };
}

export const graphqlProvider: ApplicationConfig['providers'] = [
  Apollo,
  {
    provide: APOLLO_OPTIONS,
    useFactory: apolloOptionsFactory,
  },
];
