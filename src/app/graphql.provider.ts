// Copyright (c) 2025 Perpetuator LLC
import createUploadLink from 'apollo-upload-client/createUploadLink.mjs';
import { Apollo, APOLLO_OPTIONS } from 'apollo-angular';
import { ApplicationConfig, inject } from '@angular/core';
import { ApolloClientOptions, ApolloLink, InMemoryCache } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { Observable as ZenObservable } from 'zen-observable-ts';
import { environment } from '../environments/environment';
import { TokenStorageService } from './auth/token-storage.service';
import { TokenRefreshService } from './auth/token-refresh.service';
import { cachePolicyRegistry } from './cache-policies';
import { firstValueFrom } from 'rxjs';

const uri = environment.API_URL + '/graphql/';

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
export function apolloOptionsFactory(): ApolloClientOptions<unknown> {
  const tokenStorage = inject(TokenStorageService);
  const tokenRefreshService = inject(TokenRefreshService);

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
  const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
    // Don't try to refresh token for anonymous requests
    const context = operation.getContext();
    if (context['useAnonymous']) {
      return;
    }

    // Check for authentication errors
    const isAuthError =
      (networkError && 'statusCode' in networkError && networkError.statusCode === 401) ||
      graphQLErrors?.some(
        (err) =>
          err.extensions?.['code'] === 'UNAUTHENTICATED' ||
          err.message.toLowerCase().includes('not authenticated') ||
          err.message.toLowerCase().includes('authentication required') ||
          err.message.toLowerCase().includes('authentication credentials invalid') ||
          err.message.toLowerCase().includes('token not valid') ||
          err.message.toLowerCase().includes('token is invalid or expired'),
      );

    if (isAuthError) {
      // Return a new observable that refreshes token and retries
      return new ZenObservable((observer) => {
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
                next: observer.next.bind(observer),
                error: observer.error.bind(observer),
                complete: observer.complete.bind(observer),
              });

              return () => subscriber.unsubscribe();
            } else {
              // Token refresh failed, let the error propagate
              observer.error(networkError || graphQLErrors?.[0]);
              return undefined;
            }
          })
          .catch((error) => {
            observer.error(error);
          });
      });
    }

    // Not an auth error, don't retry
    return;
  });

  // Upload link with credentials for cookies
  const uploadLink = createUploadLink({
    uri,
    credentials: 'include', // For logged_in cookie
  });

  return {
    link: ApolloLink.from([errorLink, authLink, uploadLink]),
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
