// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of, throwError } from 'rxjs';
import { ApolloQueryResult } from '@apollo/client/core';
import { CookieConsentService } from './cookie-consent.service';
import { AuthService } from './auth.service';

describe('CookieConsentService', () => {
  let service: CookieConsentService;
  let apolloMock: jasmine.SpyObj<Apollo>;
  let authServiceMock: jasmine.SpyObj<AuthService>;
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

    apolloMock = jasmine.createSpyObj('Apollo', ['query', 'mutate']);
    authServiceMock = jasmine.createSpyObj('AuthService', ['isLoggedIn']);

    authServiceMock.isLoggedIn.and.returnValue(false);
    apolloMock.query.and.returnValue(
      of({
        data: { userCookieConsents: [] },
        loading: false,
        networkStatus: 7,
      } as ApolloQueryResult<unknown>),
    );
    apolloMock.mutate.and.returnValue(
      of({
        data: { updateCookieConsent: { success: true, message: 'Updated successfully' } },
      }),
    );

    TestBed.configureTestingModule({
      providers: [
        CookieConsentService,
        { provide: Apollo, useValue: apolloMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    });
  });

  afterEach(() => {
    localStorageSpy = {};
  });

  it('should be created', () => {
    service = TestBed.inject(CookieConsentService);
    expect(service).toBeTruthy();
  });

  it('should have a COOKIE_CONSENT_VERSION constant', () => {
    service = TestBed.inject(CookieConsentService);
    expect(service.COOKIE_CONSENT_VERSION).toBeDefined();
    expect(typeof service.COOKIE_CONSENT_VERSION).toBe('string');
  });

  describe('Constructor and Initialization', () => {
    it('should load consent from localStorage if version matches', () => {
      const testConsent = {
        version: '2025-11-24',
        accepted: true,
        date: '2025-11-06T00:00:00.000Z',
      };
      localStorageSpy['cookieConsent'] = JSON.stringify(testConsent);

      service = TestBed.inject(CookieConsentService);
      expect(service.cookieConsent()).toEqual(testConsent);
    });

    it('should not load consent from localStorage if version does not match', () => {
      const oldConsent = {
        version: '2024-08-09',
        accepted: true,
        date: '2024-08-09T00:00:00.000Z',
      };
      localStorageSpy['cookieConsent'] = JSON.stringify(oldConsent);

      service = TestBed.inject(CookieConsentService);
      expect(service.cookieConsent()).toBeNull();
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      localStorageSpy['cookie_consent'] = 'invalid json';
      spyOn(console, 'error');

      service = TestBed.inject(CookieConsentService);
      expect(service.cookieConsent()).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith('cookie_consent');
    });

    it('should not call GraphQL when user is not logged in', () => {
      authServiceMock.isLoggedIn.and.returnValue(false);
      service = TestBed.inject(CookieConsentService);
      expect(apolloMock.query).not.toHaveBeenCalled();
    });

    it('should call GraphQL to load consent when user is logged in', () => {
      authServiceMock.isLoggedIn.and.returnValue(true);
      service = TestBed.inject(CookieConsentService);
      expect(apolloMock.query).toHaveBeenCalled();
    });
  });

  describe('loadCookieConsent', () => {
    beforeEach(() => {
      service = TestBed.inject(CookieConsentService);
      apolloMock.query.calls.reset();
    });

    it('should not query when user is not logged in', () => {
      authServiceMock.isLoggedIn.and.returnValue(false);
      service.loadCookieConsent();
      expect(apolloMock.query).not.toHaveBeenCalled();
    });

    it('should query and update signal with latest consent version', (done) => {
      authServiceMock.isLoggedIn.and.returnValue(true);
      const testConsent = {
        version: service.COOKIE_CONSENT_VERSION,
        accepted: true,
        date: '2025-11-06T00:00:00.000Z',
      };
      apolloMock.query.and.returnValue(
        of({
          data: { userCookieConsents: [testConsent] },
          loading: false,
          networkStatus: 7,
        } as ApolloQueryResult<unknown>),
      );

      service.loadCookieConsent();

      setTimeout(() => {
        expect(service.cookieConsent()).toEqual(testConsent);
        expect(localStorage.setItem).toHaveBeenCalledWith('cookieConsent', JSON.stringify(testConsent));
        done();
      }, 100);
    });

    it('should clear consent if user has not signed latest version', (done) => {
      authServiceMock.isLoggedIn.and.returnValue(true);
      const oldConsent = {
        version: '2024-08-09',
        accepted: true,
        date: '2024-08-09T00:00:00.000Z',
      };
      apolloMock.query.and.returnValue(
        of({
          data: { userCookieConsents: [oldConsent] },
          loading: false,
          networkStatus: 7,
        } as ApolloQueryResult<unknown>),
      );
      spyOn(console, 'warn');

      service.loadCookieConsent();

      setTimeout(() => {
        expect(service.cookieConsent()).toBeNull();
        expect(localStorage.removeItem).toHaveBeenCalledWith('cookieConsent');
        expect(console.warn).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should handle GraphQL query errors gracefully', (done) => {
      authServiceMock.isLoggedIn.and.returnValue(true);
      apolloMock.query.and.returnValue(throwError(() => new Error('Network error')));
      spyOn(console, 'error');

      service.loadCookieConsent();

      setTimeout(() => {
        expect(console.error).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('updateCookieConsent', () => {
    beforeEach(() => {
      service = TestBed.inject(CookieConsentService);
    });

    it('should call GraphQL mutation with correct parameters', (done) => {
      const version = service.COOKIE_CONSENT_VERSION;
      const accepted = true;

      service.updateCookieConsent(version, accepted).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.message).toBe('Updated successfully');
          expect(apolloMock.mutate).toHaveBeenCalledWith(
            jasmine.objectContaining({
              variables: { version, accepted },
              fetchPolicy: 'network-only',
            }),
          );
          done();
        },
      });
    });

    it('should handle mutation errors gracefully', (done) => {
      apolloMock.mutate.and.returnValue(throwError(() => new Error('Mutation failed')));
      spyOn(console, 'error');

      service.updateCookieConsent(service.COOKIE_CONSENT_VERSION, true).subscribe({
        error: (err) => {
          expect(console.error).toHaveBeenCalled();
          expect(err.message).toContain('GraphQL Mutation Error');
          done();
        },
      });
    });

    it('should handle missing data in mutation response', (done) => {
      apolloMock.mutate.and.returnValue(of({ data: null }));

      service.updateCookieConsent(service.COOKIE_CONSENT_VERSION, true).subscribe({
        next: (result) => {
          expect(result.success).toBe(false);
          expect(result.message).toBe('Failed to update cookie consent');
          done();
        },
      });
    });
  });

  describe('setCookieConsent', () => {
    beforeEach(() => {
      service = TestBed.inject(CookieConsentService);
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2025-11-06T00:00:00.000Z'));
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should update localStorage when user is not logged in', () => {
      authServiceMock.isLoggedIn.and.returnValue(false);
      service.setCookieConsent(true);

      expect(apolloMock.mutate).not.toHaveBeenCalled();
      expect(service.cookieConsent()?.accepted).toBe(true);
      expect(service.cookieConsent()?.version).toBe(service.COOKIE_CONSENT_VERSION);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cookieConsent',
        jasmine.stringContaining(service.COOKIE_CONSENT_VERSION),
      );
    });

    it('should call GraphQL mutation when user is logged in', (done) => {
      jasmine.clock().uninstall(); // Disable clock for async test
      authServiceMock.isLoggedIn.and.returnValue(true);
      service.setCookieConsent(true);

      setTimeout(() => {
        expect(apolloMock.mutate).toHaveBeenCalled();
        expect(service.cookieConsent()?.accepted).toBe(true);
        expect(localStorage.setItem).toHaveBeenCalled();
        jasmine.clock().install(); // Re-enable clock for next tests
        jasmine.clock().mockDate(new Date('2025-11-06T00:00:00.000Z'));
        done();
      }, 50);
    });

    it('should handle mutation failure gracefully', (done) => {
      jasmine.clock().uninstall(); // Disable clock for async test
      authServiceMock.isLoggedIn.and.returnValue(true);
      apolloMock.mutate.and.returnValue(of({ data: { updateCookieConsent: { success: false, message: 'DB error' } } }));
      spyOn(console, 'error');

      service.setCookieConsent(true);

      setTimeout(() => {
        expect(console.error).toHaveBeenCalledWith('Failed to update cookie consent:', 'DB error');
        jasmine.clock().install(); // Re-enable clock for next tests
        jasmine.clock().mockDate(new Date('2025-11-06T00:00:00.000Z'));
        done();
      }, 50);
    });

    it('should handle both accepted and rejected consent', () => {
      authServiceMock.isLoggedIn.and.returnValue(false);

      service.setCookieConsent(true);
      expect(service.cookieConsent()?.accepted).toBe(true);

      service.setCookieConsent(false);
      expect(service.cookieConsent()?.accepted).toBe(false);
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe from all subscriptions', () => {
      authServiceMock.isLoggedIn.and.returnValue(true);
      service = TestBed.inject(CookieConsentService);

      const unsubscribeSpy = spyOn(
        (service as unknown as { subscriptions: { unsubscribe: () => void } }).subscriptions,
        'unsubscribe',
      );

      service.ngOnDestroy();
      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });

  describe('localStorage operations', () => {
    beforeEach(() => {
      service = TestBed.inject(CookieConsentService);
    });

    it('should save consent to localStorage with correct format', () => {
      authServiceMock.isLoggedIn.and.returnValue(false);
      service.setCookieConsent(true);

      const savedData = localStorageSpy['cookie_consent'];
      expect(savedData).toBeDefined();

      const parsed = JSON.parse(savedData);
      expect(parsed.version).toBe(service.COOKIE_CONSENT_VERSION);
      expect(parsed.accepted).toBe(true);
      expect(parsed.date).toBeDefined();
    });

    it('should not modify localStorage when no consents exist in backend', (done) => {
      localStorageSpy['cookie_consent'] = JSON.stringify({
        version: service.COOKIE_CONSENT_VERSION,
        accepted: true,
        date: '2025-11-06T00:00:00.000Z',
      });

      authServiceMock.isLoggedIn.and.returnValue(true);
      apolloMock.query.and.returnValue(
        of({
          data: { userCookieConsents: [] },
          loading: false,
          networkStatus: 7,
        } as ApolloQueryResult<unknown>),
      );

      service.loadCookieConsent();

      setTimeout(() => {
        // When backend returns empty array, service doesn't modify localStorage
        expect(localStorage.removeItem).not.toHaveBeenCalled();
        done();
      }, 50);
    });
  });
});
