// Copyright (c) 2026 Perpetuator LLC
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { AppConfigService } from './app-config.service';
import { GraphQLWsService } from './graphql-ws.service';

describe('GraphQLWsService', () => {
  let service: GraphQLWsService;

  // Point the socket at the karma server itself: the upgrade is rejected
  // immediately, so no test ever waits on a real backend.
  function createService(loggedIn: boolean): GraphQLWsService {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isLoggedIn: signal(loggedIn), getToken: () => 'test-token' } },
        { provide: AppConfigService, useValue: { config: { API_URL: 'http://localhost:9876' } } },
      ],
    });
    const svc = TestBed.inject(GraphQLWsService);
    TestBed.tick(); // flush the auth-state effect feeding toObservable()
    return svc;
  }

  afterEach(() => {
    service?.ngOnDestroy();
  });

  describe('logged out', () => {
    beforeEach(() => {
      service = createService(false);
    });

    it('stays disconnected and reports state', () => {
      expect(service.connectionState()).toBe('disconnected');
      expect(service.isConnected).toBeFalse();
    });

    it('query() errors when there is no client', (done) => {
      service.query('{ me }').subscribe({
        next: () => done.fail('expected an error'),
        error: (error: Error) => {
          expect(error.message).toBe('GraphQL WebSocket not connected');
          done();
        },
      });
    });

    it('mutate() delegates to query() and errors without a client', (done) => {
      service.mutate('mutation { x }').subscribe({
        error: (error: Error) => {
          expect(error.message).toBe('GraphQL WebSocket not connected');
          done();
        },
      });
    });

    it('subscribe() errors when there is no client', (done) => {
      service.subscribe('subscription { x }').subscribe({
        error: (error: Error) => {
          expect(error.message).toBe('GraphQL WebSocket not connected');
          done();
        },
      });
    });
  });

  describe('logged in', () => {
    beforeEach(() => {
      service = createService(true);
    });

    it('auto-connects on login and disconnects cleanly', () => {
      expect(service.connectionState()).toBe('connecting');
      service.disconnect();
      expect(service.connectionState()).toBe('disconnected');
    });

    it('connect() is idempotent while a client exists', () => {
      const state = service.connectionState();
      service.connect();
      expect(service.connectionState()).toBe(state);
    });
  });

  it('ngOnDestroy completes the event streams', () => {
    service = createService(false);
    let connectedDone = false;
    let disconnectedDone = false;
    let errorDone = false;
    service.onConnected.subscribe({ complete: () => (connectedDone = true) });
    service.onDisconnected.subscribe({ complete: () => (disconnectedDone = true) });
    service.onError.subscribe({ complete: () => (errorDone = true) });

    service.ngOnDestroy();

    expect(connectedDone).toBeTrue();
    expect(disconnectedDone).toBeTrue();
    expect(errorDone).toBeTrue();
    expect(service.connectionState()).toBe('disconnected');
  });
});
