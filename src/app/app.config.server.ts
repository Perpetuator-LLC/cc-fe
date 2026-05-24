// Copyright (c) 2025-2026 Perpetuator LLC
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { APP_CONFIG, AppConfig } from './core/app-config';

/**
 * Build the SSR-side AppConfig from process.env. Missing values fall back to
 * safe placeholders so dev builds and tests still bootstrap. Production
 * containers must set CC_FE_API_URL and CC_FE_SITE_URL (docker-entrypoint.sh
 * enforces this).
 */
function buildServerConfig(): AppConfig {
  return {
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
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    {
      provide: APP_CONFIG,
      useFactory: buildServerConfig,
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
