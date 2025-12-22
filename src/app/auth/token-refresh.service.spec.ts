// Copyright (c) 2025 Perpetuator LLC
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Injector } from '@angular/core';
import { of, throwError } from 'rxjs';
import { TokenRefreshService } from './token-refresh.service';
import { TokenStorageService } from './token-storage.service';
import { TraceService } from '../traces/trace.service';

describe('TokenRefreshService', () => {
  let service: TokenRefreshService;
  let mockHttp: jasmine.SpyObj<HttpClient>;
  let mockTokenStorage: jasmine.SpyObj<TokenStorageService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockTraceService: jasmine.SpyObj<TraceService>;
  let mockInjector: jasmine.SpyObj<Injector>;

  beforeEach(() => {
    mockHttp = jasmine.createSpyObj('HttpClient', ['post']);
    mockTokenStorage = jasmine.createSpyObj('TokenStorageService', ['storeTokens', 'clearTokens']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockTraceService = jasmine.createSpyObj('TraceService', ['recordTrace']);
    mockTraceService.recordTrace.and.returnValue(of(true));

    mockInjector = jasmine.createSpyObj('Injector', ['get']);
    mockInjector.get.and.returnValue(mockTraceService);

    TestBed.configureTestingModule({
      providers: [
        TokenRefreshService,
        { provide: HttpClient, useValue: mockHttp },
        { provide: TokenStorageService, useValue: mockTokenStorage },
        { provide: Router, useValue: mockRouter },
        { provide: Injector, useValue: mockInjector },
      ],
    });

    service = TestBed.inject(TokenRefreshService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('refreshToken', () => {
    it('should refresh token successfully and store both tokens', (done) => {
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid profile email',
      };

      mockHttp.post.and.returnValue(of(mockResponse));

      service.refreshToken('old-refresh-token').subscribe((success) => {
        expect(success).toBe(true);
        expect(mockHttp.post).toHaveBeenCalled();
        expect(mockTokenStorage.storeTokens).toHaveBeenCalledWith({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresAt: jasmine.any(Number),
          tokenType: 'Bearer',
          scope: 'openid profile email',
        });
        done();
      });
    });

    it('should store BOTH access and refresh tokens (token rotation)', (done) => {
      const mockResponse = {
        access_token: 'rotated-access-token',
        refresh_token: 'rotated-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid profile email',
      };

      mockHttp.post.and.returnValue(of(mockResponse));

      service.refreshToken('old-refresh-token').subscribe(() => {
        const storeCall = mockTokenStorage.storeTokens.calls.mostRecent().args[0];
        // CRITICAL: Verify both tokens are stored for token rotation
        expect(storeCall.accessToken).toBe('rotated-access-token');
        expect(storeCall.refreshToken).toBe('rotated-refresh-token');
        done();
      });
    });

    it('should calculate correct expiration time', fakeAsync(() => {
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600, // 1 hour
        token_type: 'Bearer',
        scope: 'openid profile email',
      };

      mockHttp.post.and.returnValue(of(mockResponse));
      const beforeCall = Date.now();

      service.refreshToken('test-refresh-token').subscribe();
      tick();

      const storeCall = mockTokenStorage.storeTokens.calls.mostRecent().args[0];
      const expiresAt = storeCall.expiresAt as number;
      // Should be approximately 1 hour from now (3600 * 1000 ms)
      expect(expiresAt).toBeGreaterThanOrEqual(beforeCall + 3600 * 1000 - 100);
      expect(expiresAt).toBeLessThanOrEqual(Date.now() + 3600 * 1000 + 100);
    }));

    it('should return false and logout on invalid_grant error', (done) => {
      const error = {
        error: { error: 'invalid_grant' },
      };

      mockHttp.post.and.returnValue(throwError(() => error));

      service.refreshToken('invalid-refresh-token').subscribe((success) => {
        expect(success).toBe(false);
        expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
        done();
      });
    });

    it('should return false on other errors without logging out', (done) => {
      const error = new Error('Network error');

      mockHttp.post.and.returnValue(throwError(() => error));

      service.refreshToken('some-refresh-token').subscribe((success) => {
        expect(success).toBe(false);
        expect(mockTokenStorage.clearTokens).not.toHaveBeenCalled();
        done();
      });
    });

    it('should send correct OAuth2 refresh token grant request', (done) => {
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid profile email',
      };

      mockHttp.post.and.returnValue(of(mockResponse));

      service.refreshToken('test-refresh-token').subscribe(() => {
        const [url, body, options] = mockHttp.post.calls.mostRecent().args;

        expect(url).toContain('/o/token/');
        expect(body).toContain('grant_type=refresh_token');
        expect(body).toContain('refresh_token=test-refresh-token');
        const headers = options?.headers as Record<string, string | string[]>;
        expect(headers?.['Content-Type']).toBe('application/x-www-form-urlencoded');
        expect(options?.withCredentials).toBe(true);
        done();
      });
    });

    it('should track successful token rotation in telemetry', (done) => {
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid profile email',
      };

      mockHttp.post.and.returnValue(of(mockResponse));

      service.refreshToken('test-refresh-token').subscribe(() => {
        expect(mockTraceService.recordTrace).toHaveBeenCalledWith(
          jasmine.objectContaining({
            kind: 'token_rotation',
            severity: 'INFO',
            message: 'Access token refreshed successfully',
          }),
        );
        done();
      });
    });

    it('should track token refresh failure in telemetry', (done) => {
      const error = { error: { error: 'server_error' } };
      mockHttp.post.and.returnValue(throwError(() => error));

      service.refreshToken('test-refresh-token').subscribe(() => {
        expect(mockTraceService.recordTrace).toHaveBeenCalledWith(
          jasmine.objectContaining({
            kind: 'auth_failure',
            severity: 'WARNING',
            message: 'Token refresh failed',
          }),
        );
        done();
      });
    });
  });
});
