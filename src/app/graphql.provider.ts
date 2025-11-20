// Copyright (c) 2025 Perpetuator LLC
import createUploadLink from 'apollo-upload-client/createUploadLink.mjs';
import { Apollo, APOLLO_OPTIONS } from 'apollo-angular';
import { ApplicationConfig } from '@angular/core';
import { ApolloClientOptions, ApolloLink, InMemoryCache } from '@apollo/client/core';
import { environment } from '../environments/environment';
import { OAuthAuthService } from './core/services/auth.service';
import { Injectable } from '@angular/core';
import { switchMap } from 'rxjs/operators';
import { cachePolicyRegistry } from './cache-policies';

const uri = environment.API_URL + '/graphql/';

@Injectable({
  providedIn: 'root',
})
export class ApolloAuthMiddleware {
  constructor(private authService: OAuthAuthService) {}

  createAuthMiddleware() {
    // @ts-expect-error: Suppressing TS2345 due to type mismatch in ApolloLink middleware
    return new ApolloLink((operation, forward) => {
      return this.authService.getTokenObservable().pipe(
        switchMap((token) => {
          operation.setContext({
            headers: {
              Authorization: token ? `Bearer ${token}` : '',
            },
          });
          return forward(operation);
        }),
      );
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function apolloOptionsFactory(apolloAuthMiddleware: ApolloAuthMiddleware): ApolloClientOptions<any> {
  const uploadLink = createUploadLink({ uri });

  const authMiddleware = apolloAuthMiddleware.createAuthMiddleware();

  return {
    link: authMiddleware.concat(uploadLink),
    cache: new InMemoryCache({
      typePolicies: cachePolicyRegistry.getAll(),
    }),
  };
}

export const graphqlProvider: ApplicationConfig['providers'] = [
  Apollo,
  ApolloAuthMiddleware,
  {
    provide: APOLLO_OPTIONS,
    useFactory: apolloOptionsFactory,
    deps: [ApolloAuthMiddleware],
  },
];
