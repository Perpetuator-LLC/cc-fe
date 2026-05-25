// Copyright (c) 2025-2026 Perpetuator LLC
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of, throwError } from 'rxjs';
import { ApiKey, ApiKeyAnalytics, ApiKeyService, ApiKeyUsage } from './api-key.service';
import { ErrorHandlerService } from '../utils/error-handler.service';

function makeApiKey(over: Partial<ApiKey> = {}): ApiKey {
  return {
    uuid: 'k1',
    name: 'Test Key',
    prefix: 'cck_test',
    rateLimitPerMinute: 60,
    rateLimitPerHour: 1000,
    rateLimitPerDay: 10000,
    isActive: true,
    lastUsed: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let apollo: jasmine.SpyObj<Apollo>;

  beforeEach(() => {
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query', 'mutate']);
    apollo.query.and.returnValue(of({ data: {} } as any));
    apollo.mutate.and.returnValue(of({ data: {} } as any));
    const errorHandler = jasmine.createSpyObj<ErrorHandlerService>('ErrorHandlerService', ['handleError']);
    errorHandler.handleError.and.callFake((err) => throwError(() => err));
    TestBed.configureTestingModule({
      providers: [
        ApiKeyService,
        { provide: Apollo, useValue: apollo },
        { provide: ErrorHandlerService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(ApiKeyService);
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  describe('getApiKeys', () => {
    it('returns the array on success', (done) => {
      const keys = [makeApiKey(), makeApiKey({ uuid: 'k2' })];
      apollo.query.and.returnValue(of({ data: { apiKeys: keys } } as any));
      service.getApiKeys().subscribe((result) => {
        expect(result).toEqual(keys);
        done();
      });
    });

    it('returns [] when apiKeys is missing', (done) => {
      apollo.query.and.returnValue(of({ data: { apiKeys: null } } as any));
      service.getApiKeys().subscribe((result) => {
        expect(result).toEqual([]);
        done();
      });
    });
  });

  describe('getApiKey', () => {
    it('passes uuid as a variable and returns the key', (done) => {
      const key = makeApiKey({ uuid: 'abc' });
      apollo.query.and.returnValue(of({ data: { apiKey: key } } as any));
      service.getApiKey('abc').subscribe((result) => {
        expect(result).toEqual(key);
        const vars = (apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
        expect(vars['uuid']).toBe('abc');
        done();
      });
    });
  });

  describe('createApiKey', () => {
    it('returns {key, apiKey} on success', (done) => {
      const key = makeApiKey({ uuid: 'new' });
      apollo.mutate.and.returnValue(
        of({
          data: { createApiKey: { success: true, message: 'ok', key: 'cck_secret', apiKey: key } },
        } as any),
      );
      service.createApiKey({ name: 'N', rateLimitPerMinute: 30 }).subscribe((result) => {
        expect(result.key).toBe('cck_secret');
        expect(result.apiKey).toEqual(key);
        const vars = (apollo.mutate.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
        expect(vars['name']).toBe('N');
        expect(vars['rateLimitPerMinute']).toBe(30);
        done();
      });
    });

    it('throws when success is false', (done) => {
      apollo.mutate.and.returnValue(
        of({ data: { createApiKey: { success: false, message: 'nope', key: '', apiKey: null } } } as any),
      );
      service.createApiKey({ name: 'N' }).subscribe({
        next: () => fail('should error'),
        error: (err) => {
          expect(err.message).toBe('nope');
          done();
        },
      });
    });
  });

  describe('updateApiKey', () => {
    it('returns the apiKey on success', (done) => {
      const updated = makeApiKey({ name: 'Renamed' });
      apollo.mutate.and.returnValue(
        of({ data: { updateApiKey: { success: true, message: 'ok', apiKey: updated } } } as any),
      );
      service.updateApiKey({ uuid: 'k1', name: 'Renamed' }).subscribe((result) => {
        expect(result.name).toBe('Renamed');
        done();
      });
    });

    it('throws when success is false', (done) => {
      apollo.mutate.and.returnValue(
        of({ data: { updateApiKey: { success: false, message: 'no can do', apiKey: null } } } as any),
      );
      service.updateApiKey({ uuid: 'k1' }).subscribe({
        next: () => fail('should error'),
        error: (err) => {
          expect(err.message).toBe('no can do');
          done();
        },
      });
    });
  });

  describe('deleteApiKey', () => {
    it('returns true on success', (done) => {
      apollo.mutate.and.returnValue(of({ data: { deleteApiKey: { success: true, message: 'gone' } } } as any));
      service.deleteApiKey('k1').subscribe((ok) => {
        expect(ok).toBeTrue();
        done();
      });
    });

    it('throws on failure', (done) => {
      apollo.mutate.and.returnValue(of({ data: { deleteApiKey: { success: false, message: 'in use' } } } as any));
      service.deleteApiKey('k1').subscribe({
        next: () => fail('should error'),
        error: (err) => {
          expect(err.message).toBe('in use');
          done();
        },
      });
    });
  });

  describe('getApiKeyAnalytics', () => {
    it('returns analytics object', (done) => {
      const analytics: ApiKeyAnalytics = {
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
        requestsLast24h: 10,
        requestsLast7d: 50,
        requestsLast30d: 100,
        mostUsedEndpoints: ['/foo'],
        uniqueIps: 3,
        firstUsed: '2026-01-01T00:00:00Z',
        lastUsed: '2026-05-01T00:00:00Z',
      };
      apollo.query.and.returnValue(of({ data: { apiKeyAnalytics: analytics } } as any));
      service.getApiKeyAnalytics('k1').subscribe((result) => {
        expect(result).toEqual(analytics);
        done();
      });
    });
  });

  describe('getApiKeyUsage', () => {
    it('returns the usage array', (done) => {
      const usage: ApiKeyUsage[] = [
        {
          uuid: 'u1',
          endpoint: '/x',
          ipAddress: '1.2.3.4',
          success: true,
          errorMessage: null,
          timestamp: '2026-01-01T00:00:00Z',
        },
      ];
      apollo.query.and.returnValue(of({ data: { apiKeyUsage: usage } } as any));
      service.getApiKeyUsage('k1', 50).subscribe((result) => {
        expect(result).toEqual(usage);
        const vars = (apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
        expect(vars['limit']).toBe(50);
        done();
      });
    });

    it('defaults limit to 100 and returns [] when usage is missing', (done) => {
      apollo.query.and.returnValue(of({ data: { apiKeyUsage: null } } as any));
      service.getApiKeyUsage('k1').subscribe((result) => {
        expect(result).toEqual([]);
        const vars = (apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
        expect(vars['limit']).toBe(100);
        done();
      });
    });
  });
});
