// Copyright (c) 2026 Perpetuator LLC
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { APP_CONFIG, AppConfig } from './app-config';
import { AppConfigService } from './app-config.service';

function makeConfig(apiUrl: string): AppConfig {
  return {
    production: true,
    API_URL: apiUrl,
    SITE_URL: 'https://site.example.com',
    STRIPE_PUBLIC_KEY: 'pk_test_x',
    OAUTH_ISSUER: apiUrl,
    OAUTH_CLIENT_ID: 'client',
    OAUTH_SCOPES: 'read write',
    TEST_EMAIL: '',
    TEST_PASSWORD: '',
  };
}

describe('AppConfigService', () => {
  afterEach(() => {
    delete window.__APP_CONFIG__;
  });

  function createService(providers: unknown[] = []): AppConfigService {
    TestBed.configureTestingModule({ providers: providers as [] });
    return TestBed.inject(AppConfigService);
  }

  it('falls back to the bundled environment before init()', () => {
    const service = createService();
    expect(service.isInitialized).toBeFalse();
    expect(service.config).toEqual(environment as AppConfig);
  });

  it('uses the APP_CONFIG injection token when provided', () => {
    const injected = makeConfig('https://injected.example.com');
    const service = createService([{ provide: APP_CONFIG, useValue: injected }]);
    expect(service.config).toBe(injected);
  });

  it('init() prefers window.__APP_CONFIG__ in the browser', async () => {
    const fromWindow = makeConfig('https://window.example.com');
    window.__APP_CONFIG__ = fromWindow;
    const service = createService();
    await service.init();
    expect(service.isInitialized).toBeTrue();
    expect(service.config).toBe(fromWindow);
  });

  it('init() fetches /api/config when no window config exists', async () => {
    const fetched = makeConfig('https://fetched.example.com');
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(
      new Response(JSON.stringify(fetched), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    const service = createService();
    await service.init();
    expect(fetchSpy).toHaveBeenCalledWith('/api/config', { cache: 'no-store' });
    expect(service.config).toEqual(fetched);
  });

  it('init() falls back to the bundled environment when the fetch fails', async () => {
    spyOn(window, 'fetch').and.resolveTo(new Response('nope', { status: 500 }));
    const service = createService();
    await service.init();
    expect(service.isInitialized).toBeTrue();
    expect(service.config).toEqual(environment as AppConfig);
  });

  it('init() falls back to the bundled environment when fetch throws', async () => {
    spyOn(window, 'fetch').and.rejectWith(new TypeError('network down'));
    const service = createService();
    await service.init();
    expect(service.config).toEqual(environment as AppConfig);
  });

  it('init() is idempotent', async () => {
    const fetchSpy = spyOn(window, 'fetch');
    const service = createService();
    service.setConfig(makeConfig('https://set.example.com'));
    await service.init();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(service.config.API_URL).toBe('https://set.example.com');
  });

  it('setConfig marks the service initialized', () => {
    const service = createService();
    expect(service.isInitialized).toBeFalse();
    service.setConfig(makeConfig('https://set.example.com'));
    expect(service.isInitialized).toBeTrue();
  });

  it('init() on the server uses the injected APP_CONFIG', async () => {
    const injected = makeConfig('https://server.example.com');
    const service = createService([
      { provide: PLATFORM_ID, useValue: 'server' },
      { provide: APP_CONFIG, useValue: injected },
    ]);
    await service.init();
    expect(service.config).toBe(injected);
  });

  it('init() on the server without APP_CONFIG falls back to the bundled environment', async () => {
    const service = createService([{ provide: PLATFORM_ID, useValue: 'server' }]);
    await service.init();
    expect(service.config).toEqual(environment as AppConfig);
  });
});
