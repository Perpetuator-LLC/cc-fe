// Copyright (c) 2025 Perpetuator LLC
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { EMPTY, throwError } from 'rxjs';
import { MessageService } from '../message.service';
import { handleApolloError } from './error-handler';
import { TraceService } from '../traces/trace.service';
import { TokenStorageService } from '../auth/token-storage.service';

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  private traceService?: TraceService;
  private isHandlingAuthError = false;
  private authErrorResetTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private messageService: MessageService,
    private injector: Injector,
    private tokenStorage: TokenStorageService,
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
      // Check if we have a refresh token - if so, the Apollo error link should handle refresh
      // Only logout if there's no refresh token available (refresh already failed or was never set)
      const refreshToken = this.tokenStorage.getRefreshToken();
      if (refreshToken) {
        // We have a refresh token - the Apollo error link should be handling the refresh
        // Don't logout immediately, just return the error for Apollo to retry
        return throwError(() => newError);
      }

      // No refresh token - session is truly expired, need to logout
      // Prevent multiple toasts/logouts when multiple GraphQL operations fail simultaneously
      if (this.isHandlingAuthError) {
        // Already handling an auth error, just return EMPTY without showing another toast
        return EMPTY;
      }

      // Set flag to prevent duplicate handling
      this.isHandlingAuthError = true;

      // Reset the flag after a short delay to allow future auth errors to be handled
      // This handles the case where the user logs back in and the token expires again later
      if (this.authErrorResetTimeout) {
        clearTimeout(this.authErrorResetTimeout);
      }
      this.authErrorResetTimeout = setTimeout(() => {
        this.isHandlingAuthError = false;
        this.authErrorResetTimeout = null;
      }, 2000); // 2 second debounce window

      // Track authentication failure (if TraceService is available)
      const traceService = this.getTraceService();
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
