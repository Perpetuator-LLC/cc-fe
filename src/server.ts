// Copyright (c) 2025-2026 Perpetuator LLC
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Runtime application configuration sourced from environment variables.
 *
 * Read ONCE at server startup so all requests see the same values without
 * touching process.env per-request. Container orchestration restarts the
 * pod to pick up changes (the standard 12-factor pattern).
 *
 * The same object is:
 *   1. Returned from GET /api/config for CSR cold-start hydration.
 *   2. Injected into every SSR-rendered page as window.__APP_CONFIG__.
 *
 * Both paths emit identical JSON so Angular's hydration sees no mismatch.
 */
const runtimeConfig = {
  production: process.env['CC_FE_PRODUCTION'] !== 'false',
  API_URL: process.env['CC_FE_API_URL'] || 'https://api.example.com',
  SITE_URL: process.env['CC_FE_SITE_URL'] || 'http://localhost:4200',
  STRIPE_PUBLIC_KEY: process.env['CC_FE_STRIPE_PUBLIC_KEY'] || '',
  OAUTH_ISSUER: process.env['CC_FE_OAUTH_ISSUER'] || '',
  OAUTH_CLIENT_ID: process.env['CC_FE_OAUTH_CLIENT_ID'] || '',
  OAUTH_SCOPES: process.env['CC_FE_OAUTH_SCOPES'] || 'read write',
  TEST_EMAIL: '',
  TEST_PASSWORD: '',
};

// Serialize once; escape </script to prevent HTML injection if any value ever
// contains it. JSON.stringify already escapes < to < when the
// `2nd-arg` replacer rewrites it, but we belt-and-suspenders here.
const runtimeConfigScript = `<script>window.__APP_CONFIG__=${JSON.stringify(runtimeConfig).replace(
  /</g,
  '\\u003c',
)}</script>`;

/**
 * Health check endpoint for container orchestration and monitoring.
 * Returns server status and timestamp.
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Runtime config endpoint for client-side cold-start (CSR with no SSR).
 * Browsers post-SSR pick up config from window.__APP_CONFIG__ instead.
 */
app.get('/api/config', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(runtimeConfig);
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 *
 * Injects window.__APP_CONFIG__ into the SSR-rendered HTML so the browser
 * has runtime config available before Angular hydrates — avoiding a network
 * round-trip to /api/config and avoiding any chance of a hydration mismatch.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then(async (response) => {
      if (!response) {
        next();
        return;
      }

      // For HTML responses, inject the runtime config script tag.
      // Other responses (304s, redirects, JSON from a handler we add later)
      // pass through unchanged.
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('text/html')) {
        const originalHtml = await response.text();
        const patchedHtml = originalHtml.includes('</head>')
          ? originalHtml.replace('</head>', `${runtimeConfigScript}</head>`)
          : originalHtml + runtimeConfigScript;

        // Rebuild headers without content-length (it changed) but preserve everything else.
        const headers = new Headers(response.headers);
        headers.delete('content-length');

        const patchedResponse = new Response(patchedHtml, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
        writeResponseToNodeResponse(patchedResponse, res);
        return;
      }

      writeResponseToNodeResponse(response, res);
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
