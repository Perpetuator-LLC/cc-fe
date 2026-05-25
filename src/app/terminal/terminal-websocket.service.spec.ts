// Copyright (c) 2025-2026 Perpetuator LLC

import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { TerminalWebSocketService } from './terminal-websocket.service';
import { AuthService } from '../auth/auth.service';
import { AppConfigService } from '../core/app-config.service';

describe('TerminalWebSocketService', () => {
  let service: TerminalWebSocketService;
  let isLoggedIn: WritableSignal<boolean>;

  beforeEach(() => {
    isLoggedIn = signal<boolean>(false);
    const authService = {
      isLoggedIn,
      getToken: () => 'fake-token',
      logout: jasmine.createSpy(),
    } as unknown as AuthService;
    const appConfig = { config: { API_URL: 'https://api.test' } } as unknown as AppConfigService;

    TestBed.configureTestingModule({
      providers: [
        TerminalWebSocketService,
        { provide: AuthService, useValue: authService },
        { provide: AppConfigService, useValue: appConfig },
      ],
    });
    service = TestBed.inject(TerminalWebSocketService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('is created with disconnected state and all observable getters defined', () => {
    expect(service).toBeTruthy();
    expect(service.connectionState()).toBe('disconnected');
    expect(service.onCommandResult).toBeDefined();
    expect(service.onCommandProgress).toBeDefined();
    expect(service.onChartUpdate).toBeDefined();
    expect(service.onSymbolUpdate).toBeDefined();
    expect(service.onAutocomplete).toBeDefined();
    expect(service.onHistorySearch).toBeDefined();
    expect(service.onError).toBeDefined();
    expect(service.onConnected).toBeDefined();
    expect(service.onJobInitial).toBeDefined();
    expect(service.onJobCreated).toBeDefined();
    expect(service.onJobUpdated).toBeDefined();
    expect(service.onJobCompleted).toBeDefined();
    expect(service.onJobFailed).toBeDefined();
  });

  describe('subscribe/unsubscribe (no-op delegators)', () => {
    it('subscribeChart and unsubscribeChart run without throwing', () => {
      expect(() => service.subscribeChart('c1')).not.toThrow();
      expect(() => service.unsubscribeChart('c1')).not.toThrow();
    });

    it('subscribeSymbols and unsubscribeSymbols run without throwing', () => {
      expect(() => service.subscribeSymbols(['AAPL', 'TSLA'])).not.toThrow();
      expect(() => service.unsubscribeSymbols(['AAPL', 'TSLA'])).not.toThrow();
    });

    it('ping is a no-op', () => {
      expect(() => service.ping()).not.toThrow();
    });

    it('disconnect is safe to call without a client', () => {
      expect(() => service.disconnect()).not.toThrow();
    });
  });

  describe('handleJobMessage (new wrapped format)', () => {
    it('emits jobInitial when JobsInitial message arrives', (done) => {
      service.onJobInitial.subscribe((jobs) => {
        expect(jobs.length).toBe(1);
        done();
      });
      (service as unknown as { handleJobMessage: (m: unknown) => void }).handleJobMessage({
        type: 'next',
        id: '_jobs',
        payload: { data: { __typename: 'JobsInitial', jobs: [{ uuid: 'j1' }] } },
      });
    });

    it('emits jobCreated', (done) => {
      service.onJobCreated.subscribe((job) => {
        expect(job.uuid).toBe('j1');
        done();
      });
      (service as unknown as { handleJobMessage: (m: unknown) => void }).handleJobMessage({
        type: 'next',
        id: '_jobs',
        payload: { data: { __typename: 'JobCreated', job: { uuid: 'j1' } } },
      });
    });

    it('emits jobUpdated', (done) => {
      service.onJobUpdated.subscribe((job) => {
        expect(job.uuid).toBe('j2');
        done();
      });
      (service as unknown as { handleJobMessage: (m: unknown) => void }).handleJobMessage({
        type: 'next',
        id: '_jobs',
        payload: { data: { __typename: 'JobUpdate', job: { uuid: 'j2', status: 'RUNNING' } } },
      });
    });

    it('emits jobCompleted', (done) => {
      service.onJobCompleted.subscribe((job) => {
        expect(job.uuid).toBe('j3');
        done();
      });
      (service as unknown as { handleJobMessage: (m: unknown) => void }).handleJobMessage({
        type: 'next',
        id: '_jobs',
        payload: { data: { __typename: 'JobCompleted', job: { uuid: 'j3' } } },
      });
    });

    it('emits jobFailed', (done) => {
      service.onJobFailed.subscribe((job) => {
        expect(job.uuid).toBe('j4');
        done();
      });
      (service as unknown as { handleJobMessage: (m: unknown) => void }).handleJobMessage({
        type: 'next',
        id: '_jobs',
        payload: { data: { __typename: 'JobFailed', job: { uuid: 'j4' } } },
      });
    });

    it('ignores messages with no payload data', () => {
      expect(() =>
        (service as unknown as { handleJobMessage: (m: unknown) => void }).handleJobMessage({
          type: 'next',
          id: '_jobs',
          payload: {},
        }),
      ).not.toThrow();
    });

    it('ignores messages with unknown __typename', () => {
      expect(() =>
        (service as unknown as { handleJobMessage: (m: unknown) => void }).handleJobMessage({
          type: 'next',
          id: '_jobs',
          payload: { data: { __typename: 'Mystery', job: {} } },
        }),
      ).not.toThrow();
    });

    it('ignores null/undefined messages', () => {
      expect(() =>
        (service as unknown as { handleJobMessage: (m: unknown) => void }).handleJobMessage(null),
      ).not.toThrow();
    });
  });

  describe('handleJobMessage (legacy format)', () => {
    it('routes jobs.initial', (done) => {
      service.onJobInitial.subscribe((jobs) => {
        expect(jobs.length).toBe(2);
        done();
      });
      (service as unknown as { handleJobMessage: (m: unknown) => void }).handleJobMessage({
        type: 'jobs.initial',
        jobs: [{ uuid: 'a' }, { uuid: 'b' }],
      });
    });

    it('routes jobs.created', (done) => {
      service.onJobCreated.subscribe((job) => {
        expect(job.uuid).toBe('a');
        done();
      });
      (service as unknown as { handleJobMessage: (m: unknown) => void }).handleJobMessage({
        type: 'jobs.created',
        job: { uuid: 'a' },
      });
    });

    it('routes jobs.update', (done) => {
      service.onJobUpdated.subscribe((job) => {
        expect(job.uuid).toBe('b');
        done();
      });
      (service as unknown as { handleJobMessage: (m: unknown) => void }).handleJobMessage({
        type: 'jobs.update',
        job: { uuid: 'b', status: 'RUNNING' },
      });
    });

    it('routes jobs.completed', (done) => {
      service.onJobCompleted.subscribe((job) => {
        expect(job.uuid).toBe('c');
        done();
      });
      (service as unknown as { handleJobMessage: (m: unknown) => void }).handleJobMessage({
        type: 'jobs.completed',
        job: { uuid: 'c' },
      });
    });

    it('routes jobs.failed', (done) => {
      service.onJobFailed.subscribe((job) => {
        expect(job.uuid).toBe('d');
        done();
      });
      (service as unknown as { handleJobMessage: (m: unknown) => void }).handleJobMessage({
        type: 'jobs.failed',
        job: { uuid: 'd' },
      });
    });

    it('ignores legacy messages with no `type`', () => {
      expect(() =>
        (service as unknown as { handleJobMessage: (m: unknown) => void }).handleJobMessage({ random: 'thing' }),
      ).not.toThrow();
    });
  });

  describe('buildWebSocketUrl', () => {
    it('produces wss:// for https API URLs', () => {
      const url = (service as unknown as { buildWebSocketUrl: () => string }).buildWebSocketUrl();
      expect(url).toBe('wss://api.test/ws/graphql/');
    });

    it('produces ws:// for http API URLs', () => {
      // Replace the AppConfigService underlying config
      (service as unknown as { appConfig: { config: { API_URL: string } } }).appConfig = {
        config: { API_URL: 'http://api.local' },
      };
      const url = (service as unknown as { buildWebSocketUrl: () => string }).buildWebSocketUrl();
      expect(url).toBe('ws://api.local/ws/graphql/');
    });
  });
});
