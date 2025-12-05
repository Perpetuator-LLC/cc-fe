// Copyright (c) 2025 Perpetuator LLC
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OAuthAuthService } from '../auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip adding token for OAuth2 endpoints
  if (req.url.includes('/o/token/') || req.url.includes('/o/authorize/') || req.url.includes('/.well-known/')) {
    return next(req);
  }

  const authService = inject(OAuthAuthService);
  const token = authService.getAccessToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
};
