// Copyright (c) 2025 Perpetuator LLC
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { EMPTY, throwError } from 'rxjs';
import { MessageService } from './message.service';
import { handleApolloError } from './utils/error-handler';
import { TraceService } from './traces/services/trace.service';

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  private traceService?: TraceService;

  constructor(
    private router: Router,
    private authService: AuthService,
    private messageService: MessageService,
    private injector: Injector,
  ) {}

  private getTraceService(): TraceService | null {
    try {
      // Lazy injection to avoid circular dependency
      if (!this.traceService) {
        this.traceService = this.injector.get(TraceService);
      }
      return this.traceService;
    } catch (error) {
      console.warn('[ErrorHandlerService] TraceService not available:', error);
      return null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public handleError(error: any) {
    const newError = handleApolloError(error);

    // Track the error in traces (if TraceService is available)
    const traceService = this.getTraceService();
    if (traceService) {
      traceService
        .trackError(newError, {
          moduleName: 'ErrorHandlerService',
          functionName: 'handleError',
          inputs: {
            originalError: error?.message || 'Unknown error',
          },
        })
        .subscribe({
          error: (err) => console.error('[ErrorHandlerService] Failed to track error:', err),
        });
    }

    if (
      newError.message.includes('Given token not valid for any token type') ||
      newError.message.includes('Token is invalid or expired') ||
      newError.message.includes('Authentication credentials invalid or missing')
    ) {
      // Track authentication failure (if TraceService is available)
      if (traceService) {
        traceService
          .recordTrace({
            kind: 'auth_failure',
            severity: 'WARNING',
            message: 'Session expired or invalid token',
            exceptionMessage: newError.message,
            tags: {
              reason: 'token_invalid',
            },
          })
          .subscribe({
            error: (err) => console.error('[ErrorHandlerService] Failed to track auth failure:', err),
          });
      }

      this.authService.logout(); // Clear authentication state
      this.router.navigate(['/login']); // Navigate to login page
      this.messageService.warning('Your session has expired. Please log in again.');
      return EMPTY;
    }
    console.error(newError);
    return throwError(() => newError);
  }
}
