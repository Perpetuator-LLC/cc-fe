// Copyright (c) 2025 Perpetuator LLC
import { Injectable, Injector } from '@angular/core';
import { Router, NavigationError } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TraceService } from '../traces/trace.service';

@Injectable({
  providedIn: 'root',
})
export class RouterErrorTracker {
  private traceService?: TraceService;

  constructor(
    private router: Router,
    private injector: Injector,
  ) {
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

  private initializeErrorTracking(): void {
    // Track navigation errors
    this.router.events
      .pipe(filter((event): event is NavigationError => event instanceof NavigationError))
      .subscribe((event) => {
        const traceService = this.getTraceService();
        if (traceService) {
          traceService.trackNavigationError(event.url, event.error).subscribe({
            error: (err) => console.error('[RouterErrorTracker] Failed to track navigation error:', err),
          });
        }
      });
  }
}
