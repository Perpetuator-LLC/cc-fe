// Copyright (c) 2025 Perpetuator LLC
/**
 * Common test helpers and mock providers
 * Use these to avoid repetitive test setup
 */

import { Injector, Provider } from '@angular/core';
import { of, Subject } from 'rxjs';
import { OAuthService } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Apollo } from 'apollo-angular';

/**
 * Creates a mock OAuthService spy with default implementations
 * @returns Jasmine spy object for OAuthService
 */
export function createMockOAuthService(): jasmine.SpyObj<OAuthService> {
  const spy = jasmine.createSpyObj('OAuthService', [
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
  spy.loadDiscoveryDocumentAndTryLogin.and.returnValue(Promise.resolve(true));
  spy.hasValidAccessToken.and.returnValue(false);
  spy.getAccessToken.and.returnValue(null);

  // Mock events as an observable
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (spy as any).events = of({ type: 'token_received' });

  return spy;
}

/**
 * Creates a mock Apollo spy with default implementations
 * @returns Jasmine spy object for Apollo
 */
export function createMockApollo(): jasmine.SpyObj<Apollo> {
  const spy = jasmine.createSpyObj('Apollo', ['query', 'mutate', 'watchQuery', 'use']);

  // Setup default return values
  spy.query.and.returnValue(of({ data: {}, loading: false, networkStatus: 7 }));
  spy.mutate.and.returnValue(of({ data: {}, loading: false }));
  spy.watchQuery.and.returnValue({
    valueChanges: of({ data: {}, loading: false, networkStatus: 7 }),
    refetch: jasmine
      .createSpy('refetch')
      .and.returnValue(Promise.resolve({ data: {}, loading: false, networkStatus: 7 })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return spy;
}

/**
 * Creates a mock Router spy with default implementations
 * @returns Jasmine spy object for Router
 */
export function createMockRouter(): jasmine.SpyObj<Router> {
  const spy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);

  spy.navigate.and.returnValue(Promise.resolve(true));
  spy.navigateByUrl.and.returnValue(Promise.resolve(true));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (spy as any).events = new Subject();

  return spy;
}

/**
 * Creates a mock HttpClient spy with default implementations
 * @returns Jasmine spy object for HttpClient
 */
export function createMockHttpClient(): jasmine.SpyObj<HttpClient> {
  const spy = jasmine.createSpyObj('HttpClient', ['get', 'post', 'put', 'delete', 'patch']);

  spy.get.and.returnValue(of({}));
  spy.post.and.returnValue(of({}));
  spy.put.and.returnValue(of({}));
  spy.delete.and.returnValue(of({}));
  spy.patch.and.returnValue(of({}));

  return spy;
}

/**
 * Common test providers for components that depend on auth services
 * Use this to avoid missing provider errors in tests
 */
export const COMMON_TEST_PROVIDERS: Provider[] = [
  { provide: OAuthService, useFactory: createMockOAuthService },
  { provide: Apollo, useFactory: createMockApollo },
  { provide: Router, useFactory: createMockRouter },
  { provide: HttpClient, useFactory: createMockHttpClient },
];

/**
 * Helper to create a mock Injector that returns null for all services
 * Useful for testing services with lazy dependency injection
 */
export function createMockInjector(): jasmine.SpyObj<Injector> {
  return jasmine.createSpyObj('Injector', {
    get: null, // Returns null to simulate service not available
  });
}
