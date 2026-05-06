// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, Injector, inject } from '@angular/core';
import { Router, NavigationError } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TraceService } from '../traces/trace.service';

@Injectable({
  providedIn: 'root',
})
export class RouterErrorTracker {
  private router = inject(Router);
  private injector = inject(Injector);

  private traceService?: TraceService;

  // Pattern to detect chunk loading failures
  private static readonly CHUNK_ERROR_PATTERN =
    /Loading chunk [\d]+ failed|Failed to fetch dynamically imported module|ChunkLoadError/;

  constructor() {
    this.initializeErrorTracking();
  }

  private getTraceService(): TraceService | null {
    try {
      // Lazy injection to avoid circular dependency
      if (!this.traceService) {
        this.traceService = this.injector.get(TraceService);
      }
      return this.traceService;
    } catch (error) {
      // TraceService not available yet (during app initialization)
      console.warn('[RouterErrorTracker] TraceService not available:', error);
      return null;
    }
  }

  /**
   * Checks if the error is a chunk loading error and handles it by refreshing.
   * Returns true if the error was handled (page will refresh).
   */
  private handleChunkLoadError(error: Error): boolean {
    if (!RouterErrorTracker.CHUNK_ERROR_PATTERN.test(error.message)) {
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
      console.warn('[RouterErrorTracker] Stale chunks detected during navigation, refreshing page...');
      window.location.reload();
      return true;
    }

    return false;
  }

  private initializeErrorTracking(): void {
    // Track navigation errors
    this.router.events
      .pipe(filter((event): event is NavigationError => event instanceof NavigationError))
      .subscribe((event) => {
        // Check if this is a chunk loading error - if so, refresh the page
        if (event.error instanceof Error && this.handleChunkLoadError(event.error)) {
          return; // Page will refresh
        }

        const traceService = this.getTraceService();
        if (traceService) {
          traceService.trackNavigationError(event.url, event.error).subscribe({
            error: (err) => console.error('[RouterErrorTracker] Failed to track navigation error:', err),
          });
        }
      });
  }
}
