// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { environment as fallbackEnvironment } from '../../environments/environment';
import { AppConfig, APP_CONFIG } from './app-config';

/**
 * Provides runtime application configuration.
 *
 * Lookup order at startup (init()):
 *   1. APP_CONFIG injection token (set by server-side provider during SSR).
 *   2. window.__APP_CONFIG__ (injected by Express into the SSR-rendered HTML).
 *   3. GET /api/config (fetched at startup; covers cold CSR with no SSR).
 *   4. The bundled environment.ts file (local dev / test fallback).
 *
 * The synchronous `config` getter also falls back to the bundled environment.ts
 * if accessed before init() resolves. In production this never fires because
 * APP_INITIALIZER blocks bootstrap until init() completes — the fallback only
 * matters for unit tests and any code path that reads config before bootstrap.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injectedConfig = inject<AppConfig | null>(APP_CONFIG, { optional: true });
  private _config: AppConfig | null = null;
  private _initialized = false;

  /**
   * Synchronous access to the loaded config. If init() hasn't run yet
   * (e.g. in unit tests that skip APP_INITIALIZER), returns the bundled
   * environment.ts as a safe fallback rather than throwing.
   */
  get config(): AppConfig {
    if (this._config) {
      return this._config;
    }
    if (this.injectedConfig) {
      this._config = this.injectedConfig;
      return this._config;
    }
    return fallbackEnvironment as AppConfig;
  }

  /** Returns true once init() has resolved. */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Load config from the highest-priority available source.
   * Called once via APP_INITIALIZER at app bootstrap.
   */
  async init(): Promise<void> {
    if (this._initialized) {
      return;
    }

    // 1. Server-side: APP_CONFIG provider populated from process.env
    if (isPlatformServer(this.platformId) && this.injectedConfig) {
      this._config = this.injectedConfig;
      this._initialized = true;
      return;
    }

    // 2. Client-side: window.__APP_CONFIG__ from SSR-injected script tag
    if (isPlatformBrowser(this.platformId)) {
      const fromWindow = window.__APP_CONFIG__;
      if (fromWindow) {
        this._config = fromWindow;
        this._initialized = true;
        return;
      }

      // 3. Client-side: fetch from /api/config (cold CSR with no SSR)
      try {
        const response = await fetch('/api/config', { cache: 'no-store' });
        if (response.ok) {
          this._config = (await response.json()) as AppConfig;
          this._initialized = true;
          return;
        }
      } catch {
        // network error or no SSR server — fall through to bundled fallback
      }
    }

    // 4. Fallback: bundled environment.ts (local dev / tests / no config server)
    this._config = fallbackEnvironment as AppConfig;
    this._initialized = true;
  }

  /**
   * Explicit setter for tests and edge cases. Most code should rely on init().
   */
  setConfig(config: AppConfig): void {
    this._config = config;
    this._initialized = true;
  }
}
