// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TokenRefreshService } from './token-refresh.service';
import { TokenStorageService } from './token-storage.service';

describe('TokenRefreshService', () => {
  let service: TokenRefreshService;
  let mockHttp: jasmine.SpyObj<HttpClient>;
  let mockTokenStorage: jasmine.SpyObj<TokenStorageService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockHttp = jasmine.createSpyObj('HttpClient', ['post']);
    mockTokenStorage = jasmine.createSpyObj('TokenStorageService', ['storeTokens', 'clearTokens']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        TokenRefreshService,
        { provide: HttpClient, useValue: mockHttp },
        { provide: TokenStorageService, useValue: mockTokenStorage },
        { provide: Router, useValue: mockRouter },
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
          refreshToken: 'new-refresh-token', // Must store new refresh token!
          expiresAt: jasmine.any(Number),
          tokenType: 'Bearer',
          scope: 'openid profile email',
        });
        done();
      });
    });

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
        // Should NOT logout on generic errors
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
  });
});
