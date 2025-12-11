// Copyright (c) 2025 Perpetuator LLC
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from '../token-storage.service';

/**
 * Auth Interceptor
 *
 * Architecture (per AUTH_COOKIE_CROSS_DOMAIN.md):
 * - Sends Authorization: Bearer <token> header for API authentication
 * - Sends withCredentials: true for logged_in cookie (cross-subdomain session)
 * - The logged_in cookie is just an indicator - it doesn't authenticate!
 * - Backend validates the Bearer token, not the cookie
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip adding token for OAuth2 endpoints (they handle their own auth)
  if (req.url.includes('/o/token/') || req.url.includes('/o/authorize/') || req.url.includes('/.well-known/')) {
    // Still include credentials for cookies
    return next(req.clone({ withCredentials: true }));
  }

  const tokenStorage = inject(TokenStorageService);
  const token = tokenStorage.getAccessToken();

  // Clone request with credentials (for logged_in cookie)
  let authReq = req.clone({
    withCredentials: true,
  });

  // Add Authorization header if we have a valid token
  if (token && !tokenStorage.isAccessTokenExpired()) {
    authReq = authReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq);
};
