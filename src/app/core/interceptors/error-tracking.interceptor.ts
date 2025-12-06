// Copyright (c) 2025 Perpetuator LLC
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { TraceService } from '../../traces/services/trace.service';

export const errorTrackingInterceptor: HttpInterceptorFn = (req, next) => {
  const traceService = inject(TraceService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Track HTTP errors (non-GraphQL)
      // Skip GraphQL errors as they're tracked by Apollo error link
      if (!req.url.includes('/graphql/')) {
        traceService
          .trackAPIError(
            req.url,
            req.method,
            {
              status: error.status,
              statusText: error.statusText,
              message: error.message,
              error: error.error,
            },
            req.body,
          )
          .subscribe();
      }

      return throwError(() => error);
    }),
  );
};
