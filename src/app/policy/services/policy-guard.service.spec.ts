// Copyright (c) 2025-2026 Perpetuator LLC

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NavigationEnd, Router } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { PolicyGuardService } from './policy-guard.service';
import { PolicyService, PolicyType, PolicyVersion } from './policy.service';
import { AuthService } from '../../auth/auth.service';
import { CookieConsentService } from './cookie-consent.service';

function policyVersion(over: Partial<PolicyVersion> = {}): PolicyVersion {
  return {
    id: 'pv-tos',
    policyType: PolicyType.TERMS_OF_SERVICE,
    version: '1.0.0',
    ...over,
  };
}

describe('PolicyGuardService', () => {
  let service: PolicyGuardService;
  let policyService: jasmine.SpyObj<PolicyService>;
  let authService: { isLoggedIn: WritableSignal<boolean>; logout: jasmine.Spy };
  let matDialog: jasmine.SpyObj<MatDialog>;
  let router: jasmine.SpyObj<Router>;
  let cookieConsentService: { cookieConsent: { set: jasmine.Spy } };
  let routerEvents: Subject<unknown>;
  let dialogAfterClosed: Subject<boolean | undefined>;

  beforeEach(() => {
    localStorage.clear();
    routerEvents = new Subject<unknown>();
    dialogAfterClosed = new Subject<boolean | undefined>();

    policyService = jasmine.createSpyObj<PolicyService>('PolicyService', [
      'getMissingRequiredPolicies',
      'getActivePolicies',
      'getActivePoliciesMetadata',
      'acceptPolicy',
    ]);
    policyService.getMissingRequiredPolicies.and.returnValue(of([]));
    policyService.getActivePolicies.and.returnValue(
      of({
        termsOfService: null,
        privacyPolicy: null,
        cookiePolicy: null,
        affiliateTerms: null,
      }),
    );
    policyService.getActivePoliciesMetadata.and.returnValue(
      of({
        termsOfService: null,
        privacyPolicy: null,
        cookiePolicy: null,
        affiliateTerms: null,
      }),
    );
    policyService.acceptPolicy.and.returnValue(of({ success: true, message: 'ok' }));

    authService = {
      isLoggedIn: signal<boolean>(false),
      logout: jasmine.createSpy('logout'),
    };

    matDialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    matDialog.open.and.returnValue({
      afterClosed: () => dialogAfterClosed.asObservable(),
    } as unknown as MatDialogRef<unknown>);

    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    (router as unknown as { events: typeof routerEvents }).events = routerEvents;

    cookieConsentService = { cookieConsent: { set: jasmine.createSpy('set') } };

    TestBed.configureTestingModule({
      providers: [
        PolicyGuardService,
        { provide: PolicyService, useValue: policyService },
        { provide: AuthService, useValue: authService },
        { provide: MatDialog, useValue: matDialog },
        { provide: Router, useValue: router },
        { provide: CookieConsentService, useValue: cookieConsentService },
      ],
    });
    service = TestBed.inject(PolicyGuardService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initializePolicyCheck', () => {
    it('is a no-op when user is logged out', () => {
      authService.isLoggedIn.set(false);
      service.initializePolicyCheck();
      expect(policyService.getMissingRequiredPolicies).not.toHaveBeenCalled();
    });

    it('triggers checkAndShowPolicyDialog when logged in', () => {
      authService.isLoggedIn.set(true);
      service.initializePolicyCheck();
      expect(policyService.getMissingRequiredPolicies).toHaveBeenCalled();
    });

    it('does NOT open the dialog when no missing policies', () => {
      authService.isLoggedIn.set(true);
      service.initializePolicyCheck();
      expect(matDialog.open).not.toHaveBeenCalled();
    });

    it('opens the dialog when there are missing policies', () => {
      authService.isLoggedIn.set(true);
      const tos = policyVersion({ id: 'tos' });
      policyService.getMissingRequiredPolicies.and.returnValue(of([tos]));
      policyService.getActivePolicies.and.returnValue(
        of({
          termsOfService: tos,
          privacyPolicy: null,
          cookiePolicy: null,
          affiliateTerms: null,
        }),
      );
      service.initializePolicyCheck();
      expect(matDialog.open).toHaveBeenCalled();
    });

    it('logs out and redirects when user cancels the dialog', () => {
      authService.isLoggedIn.set(true);
      const tos = policyVersion({ id: 'tos' });
      policyService.getMissingRequiredPolicies.and.returnValue(of([tos]));
      policyService.getActivePolicies.and.returnValue(
        of({
          termsOfService: tos,
          privacyPolicy: null,
          cookiePolicy: null,
          affiliateTerms: null,
        }),
      );
      service.initializePolicyCheck();
      dialogAfterClosed.next(false);
      expect(authService.logout).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('logs errors and clears the in-progress flag', () => {
      authService.isLoggedIn.set(true);
      policyService.getMissingRequiredPolicies.and.returnValue(throwError(() => new Error('boom')));
      spyOn(console, 'error');
      service.initializePolicyCheck();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('checkPoliciesNow', () => {
    it('returns true when no missing policies (after sync)', (done) => {
      service.checkPoliciesNow().subscribe((ok) => {
        expect(ok).toBeTrue();
        done();
      });
    });

    it('opens dialog when missing policies exist and resolves true after acceptance', (done) => {
      const cookie = policyVersion({ id: 'cp', policyType: PolicyType.COOKIE_POLICY });
      policyService.getMissingRequiredPolicies.and.returnValue(of([cookie]));
      policyService.getActivePolicies.and.returnValue(
        of({
          termsOfService: null,
          privacyPolicy: null,
          cookiePolicy: cookie,
          affiliateTerms: null,
        }),
      );
      service.checkPoliciesNow().subscribe((ok) => {
        expect(ok).toBeTrue();
        done();
      });
      // Simulate user accepting in dialog
      dialogAfterClosed.next(true);
    });

    it('logs out and resolves false when user declines', (done) => {
      const cookie = policyVersion({ id: 'cp', policyType: PolicyType.COOKIE_POLICY });
      policyService.getMissingRequiredPolicies.and.returnValue(of([cookie]));
      policyService.getActivePolicies.and.returnValue(
        of({
          termsOfService: null,
          privacyPolicy: null,
          cookiePolicy: cookie,
          affiliateTerms: null,
        }),
      );
      service.checkPoliciesNow().subscribe((ok) => {
        expect(ok).toBeFalse();
        expect(authService.logout).toHaveBeenCalled();
        done();
      });
      dialogAfterClosed.next(false);
    });
  });

  describe('localStorage cookie-consent linking', () => {
    it('does nothing when localStorage cookie_consent is absent', () => {
      authService.isLoggedIn.set(true);
      policyService.getMissingRequiredPolicies.and.returnValue(
        of([policyVersion({ id: 'cp', policyType: PolicyType.COOKIE_POLICY })]),
      );
      service.initializePolicyCheck();
      expect(policyService.acceptPolicy).not.toHaveBeenCalled();
    });

    it('auto-accepts the cookie policy when localStorage shows acceptance', () => {
      localStorage.setItem(
        'cookie_consent',
        JSON.stringify({ version: '1.0.0', accepted: true, date: '2026-01-01T00:00:00Z' }),
      );
      const cp = policyVersion({ id: 'cp', policyType: PolicyType.COOKIE_POLICY });
      policyService.getMissingRequiredPolicies.and.returnValue(of([cp]));
      authService.isLoggedIn.set(true);

      service.initializePolicyCheck();
      expect(policyService.acceptPolicy).toHaveBeenCalledWith('cp', jasmine.any(String));
    });

    it('clears invalid localStorage cookie_consent', () => {
      localStorage.setItem('cookie_consent', 'not-json');
      const cp = policyVersion({ id: 'cp', policyType: PolicyType.COOKIE_POLICY });
      policyService.getMissingRequiredPolicies.and.returnValue(of([cp]));
      authService.isLoggedIn.set(true);
      spyOn(console, 'error');

      service.initializePolicyCheck();
      expect(localStorage.getItem('cookie_consent')).toBeNull();
    });

    it('keeps cookie in missing list when acceptPolicy errors', () => {
      localStorage.setItem('cookie_consent', JSON.stringify({ version: '1.0.0', accepted: true, date: 'x' }));
      const cp = policyVersion({ id: 'cp', policyType: PolicyType.COOKIE_POLICY });
      policyService.getMissingRequiredPolicies.and.returnValue(of([cp]));
      policyService.acceptPolicy.and.returnValue(throwError(() => new Error('500')));
      policyService.getActivePolicies.and.returnValue(
        of({
          termsOfService: null,
          privacyPolicy: null,
          cookiePolicy: cp,
          affiliateTerms: null,
        }),
      );
      authService.isLoggedIn.set(true);
      spyOn(console, 'error');

      service.initializePolicyCheck();
      // Dialog should still open with the cookie policy because acceptance failed
      expect(matDialog.open).toHaveBeenCalled();
    });
  });

  describe('router navigation hook', () => {
    it('does NOT check when logged out', fakeAsync(() => {
      authService.isLoggedIn.set(false);
      routerEvents.next(new NavigationEnd(0, '/a', '/a'));
      tick(500);
      expect(policyService.getMissingRequiredPolicies).not.toHaveBeenCalled();
    }));

    it('checks after debounce when logged in', fakeAsync(() => {
      authService.isLoggedIn.set(true);
      routerEvents.next(new NavigationEnd(0, '/a', '/a'));
      tick(500);
      expect(policyService.getMissingRequiredPolicies).toHaveBeenCalled();
    }));
  });
});
