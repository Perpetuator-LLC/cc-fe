// Copyright (c) 2025 Perpetuator LLC
/**
 * Common test helpers and providers for unit tests
 */
import { Provider } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { Apollo } from 'apollo-angular';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

/**
 * Creates a mock OAuthService for testing
 */
export function createMockOAuthService(): jasmine.SpyObj<OAuthService> {
  const mockOAuthService = jasmine.createSpyObj('OAuthService', [
    'configure',
    'loadDiscoveryDocumentAndTryLogin',
    'hasValidAccessToken',
    'initCodeFlow',
    'logOut',
    'getAccessToken',
    'refreshToken',
    'loadUserProfile',
  ]);

  // Setup default return values
  mockOAuthService.loadDiscoveryDocumentAndTryLogin.and.returnValue(Promise.resolve(true));
  mockOAuthService.hasValidAccessToken.and.returnValue(false);
  mockOAuthService.getAccessToken.and.returnValue('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockOAuthService.events = of({ type: 'token_received' }) as any;

  return mockOAuthService;
}

/**
 * Creates a mock Apollo client for testing
 */
export function createMockApollo(): jasmine.SpyObj<Apollo> {
  return jasmine.createSpyObj('Apollo', ['query', 'mutate', 'watchQuery']);
}

/**
 * Creates a mock ActivatedRoute for testing
 */
export function createMockActivatedRoute(params = {}, queryParams = {}): Partial<ActivatedRoute> {
  return {
    params: of(params),
    queryParams: of(queryParams),
    snapshot: {
      params,
      queryParams,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  };
}

/**
 * Common providers needed for most component/service tests
 * Includes OAuthService mock to avoid circular dependency issues
 */
export function getCommonTestProviders(): Provider[] {
  return [{ provide: OAuthService, useValue: createMockOAuthService() }];
}

/**
 * Providers for tests that need Apollo
 */
export function getApolloTestProviders(): Provider[] {
  return [...getCommonTestProviders(), { provide: Apollo, useValue: createMockApollo() }];
}

/**
 * Providers for tests that need ActivatedRoute
 */
export function getRouterTestProviders(params = {}, queryParams = {}): Provider[] {
  return [
    ...getCommonTestProviders(),
    { provide: ActivatedRoute, useValue: createMockActivatedRoute(params, queryParams) },
  ];
}
