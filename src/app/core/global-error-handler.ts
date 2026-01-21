// Copyright (c) 2025-2026 Perpetuator LLC
import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { TraceService } from '../traces/trace.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private traceService?: TraceService;

  // Pattern to detect chunk loading failures
  private static readonly CHUNK_ERROR_PATTERN =
    /Loading chunk [\d]+ failed|Failed to fetch dynamically imported module|ChunkLoadError/;

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

  /**
   * Checks if the error is a chunk loading error and handles it by refreshing.
   * Returns true if the error was handled (page will refresh).
   */
  private handleChunkLoadError(error: Error): boolean {
    if (!GlobalErrorHandler.CHUNK_ERROR_PATTERN.test(error.message)) {
      return false;
    }

    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return false;
    }

    // Check if we've already tried to refresh to prevent infinite loops
    const lastRefresh = sessionStorage.getItem('chunk-refresh-time');
    const now = Date.now();

    // Only auto-refresh if we haven't refreshed in the last 10 seconds
    if (!lastRefresh || now - parseInt(lastRefresh, 10) > 10000) {
      sessionStorage.setItem('chunk-refresh-time', now.toString());
      console.warn('[GlobalErrorHandler] Stale chunks detected, refreshing page...');
      window.location.reload();
      return true;
    } else {
      console.error('[GlobalErrorHandler] Chunk loading failed even after refresh. Please clear your browser cache.');
    }

    return false;
  }

  handleError(error: Error | unknown): void {
    // Log to console for development
    console.error('[GlobalErrorHandler]', error);

    // Check for chunk loading errors first
    if (error instanceof Error && this.handleChunkLoadError(error)) {
      return; // Page will refresh, don't continue processing
    }

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
