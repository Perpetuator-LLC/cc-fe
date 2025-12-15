// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { tokenRefreshInterceptor } from './token-refresh.interceptor';
import { TokenStorageService } from '../token-storage.service';
import { TokenRefreshService } from '../token-refresh.service';

describe('tokenRefreshInterceptor', () => {
  let mockNext: jasmine.Spy<HttpHandlerFn>;
  let mockTokenStorage: jasmine.SpyObj<TokenStorageService>;
  let mockTokenRefreshService: jasmine.SpyObj<TokenRefreshService>;

  beforeEach(() => {
    mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(of({}));
    mockTokenStorage = jasmine.createSpyObj('TokenStorageService', [
      'getAccessToken',
      'getRefreshToken',
      'getExpiresAt',
      'isAccessTokenExpired',
    ]);
    mockTokenRefreshService = jasmine.createSpyObj('TokenRefreshService', ['refreshToken']);

    TestBed.configureTestingModule({
      providers: [
        { provide: TokenStorageService, useValue: mockTokenStorage },
        { provide: TokenRefreshService, useValue: mockTokenRefreshService },
      ],
    });

    // Default behavior
    mockTokenStorage.getAccessToken.and.returnValue('valid-token');
    mockTokenStorage.getRefreshToken.and.returnValue('refresh-token');
    mockTokenStorage.getExpiresAt.and.returnValue(Date.now() + 3600000); // 1 hour from now
    mockTokenStorage.isAccessTokenExpired.and.returnValue(false);
  });

  it('should skip OAuth2 token endpoints', () => {
    const req = new HttpRequest('POST', 'http://localhost:8000/o/token/', {});
    TestBed.runInInjectionContext(() => {
      tokenRefreshInterceptor(req, mockNext);
    });

    expect(mockNext).toHaveBeenCalled();
    // Should not check token storage for OAuth endpoints
  });

  it('should pass through request when token is not expired', () => {
    mockTokenStorage.getExpiresAt.and.returnValue(Date.now() + 3600000); // Far from expiry

    const req = new HttpRequest('GET', '/api/test');
    TestBed.runInInjectionContext(() => {
      tokenRefreshInterceptor(req, mockNext);
    });

    expect(mockNext).toHaveBeenCalled();
    expect(mockTokenRefreshService.refreshToken).not.toHaveBeenCalled();
  });

  it('should proactively refresh when token is about to expire', () => {
    // Token expires in 30 seconds (within 60 second threshold)
    mockTokenStorage.getExpiresAt.and.returnValue(Date.now() + 30000);
    mockTokenRefreshService.refreshToken.and.returnValue(of(true));

    const req = new HttpRequest('GET', '/api/test');
    TestBed.runInInjectionContext(() => {
      tokenRefreshInterceptor(req, mockNext).subscribe();
    });

    expect(mockTokenRefreshService.refreshToken).toHaveBeenCalledWith('refresh-token');
  });

  it('should not refresh if no refresh token is available', () => {
    mockTokenStorage.getExpiresAt.and.returnValue(Date.now() + 30000); // About to expire
    mockTokenStorage.getRefreshToken.and.returnValue(null); // No refresh token

    const req = new HttpRequest('GET', '/api/test');
    TestBed.runInInjectionContext(() => {
      tokenRefreshInterceptor(req, mockNext).subscribe();
    });

    expect(mockTokenRefreshService.refreshToken).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle 401 errors by refreshing token', () => {
    const error = new HttpErrorResponse({ status: 401 });
    mockNext.and.returnValue(throwError(() => error));
    mockTokenRefreshService.refreshToken.and.returnValue(of(true));
    mockTokenStorage.getAccessToken.and.returnValue('new-token');

    const req = new HttpRequest('GET', '/api/test');
    TestBed.runInInjectionContext(() => {
      tokenRefreshInterceptor(req, mockNext).subscribe({
        error: () => {
          // Error is expected if retry also fails
        },
      });
    });

    expect(mockTokenRefreshService.refreshToken).toHaveBeenCalled();
  });

  it('should pass through non-401 errors', () => {
    const error = new HttpErrorResponse({ status: 500 });
    mockNext.and.returnValue(throwError(() => error));

    const req = new HttpRequest('GET', '/api/test');
    let caughtError: HttpErrorResponse | undefined;

    TestBed.runInInjectionContext(() => {
      tokenRefreshInterceptor(req, mockNext).subscribe({
        error: (err: HttpErrorResponse) => {
          caughtError = err;
        },
      });
    });

    expect(caughtError?.status).toBe(500);
    expect(mockTokenRefreshService.refreshToken).not.toHaveBeenCalled();
  });
});
