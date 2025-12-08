// Copyright (c) 2025 Perpetuator LLC
import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { TraceService } from '../traces/trace.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private traceService?: TraceService;

  constructor(private injector: Injector) {}

  private getTraceService(): TraceService | null {
    try {
      // Lazy injection to avoid circular dependency
      if (!this.traceService) {
        this.traceService = this.injector.get(TraceService);
      }
      return this.traceService;
    } catch (error) {
      // TraceService not available yet (during app initialization)
      console.warn('[GlobalErrorHandler] TraceService not available:', error);
      return null;
    }
  }

  handleError(error: Error | unknown): void {
    // Log to console for development
    console.error('[GlobalErrorHandler]', error);

    // Try to get TraceService - it might not be available during early initialization
    const traceService = this.getTraceService();
    if (!traceService) {
      console.warn('[GlobalErrorHandler] Cannot track error - TraceService not ready');
      return;
    }

    // Track the error
    if (error instanceof Error) {
      traceService
        .trackError(error, {
          moduleName: 'GlobalErrorHandler',
          functionName: 'handleError',
          tags: {
            error_handler: 'global',
          },
        })
        .subscribe({
          error: (err) => console.error('[GlobalErrorHandler] Failed to track error:', err),
        });
    } else {
      traceService
        .recordTrace({
          kind: 'frontend_error',
          severity: 'ERROR',
          message: 'Unknown error type caught by global error handler',
          inputs: {
            error: String(error),
          },
          tags: {
            error_handler: 'global',
            error_type: 'unknown',
          },
        })
        .subscribe({
          error: (err) => console.error('[GlobalErrorHandler] Failed to track error:', err),
        });
    }
  }
}
