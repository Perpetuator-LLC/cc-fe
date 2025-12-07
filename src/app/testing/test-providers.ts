// Copyright (c) 2025 Perpetuator LLC
import { Apollo } from 'apollo-angular';
import { OAuthService } from 'angular-oauth2-oidc';
import { ActivatedRoute, Router, UrlTree } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ToolbarService } from '../toolbar.service';

/**
 * Creates a mock Apollo provider for testing
 */
export function provideMockApollo() {
  const mockApollo = jasmine.createSpyObj('Apollo', ['query', 'mutate', 'watchQuery']);
  mockApollo.query.and.returnValue(of({ data: {}, loading: false, networkStatus: 7 }));
  mockApollo.mutate.and.returnValue(of({ data: {}, loading: false, networkStatus: 7 }));
  mockApollo.watchQuery.and.returnValue({
    valueChanges: of({ data: {}, loading: false, networkStatus: 7 }),
    refetch: jasmine
      .createSpy('refetch')
      .and.returnValue(Promise.resolve({ data: {}, loading: false, networkStatus: 7 })),
  });
  return { provide: Apollo, useValue: mockApollo };
}

/**
 * Creates a mock OAuthService provider for testing
 */
export function provideMockOAuthService() {
  const mockOAuthService = jasmine.createSpyObj('OAuthService', [
    'configure',
    'loadDiscoveryDocumentAndTryLogin',
    'hasValidAccessToken',
    'getAccessToken',
    'getIdentityClaims',
    'logOut',
    'initCodeFlow',
    'setupAutomaticSilentRefresh',
  ]);
  mockOAuthService.hasValidAccessToken.and.returnValue(false);
  mockOAuthService.getAccessToken.and.returnValue('');
  mockOAuthService.getIdentityClaims.and.returnValue(null);
  mockOAuthService.loadDiscoveryDocumentAndTryLogin.and.returnValue(Promise.resolve());
  mockOAuthService.events = of({}); // Add events observable
  return { provide: OAuthService, useValue: mockOAuthService };
}

/**
 * Creates a mock ActivatedRoute provider for testing
 */
export function provideMockActivatedRoute(
  params: Record<string, unknown> = {},
  queryParams: Record<string, unknown> = {},
) {
  const paramMap = {
    get: (key: string) => params[key],
    has: (key: string) => key in params,
    keys: Object.keys(params),
  };

  const queryParamMap = {
    get: (key: string) => queryParams[key],
    has: (key: string) => key in queryParams,
    keys: Object.keys(queryParams),
  };

  const mockActivatedRoute = {
    snapshot: {
      params,
      queryParams,
      data: {},
      paramMap,
      queryParamMap,
    },
    params: of(params),
    queryParams: of(queryParams),
    data: of({}),
    paramMap: of(paramMap),
    queryParamMap: of(queryParamMap),
  };
  return { provide: ActivatedRoute, useValue: mockActivatedRoute };
}

/**
 * Creates a mock Router provider for testing
 */
export function provideMockRouter() {
  const eventsSubject = new Subject();
  const mockRouter = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl', 'createUrlTree', 'serializeUrl'], {
    events: eventsSubject.asObservable(),
  });
  mockRouter.navigate.and.returnValue(Promise.resolve(true));
  mockRouter.navigateByUrl.and.returnValue(Promise.resolve(true));
  mockRouter.createUrlTree.and.returnValue({} as UrlTree); // Return empty UrlTree
  mockRouter.serializeUrl.and.returnValue('/'); // Return simple string URL
  return { provide: Router, useValue: mockRouter };
}

/**
 * Creates a mock ToolbarService provider for testing
 */
export function provideMockToolbarService() {
  const mockViewContainerRef = jasmine.createSpyObj('ViewContainerRef', ['clear', 'createEmbeddedView']);
  const mockToolbarService = jasmine.createSpyObj('ToolbarService', [
    'getViewContainerRef',
    'clearToolbarComponent',
    'setTemplate',
    'clearTemplate',
  ]);
  mockToolbarService.getViewContainerRef.and.returnValue(mockViewContainerRef);
  mockToolbarService.clearToolbarComponent.and.stub(); // No-op for cleanup
  return { provide: ToolbarService, useValue: mockToolbarService };
}
