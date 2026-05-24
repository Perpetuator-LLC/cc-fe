// Copyright (c) 2025-2026 Perpetuator LLC
import { InjectionToken } from '@angular/core';

/**
 * Runtime configuration for the application.
 *
 * Loaded at startup via one of:
 *   - Server-side: process.env (via APP_CONFIG provider in app.config.server.ts)
 *   - Client-side post-SSR: window.__APP_CONFIG__ injected into HTML
 *   - Client-side cold start: GET /api/config endpoint
 *   - Local dev (ng serve): dynamic import of src/environments/environment.ts
 */
export interface AppConfig {
  /** Whether this is a production build. Used for dev-only UI affordances. */
  production: boolean;
  /** Backend API base URL (no trailing slash). Used for GraphQL, REST, and WebSocket. */
  API_URL: string;
  /** Public-facing frontend URL. Used for share links and OAuth redirect URI. */
  SITE_URL: string;
  /** Stripe.js publishable key. */
  STRIPE_PUBLIC_KEY: string;
  /** OAuth2 issuer URL (typically same as API_URL). */
  OAUTH_ISSUER: string;
  /** OAuth2 client ID for password grant. */
  OAUTH_CLIENT_ID: string;
  /** Space-separated OAuth2 scopes (e.g. "read write"). */
  OAUTH_SCOPES: string;
  /** Dev-only: pre-fills the login form. Empty in staging/production. */
  TEST_EMAIL: string;
  /** Dev-only: pre-fills the login form. Empty in staging/production. */
  TEST_PASSWORD: string;
}

/**
 * Injection token for the runtime AppConfig.
 *
 * SSR path: provided in app.config.server.ts from process.env.
 * CSR path: provided via APP_INITIALIZER that loads from window.__APP_CONFIG__
 * or /api/config (handled by AppConfigService).
 *
 * Prefer injecting AppConfigService over this token directly — the service
 * provides additional helpers and guards against use-before-init.
 */
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

/**
 * Shape of the global config object injected into the page during SSR.
 * The Express server writes `<script>window.__APP_CONFIG__={...}</script>`
 * into the rendered HTML, and the browser-side AppConfigService picks it up
 * during APP_INITIALIZER without any network round-trip.
 */
declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig;
  }
}
