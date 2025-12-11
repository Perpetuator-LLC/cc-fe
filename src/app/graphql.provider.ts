// Copyright (c) 2025 Perpetuator LLC
import createUploadLink from 'apollo-upload-client/createUploadLink.mjs';
import { Apollo, APOLLO_OPTIONS } from 'apollo-angular';
import { ApplicationConfig, inject } from '@angular/core';
import { ApolloClientOptions, ApolloLink, InMemoryCache } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { environment } from '../environments/environment';
import { TokenStorageService } from './auth/token-storage.service';
import { cachePolicyRegistry } from './cache-policies';

const uri = environment.API_URL + '/graphql/';

/**
 * Apollo GraphQL configuration
 *
 * Architecture (per AUTH_COOKIE_CROSS_DOMAIN.md):
 * - Sends Authorization: Bearer <token> header for authentication
 * - Sends credentials: 'include' for logged_in cookie (cross-subdomain)
 * - Backend validates the Bearer token, NOT the cookie
 */
export function apolloOptionsFactory(): ApolloClientOptions<unknown> {
  const tokenStorage = inject(TokenStorageService);

  // Auth link adds Authorization header
  const authLink = setContext((_, { headers }) => {
    const token = tokenStorage.getAccessToken();
    const isExpired = tokenStorage.isAccessTokenExpired();

    return {
      headers: {
        ...headers,
        authorization: token && !isExpired ? `Bearer ${token}` : '',
      },
    };
  });

  // Upload link with credentials for cookies
  const uploadLink = createUploadLink({
    uri,
    credentials: 'include', // For logged_in cookie
  });

  return {
    link: ApolloLink.from([authLink, uploadLink]),
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
