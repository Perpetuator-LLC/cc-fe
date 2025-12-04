// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { CookieConsentService } from './cookie-consent.service';

describe('CookieConsentService', () => {
  let service: CookieConsentService;
  let localStorageSpy: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    localStorageSpy = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => localStorageSpy[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      localStorageSpy[key] = value;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete localStorageSpy[key];
    });

    TestBed.configureTestingModule({
      providers: [CookieConsentService],
    });
  });

  afterEach(() => {
    localStorageSpy = {};
  });

  it('should be created', () => {
    service = TestBed.inject(CookieConsentService);
    expect(service).toBeTruthy();
  });

  describe('Constructor and Initialization', () => {
    it('should load consent from localStorage if present', () => {
      const testConsent = {
        version: '20251113.1',
        accepted: true,
        date: '2025-11-19T00:00:00.000Z',
      };
      localStorageSpy['cookie_consent'] = JSON.stringify(testConsent);

      service = TestBed.inject(CookieConsentService);
      expect(service.cookieConsent()).toEqual(testConsent);
    });

    it('should load consent regardless of version', () => {
      const oldConsent = {
        version: '2024-08-09',
        accepted: true,
        date: '2024-08-09T00:00:00.000Z',
      };
      localStorageSpy['cookie_consent'] = JSON.stringify(oldConsent);

      service = TestBed.inject(CookieConsentService);
      expect(service.cookieConsent()).toEqual(oldConsent);
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      localStorageSpy['cookie_consent'] = 'invalid json';
      spyOn(console, 'error');

      service = TestBed.inject(CookieConsentService);
      expect(service.cookieConsent()).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith('cookie_consent');
      expect(console.error).toHaveBeenCalled();
    });

    it('should have null consent when localStorage is empty', () => {
      service = TestBed.inject(CookieConsentService);
      expect(service.cookieConsent()).toBeNull();
    });
  });

  describe('cookieConsent signal', () => {
    it('should be a writable signal', () => {
      service = TestBed.inject(CookieConsentService);
      const newConsent = {
        version: '20251113.1',
        accepted: true,
        date: new Date().toISOString(),
      };

      service.cookieConsent.set(newConsent);
      expect(service.cookieConsent()).toEqual(newConsent);
    });

    it('should allow updating the signal', () => {
      service = TestBed.inject(CookieConsentService);
      const consent1 = {
        version: '20251113.1',
        accepted: true,
        date: '2025-11-19T00:00:00.000Z',
      };
      const consent2 = {
        version: '20251113.2',
        accepted: true,
        date: '2025-11-19T01:00:00.000Z',
      };

      service.cookieConsent.set(consent1);
      expect(service.cookieConsent()).toEqual(consent1);

      service.cookieConsent.set(consent2);
      expect(service.cookieConsent()).toEqual(consent2);
    });

    it('should allow setting to null', () => {
      const testConsent = {
        version: '20251113.1',
        accepted: true,
        date: '2025-11-19T00:00:00.000Z',
      };
      localStorageSpy['cookie_consent'] = JSON.stringify(testConsent);

      service = TestBed.inject(CookieConsentService);
      expect(service.cookieConsent()).toEqual(testConsent);

      service.cookieConsent.set(null);
      expect(service.cookieConsent()).toBeNull();
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe from all subscriptions', () => {
      service = TestBed.inject(CookieConsentService);

      const unsubscribeSpy = spyOn(
        (service as unknown as { subscriptions: { unsubscribe: () => void } }).subscriptions,
        'unsubscribe',
      );

      service.ngOnDestroy();
      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });
});
