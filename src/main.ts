// Copyright (c) 2025-2026 Perpetuator LLC
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

/**
 * Handles chunk loading errors by forcing a page refresh.
 * This happens when the browser has cached old JS chunks that no longer exist
 * after a new deployment.
 */
function handleChunkLoadError(error: Error): boolean {
  const chunkFailedMessage = /Loading chunk [\d]+ failed|Failed to fetch dynamically imported module/;

  if (chunkFailedMessage.test(error.message)) {
    // Check if we've already tried to refresh to prevent infinite loops
    const lastRefresh = sessionStorage.getItem('chunk-refresh-time');
    const now = Date.now();

    // Only auto-refresh if we haven't refreshed in the last 10 seconds
    if (!lastRefresh || now - parseInt(lastRefresh, 10) > 10000) {
      sessionStorage.setItem('chunk-refresh-time', now.toString());
      console.warn('Stale chunks detected, refreshing page...');
      window.location.reload();
      return true;
    } else {
      console.error('Chunk loading failed even after refresh. Please clear your browser cache.');
    }
  }
  return false;
}

// Global error handler for uncaught chunk loading errors
window.addEventListener('error', (event) => {
  if (event.error && handleChunkLoadError(event.error)) {
    event.preventDefault();
  }
});

// Handle unhandled promise rejections (for dynamic imports)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && handleChunkLoadError(event.reason)) {
    event.preventDefault();
  }
});

bootstrapApplication(AppComponent, appConfig).catch((err) => {
  // Try to handle chunk load errors during bootstrap
  if (!handleChunkLoadError(err)) {
    console.error('Bootstrap error:', err);

    // Show a user-friendly error message
    const loadingEl = document.querySelector('.app-loading-text');
    if (loadingEl) {
      loadingEl.textContent = 'Failed to load application. Please refresh the page or clear your cache.';
    }
  }
});
