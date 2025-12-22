// Copyright (c) 2025 Perpetuator LLC
import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { TokenStorageService } from '../token-storage.service';
import { TokenRefreshService } from '../token-refresh.service';

/**
 * Token Refresh Interceptor
 *
 * Handles automatic token refresh when:
 * 1. Access token is about to expire (proactive refresh)
 * 2. Server returns 401 Unauthorized (reactive refresh)
 *
 * Key features:
 * - Queues concurrent requests during refresh to prevent multiple refresh calls
 * - Uses refresh token to obtain new access + refresh tokens (token rotation)
 * - Logs user out if refresh fails
 */

// Shared state for managing concurrent refresh requests
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const tokenRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip token refresh for OAuth2 endpoints (they handle their own auth)
  if (req.url.includes('/o/token/') || req.url.includes('/o/authorize/') || req.url.includes('/.well-known/')) {
    return next(req);
  }

  const tokenStorage = inject(TokenStorageService);
  const tokenRefreshService = inject(TokenRefreshService);

  // Proactive refresh: If token is expired or about to expire, refresh before making request
  if (shouldRefreshToken(tokenStorage)) {
    return handleTokenRefresh(req, next, tokenStorage, tokenRefreshService);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Reactive refresh: Handle 401 Unauthorized errors
      if (error.status === 401 && !req.url.includes('/o/token/')) {
        return handleTokenRefresh(req, next, tokenStorage, tokenRefreshService);
      }
      return throwError(() => error);
    }),
  );
};

/**
 * Check if we should proactively refresh the token
 * Refresh if token is expired or will expire within 60 seconds
 */
function shouldRefreshToken(tokenStorage: TokenStorageService): boolean {
  const token = tokenStorage.getAccessToken();
  if (!token) {
    return false;
  }

  const expiresAt = tokenStorage.getExpiresAt();
  if (!expiresAt) {
    return false;
  }

  // Refresh if token expires within 60 seconds
  const refreshThreshold = 60000; // 60 seconds
  return Date.now() >= expiresAt - refreshThreshold;
}

/**
 * Handle token refresh and retry the original request
 */
function handleTokenRefresh(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  tokenStorage: TokenStorageService,
  tokenRefreshService: TokenRefreshService,
): Observable<HttpEvent<unknown>> {
  const refreshToken = tokenStorage.getRefreshToken();

  // No refresh token available - can't refresh
  if (!refreshToken) {
    return next(req);
  }

  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return tokenRefreshService.refreshToken(refreshToken).pipe(
      switchMap((success) => {
        isRefreshing = false;

        if (success) {
          const newToken = tokenStorage.getAccessToken();
          refreshTokenSubject.next(newToken);
          return next(addAuthHeader(req, newToken));
        } else {
          refreshTokenSubject.next(null);
          return throwError(() => new Error('Token refresh failed'));
        }
      }),
      catchError((error) => {
        isRefreshing = false;
        refreshTokenSubject.next(null);
        return throwError(() => error);
      }),
    );
  } else {
    // Another request is already refreshing, wait for it
    return refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => next(addAuthHeader(req, token))),
    );
  }
}

/**
 * Add Authorization header to request
 */
function addAuthHeader(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (!token) {
    return req;
  }
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}
