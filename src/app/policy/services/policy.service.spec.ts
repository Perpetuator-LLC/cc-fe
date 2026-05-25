// Copyright (c) 2025-2026 Perpetuator LLC
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { DomSanitizer } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { signal, WritableSignal } from '@angular/core';
import { PolicyAcceptance, PolicyContentType, PolicyService, PolicyType, PolicyVersion } from './policy.service';
import { AuthService } from '../../auth/auth.service';
import { ErrorHandlerService } from '../../utils/error-handler.service';

function policyVersion(over: Partial<PolicyVersion> = {}): PolicyVersion {
  return {
    id: 'pv1',
    policyType: PolicyType.TERMS_OF_SERVICE,
    version: '1.0.0',
    content: '# Terms\n\nUse at own risk.',
    contentType: PolicyContentType.MARKDOWN,
    ...over,
  };
}

function acceptance(over: Partial<PolicyAcceptance> = {}): PolicyAcceptance {
  return {
    id: 'a1',
    acceptedAt: '2026-01-01T00:00:00Z',
    signature: null,
    policy: policyVersion(),
    ...over,
  };
}

describe('PolicyService', () => {
  let service: PolicyService;
  let apollo: jasmine.SpyObj<Apollo>;
  let isLoggedIn: WritableSignal<boolean>;

  let _sanitizer: jasmine.SpyObj<DomSanitizer>;
  let cacheEvict: jasmine.Spy;
  let cacheGc: jasmine.Spy;

  beforeEach(() => {
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query', 'mutate']);
    apollo.query.and.returnValue(of({ data: { activePolicies: [] } } as any));
    apollo.mutate.and.returnValue(of({ data: {} } as any));
    cacheEvict = jasmine.createSpy('evict');
    cacheGc = jasmine.createSpy('gc');
    (apollo as unknown as { client: { cache: { evict: jasmine.Spy; gc: jasmine.Spy } } }).client = {
      cache: { evict: cacheEvict, gc: cacheGc },
    };

    isLoggedIn = signal<boolean>(true);
    const authService = { isLoggedIn: () => isLoggedIn() } as unknown as AuthService;
    Object.defineProperty(authService, 'isLoggedIn', {
      value: () => isLoggedIn(),
      writable: true,
      configurable: true,
    });

    _sanitizer = jasmine.createSpyObj<DomSanitizer>('DomSanitizer', ['bypassSecurityTrustHtml', 'sanitize']);
    _sanitizer.bypassSecurityTrustHtml.and.callFake((s: string) => s as unknown as never);
    _sanitizer.sanitize.and.callFake((_ctx: number, val: string | null) => val as never);

    const errorHandler = jasmine.createSpyObj<ErrorHandlerService>('ErrorHandlerService', ['handleError']);
    errorHandler.handleError.and.callFake((err) => throwError(() => err));

    TestBed.configureTestingModule({
      providers: [
        PolicyService,
        { provide: Apollo, useValue: apollo },
        { provide: AuthService, useValue: authService },
        { provide: DomSanitizer, useValue: _sanitizer },
        { provide: ErrorHandlerService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(PolicyService);
  });

  describe('getActivePoliciesMetadata / getActivePolicies', () => {
    it('groups policies by type', (done) => {
      apollo.query.and.returnValue(
        of({
          data: {
            activePolicies: [
              policyVersion({ id: 'tos', policyType: PolicyType.TERMS_OF_SERVICE }),
              policyVersion({ id: 'pp', policyType: PolicyType.PRIVACY_POLICY, version: '2.0' }),
              policyVersion({ id: 'aff', policyType: PolicyType.AFFILIATE_TERMS, version: '3.0' }),
              policyVersion({ id: 'cp', policyType: PolicyType.COOKIE_POLICY, version: '4.0' }),
            ],
          },
        } as any),
      );
      service.getActivePoliciesMetadata().subscribe((result) => {
        expect(result.termsOfService?.id).toBe('tos');
        expect(result.privacyPolicy?.id).toBe('pp');
        expect(result.affiliateTerms?.id).toBe('aff');
        expect(result.cookiePolicy?.id).toBe('cp');
        done();
      });
    });

    it('returns all-null result when activePolicies is empty/missing', (done) => {
      apollo.query.and.returnValue(of({ data: { activePolicies: null } } as any));
      service.getActivePolicies().subscribe((result) => {
        expect(result).toEqual({
          termsOfService: null,
          privacyPolicy: null,
          affiliateTerms: null,
          cookiePolicy: null,
        });
        done();
      });
    });

    it('forces network-only when forceRefresh=true', (done) => {
      apollo.query.and.returnValue(of({ data: { activePolicies: [] } } as any));
      service.getActivePoliciesMetadata(true).subscribe(() => {
        const opts = apollo.query.calls.mostRecent().args[0] as { fetchPolicy: string };
        expect(opts.fetchPolicy).toBe('network-only');
        done();
      });
    });

    it('uses cache-first when forceRefresh=false (default)', (done) => {
      service.getActivePolicies().subscribe(() => {
        const opts = apollo.query.calls.mostRecent().args[0] as { fetchPolicy: string };
        expect(opts.fetchPolicy).toBe('cache-first');
        done();
      });
    });
  });

  describe('clearActivePoliciesCache', () => {
    it('evicts both queries from the Apollo cache and triggers GC', () => {
      service.clearActivePoliciesCache();
      expect(cacheEvict).toHaveBeenCalledWith({ fieldName: 'activePolicies' });
      expect(cacheEvict).toHaveBeenCalledWith({ fieldName: 'myPolicyAcceptances' });
      expect(cacheGc).toHaveBeenCalled();
    });

    it('swallows errors and logs them', () => {
      cacheEvict.and.throwError('boom');
      spyOn(console, 'error');
      expect(() => service.clearActivePoliciesCache()).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('logout effect', () => {
    it('clears cache when isLoggedIn transitions from true to false', () => {
      // Wait for the initial effect run to register the current state
      TestBed.flushEffects();
      cacheEvict.calls.reset();
      isLoggedIn.set(false);
      TestBed.flushEffects();
      expect(cacheEvict).toHaveBeenCalledWith({ fieldName: 'activePolicies' });
    });

    it('does NOT clear cache when transitioning false -> true (login)', () => {
      isLoggedIn.set(false);
      TestBed.flushEffects();
      cacheEvict.calls.reset();
      isLoggedIn.set(true);
      TestBed.flushEffects();
      expect(cacheEvict).not.toHaveBeenCalled();
    });
  });

  describe('getPolicy', () => {
    function setupActive() {
      apollo.query.and.returnValue(
        of({
          data: {
            activePolicies: [
              policyVersion({ id: 'tos', policyType: PolicyType.TERMS_OF_SERVICE }),
              policyVersion({ id: 'pp', policyType: PolicyType.PRIVACY_POLICY }),
              policyVersion({ id: 'aff', policyType: PolicyType.AFFILIATE_TERMS }),
              policyVersion({ id: 'cp', policyType: PolicyType.COOKIE_POLICY }),
            ],
          },
        } as any),
      );
    }

    it('returns ToS', (done) => {
      setupActive();
      service.getPolicy(PolicyType.TERMS_OF_SERVICE).subscribe((p) => {
        expect(p?.id).toBe('tos');
        done();
      });
    });

    it('returns Privacy Policy', (done) => {
      setupActive();
      service.getPolicy(PolicyType.PRIVACY_POLICY).subscribe((p) => {
        expect(p?.id).toBe('pp');
        done();
      });
    });

    it('returns Cookie Policy', (done) => {
      setupActive();
      service.getPolicy(PolicyType.COOKIE_POLICY).subscribe((p) => {
        expect(p?.id).toBe('cp');
        done();
      });
    });

    it('returns Affiliate Terms', (done) => {
      setupActive();
      service.getPolicy(PolicyType.AFFILIATE_TERMS).subscribe((p) => {
        expect(p?.id).toBe('aff');
        done();
      });
    });
  });

  describe('getLatestCookiePolicyVersion', () => {
    it('returns the version string', (done) => {
      apollo.query.and.returnValue(
        of({
          data: {
            activePolicies: [policyVersion({ id: 'cp', policyType: PolicyType.COOKIE_POLICY, version: '7.0' })],
          },
        } as any),
      );
      service.getLatestCookiePolicyVersion().subscribe((v) => {
        expect(v).toBe('7.0');
        done();
      });
    });

    it('returns null when no cookie policy exists', (done) => {
      apollo.query.and.returnValue(of({ data: { activePolicies: [] } } as any));
      service.getLatestCookiePolicyVersion().subscribe((v) => {
        expect(v).toBeNull();
        done();
      });
    });
  });

  describe('rendering helpers', () => {
    it('convertMarkdownToHtml calls bypassSecurityTrustHtml', () => {
      service.convertMarkdownToHtml('# Title\n\nbody');
      expect(_sanitizer.bypassSecurityTrustHtml).toHaveBeenCalled();
    });

    it('sanitizeHtml calls sanitize with security context 1', () => {
      service.sanitizeHtml('<p>hi</p>');
      expect(_sanitizer.sanitize).toHaveBeenCalledWith(1, '<p>hi</p>');
    });

    it('renderPolicyContent uses markdown converter for MARKDOWN content', () => {
      service.renderPolicyContent(policyVersion({ contentType: PolicyContentType.MARKDOWN }));
      expect(_sanitizer.bypassSecurityTrustHtml).toHaveBeenCalled();
    });

    it('renderPolicyContent uses sanitize for HTML content', () => {
      service.renderPolicyContent(policyVersion({ contentType: PolicyContentType.HTML, content: '<p>hi</p>' }));
      expect(_sanitizer.sanitize).toHaveBeenCalled();
    });

    it('renderPolicyContent returns loading placeholder when content missing', () => {
      service.renderPolicyContent(policyVersion({ content: undefined }));
      expect(_sanitizer.sanitize).toHaveBeenCalledWith(1, jasmine.stringContaining('Loading'));
    });
  });

  describe('acceptPolicy', () => {
    it('returns success envelope on success', (done) => {
      apollo.mutate.and.returnValue(
        of({
          data: { acceptPolicy: { success: true, message: 'ok', acceptance: { id: 'a1', acceptedAt: 'now' } } },
        } as any),
      );
      service.acceptPolicy('pv1', 'sig').subscribe((res) => {
        expect(res.success).toBeTrue();
        const vars = (apollo.mutate.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
        expect(vars['policyId']).toBe('pv1');
        expect(vars['signature']).toBe('sig');
        done();
      });
    });

    it('throws on !success', (done) => {
      apollo.mutate.and.returnValue(of({ data: { acceptPolicy: { success: false, message: 'no' } } } as any));
      service.acceptPolicy('pv1').subscribe({
        next: () => fail('should error'),
        error: (err) => {
          expect(err.message).toBe('no');
          done();
        },
      });
    });
  });

  describe('getMyPolicyAcceptances', () => {
    it('unwraps myPolicyAcceptances from response', (done) => {
      const list = [acceptance()];
      apollo.query.and.returnValue(of({ data: { myPolicyAcceptances: list } } as any));
      service.getMyPolicyAcceptances().subscribe((result) => {
        expect(result).toEqual(list);
        done();
      });
    });
  });

  describe('getMissingRequiredPolicies', () => {
    it('returns required policies that have not been accepted at all', (done) => {
      apollo.query.and.callFake(((options: { query: { definitions: unknown[] } }) => {
        const op = (options.query.definitions[0] as { name?: { value: string } }).name?.value || '';
        if (op === 'ActivePoliciesMetadata') {
          return of({
            data: {
              activePolicies: [
                policyVersion({ id: 'tos', policyType: PolicyType.TERMS_OF_SERVICE, version: '1.0' }),
                policyVersion({ id: 'pp', policyType: PolicyType.PRIVACY_POLICY, version: '1.0' }),
                policyVersion({ id: 'cp', policyType: PolicyType.COOKIE_POLICY, version: '1.0' }),
              ],
            },
          } as any);
        }
        if (op === 'MyPolicyAcceptances') {
          // Only ToS has been accepted
          return of({
            data: {
              myPolicyAcceptances: [
                acceptance({ policy: policyVersion({ policyType: PolicyType.TERMS_OF_SERVICE, version: '1.0' }) }),
              ],
            },
          } as any);
        }
        return of({ data: {} } as any);
      }) as any);

      service.getMissingRequiredPolicies().subscribe((missing) => {
        expect(missing.map((p) => p.policyType).sort()).toEqual(
          [PolicyType.COOKIE_POLICY, PolicyType.PRIVACY_POLICY].sort(),
        );
        done();
      });
    });

    it('flags version-mismatched policies as missing', (done) => {
      apollo.query.and.callFake(((options: { query: { definitions: unknown[] } }) => {
        const op = (options.query.definitions[0] as { name?: { value: string } }).name?.value || '';
        if (op === 'ActivePoliciesMetadata') {
          return of({
            data: {
              activePolicies: [
                policyVersion({ policyType: PolicyType.TERMS_OF_SERVICE, version: '2.0' }),
                policyVersion({ policyType: PolicyType.PRIVACY_POLICY, version: '2.0' }),
                policyVersion({ policyType: PolicyType.COOKIE_POLICY, version: '2.0' }),
              ],
            },
          } as any);
        }
        if (op === 'MyPolicyAcceptances') {
          return of({
            data: {
              myPolicyAcceptances: [
                acceptance({
                  policy: policyVersion({ policyType: PolicyType.TERMS_OF_SERVICE, version: '1.0' }),
                }),
                acceptance({
                  policy: policyVersion({ policyType: PolicyType.PRIVACY_POLICY, version: '2.0' }),
                }),
                acceptance({
                  policy: policyVersion({ policyType: PolicyType.COOKIE_POLICY, version: '2.0' }),
                }),
              ],
            },
          } as any);
        }
        return of({ data: {} } as any);
      }) as any);

      service.getMissingRequiredPolicies().subscribe((missing) => {
        expect(missing.map((p) => p.policyType)).toEqual([PolicyType.TERMS_OF_SERVICE]);
        done();
      });
    });
  });

  describe('hasPolicyBeenAccepted', () => {
    it('returns true when active version matches accepted version', (done) => {
      apollo.query.and.callFake(((options: { query: { definitions: unknown[] } }) => {
        const op = (options.query.definitions[0] as { name?: { value: string } }).name?.value || '';
        if (op === 'ActivePoliciesMetadata') {
          return of({
            data: {
              activePolicies: [policyVersion({ policyType: PolicyType.TERMS_OF_SERVICE, version: '1.0' })],
            },
          } as any);
        }
        return of({
          data: {
            myPolicyAcceptances: [
              acceptance({ policy: policyVersion({ policyType: PolicyType.TERMS_OF_SERVICE, version: '1.0' }) }),
            ],
          },
        } as any);
      }) as any);
      service.hasPolicyBeenAccepted(PolicyType.TERMS_OF_SERVICE).subscribe((ok) => {
        expect(ok).toBeTrue();
        done();
      });
    });

    it('returns false when version mismatched', (done) => {
      apollo.query.and.callFake(((options: { query: { definitions: unknown[] } }) => {
        const op = (options.query.definitions[0] as { name?: { value: string } }).name?.value || '';
        if (op === 'ActivePoliciesMetadata') {
          return of({
            data: {
              activePolicies: [policyVersion({ policyType: PolicyType.PRIVACY_POLICY, version: '2.0' })],
            },
          } as any);
        }
        return of({
          data: {
            myPolicyAcceptances: [
              acceptance({ policy: policyVersion({ policyType: PolicyType.PRIVACY_POLICY, version: '1.0' }) }),
            ],
          },
        } as any);
      }) as any);
      service.hasPolicyBeenAccepted(PolicyType.PRIVACY_POLICY).subscribe((ok) => {
        expect(ok).toBeFalse();
        done();
      });
    });

    it('returns false when active policy missing', (done) => {
      apollo.query.and.returnValue(of({ data: { activePolicies: [] } } as any));
      service.hasPolicyBeenAccepted(PolicyType.AFFILIATE_TERMS).subscribe((ok) => {
        expect(ok).toBeFalse();
        done();
      });
    });
  });
});
