// Copyright (c) 2025-2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { AFFILIATE_CREDITS_PER_DOLLAR, AffiliateConversionUtils, AffiliateService } from './affiliate.service';
import { ErrorHandlerService } from '../utils/error-handler.service';

describe('AffiliateConversionUtils', () => {
  it('creditsToDollars converts to a 2dp string', () => {
    expect(AffiliateConversionUtils.creditsToDollars(21000)).toBe('21.00');
    expect(AffiliateConversionUtils.creditsToDollars(0)).toBe('0.00');
    expect(AffiliateConversionUtils.creditsToDollars(12345)).toBe('12.35');
  });

  it('centsToDollars converts cents to dollars', () => {
    expect(AffiliateConversionUtils.centsToDollars(2100)).toBe('21.00');
    expect(AffiliateConversionUtils.centsToDollars(0)).toBe('0.00');
  });

  it('formatCreditsAsUSD prepends $', () => {
    expect(AffiliateConversionUtils.formatCreditsAsUSD(10000)).toBe('$10.00');
  });

  it('formatCentsAsUSD prepends $', () => {
    expect(AffiliateConversionUtils.formatCentsAsUSD(5000)).toBe('$50.00');
  });

  it('dollarsToCredits multiplies and floors', () => {
    expect(AffiliateConversionUtils.dollarsToCredits(1)).toBe(AFFILIATE_CREDITS_PER_DOLLAR);
    expect(AffiliateConversionUtils.dollarsToCredits(10.005)).toBe(10005);
    expect(AffiliateConversionUtils.dollarsToCredits(0)).toBe(0);
  });
});

describe('AffiliateService', () => {
  let service: AffiliateService;
  let apollo: jasmine.SpyObj<Apollo>;
  let errorHandler: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query', 'mutate']);
    errorHandler = jasmine.createSpyObj<ErrorHandlerService>('ErrorHandlerService', ['handleError']);

    TestBed.configureTestingModule({
      providers: [
        AffiliateService,
        { provide: Apollo, useValue: apollo },
        { provide: ErrorHandlerService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(AffiliateService);
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  function queryReturns(payload: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apollo.query.and.returnValue(of({ data: payload } as any));
  }
  function mutationReturns(payload: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apollo.mutate.and.returnValue(of({ data: payload } as any));
  }
  function lastQueryVars(): Record<string, unknown> | undefined {
    const opts = apollo.query.calls.mostRecent().args[0] as { variables?: Record<string, unknown> };
    return opts.variables;
  }
  function lastMutationVars(): Record<string, unknown> | undefined {
    const opts = apollo.mutate.calls.mostRecent().args[0] as { variables?: Record<string, unknown> };
    return opts.variables;
  }

  // -------- Queries -----------------------------------------------------------

  describe('queries', () => {
    it('getAffiliateLanding passes the code and unwraps response', (done) => {
      queryReturns({
        affiliateLanding: { affiliateCode: 'ABC', affiliateUsername: 'me', brandImageUrl: null, customMessage: null },
      });
      service.getAffiliateLanding('ABC').subscribe((result) => {
        expect(result.affiliateCode).toBe('ABC');
        expect(lastQueryVars()).toEqual({ affiliateCode: 'ABC' });
        done();
      });
    });

    it('checkAffiliateProgramEligibility unwraps payload', (done) => {
      queryReturns({ affiliateProgramEligibility: { isEligible: true, reason: null, hasPaidOrder: true } });
      service.checkAffiliateProgramEligibility().subscribe((result) => {
        expect(result.isEligible).toBeTrue();
        done();
      });
    });

    it('getAffiliateProfile unwraps profile', (done) => {
      queryReturns({ affiliateProfile: { uuid: 'p1' } });
      service.getAffiliateProfile().subscribe((result) => {
        expect(result?.uuid).toBe('p1');
        done();
      });
    });

    it('getAffiliateStats reads myAffiliateStats', (done) => {
      queryReturns({ myAffiliateStats: null });
      service.getAffiliateStats().subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
    });

    it('getAffiliateCredits reads myAffiliateCredits', (done) => {
      queryReturns({ myAffiliateCredits: [{ uuid: 'c1' }] });
      service.getAffiliateCredits().subscribe((result) => {
        expect(result.length).toBe(1);
        done();
      });
    });

    it('getAffiliateConversions reads myAffiliateConversions', (done) => {
      queryReturns({ myAffiliateConversions: [{ uuid: 'cv1' }] });
      service.getAffiliateConversions().subscribe((result) => {
        expect(result.length).toBe(1);
        done();
      });
    });

    it('getMyAffiliateRelationship reads myAffiliateRelationship', (done) => {
      queryReturns({ myAffiliateRelationship: null });
      service.getMyAffiliateRelationship().subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
    });

    it('getAffiliateByCode reads affiliateByCode and forwards code variable', (done) => {
      queryReturns({ affiliateByCode: { uuid: 'p1' } });
      service.getAffiliateByCode('CODE-X').subscribe((result) => {
        expect(result.uuid).toBe('p1');
        expect(lastQueryVars()).toEqual({ code: 'CODE-X' });
        done();
      });
    });

    it('getCodeHistory reads myCodeHistory', (done) => {
      queryReturns({ myCodeHistory: [{ id: 'h1' }] });
      service.getCodeHistory().subscribe((result) => {
        expect(result.length).toBe(1);
        done();
      });
    });

    it('getCodeChangeRequests reads myCodeChangeRequests', (done) => {
      queryReturns({ myCodeChangeRequests: [{ id: 'r1' }] });
      service.getCodeChangeRequests().subscribe((result) => {
        expect(result.length).toBe(1);
        done();
      });
    });

    it('getCodeChangeInfo reads myCodeChangeInfo', (done) => {
      queryReturns({ myCodeChangeInfo: { changesUsed: 1, changesRemaining: 1 } });
      service.getCodeChangeInfo().subscribe((result) => {
        expect(result).toBeTruthy();
        done();
      });
    });

    it('getPendingCodeChangeRequests reads pendingCodeChangeRequests', (done) => {
      queryReturns({ pendingCodeChangeRequests: [{ id: 'p1' }] });
      service.getPendingCodeChangeRequests().subscribe((result) => {
        expect(result.length).toBe(1);
        done();
      });
    });

    it('getAffiliateProgramSettings reads affiliateSystemSettings', (done) => {
      queryReturns({ affiliateSystemSettings: { isEnabled: true, disabledMessage: '' } });
      service.getAffiliateProgramSettings().subscribe((result) => {
        expect(result.isEnabled).toBeTrue();
        done();
      });
    });

    it('searchAffiliateUsers passes query and unwraps array', (done) => {
      queryReturns({ searchAffiliateUsers: [{ uuid: 'u1' }] });
      service.searchAffiliateUsers('nik').subscribe((result) => {
        expect(result.length).toBe(1);
        expect(lastQueryVars()).toEqual({ query: 'nik' });
        done();
      });
    });

    it('getAllPayoutConversions reads allPayoutConversions and forwards filters', (done) => {
      queryReturns({ allPayoutConversions: [{ id: 'pc1' }] });
      service.getAllPayoutConversions('PENDING', 'CASH', 25).subscribe(() => {
        expect(lastQueryVars()).toEqual({ status: 'PENDING', conversionType: 'CASH', limit: 25 });
        done();
      });
    });

    it('getPayoutConversionById reads payoutConversionById', (done) => {
      queryReturns({ payoutConversionById: { id: 'pc1' } });
      service.getPayoutConversionById('pc1').subscribe(() => {
        expect(lastQueryVars()).toEqual({ conversionId: 'pc1' });
        done();
      });
    });

    it('getPlatformFinancialStats reads platformFinancialStats', (done) => {
      queryReturns({
        platformFinancialStats: {
          stripeAvailableBalanceCents: 100,
          stripePendingBalanceCents: 0,
          stripeTotalBalanceCents: 100,
          stripeCurrency: 'USD',
          stripeIsLiveMode: false,
          totalAffiliateCredits: 0,
          totalAffiliateCreditsCents: 0,
          totalAffiliateCreditsDollars: 0,
        },
      });
      service.getPlatformFinancialStats().subscribe((result) => {
        expect(result.stripeAvailableBalanceCents).toBe(100);
        done();
      });
    });
  });

  // -------- Mutations ---------------------------------------------------------

  describe('mutations', () => {
    it('joinAffiliateProgram returns payload on success and throws on failure', (done) => {
      mutationReturns({ joinAffiliateProgram: { success: true, message: 'ok', relationship: null } });
      service.joinAffiliateProgram('ABC').subscribe((result) => {
        expect(result.success).toBeTrue();
        expect(lastMutationVars()).toEqual({ affiliateCode: 'ABC' });

        mutationReturns({ joinAffiliateProgram: { success: false, message: 'nope', relationship: null } });
        service.joinAffiliateProgram('XYZ').subscribe({
          error: (err) => {
            expect(err.message).toBe('nope');
            done();
          },
        });
      });
    });

    it('acceptAffiliateTerms returns payload on success and throws on failure', (done) => {
      mutationReturns({
        acceptAffiliateTerms: { success: true, message: 'ok', consent: null, affiliateProfile: null },
      });
      service.acceptAffiliateTerms('v1').subscribe(() => {
        mutationReturns({
          acceptAffiliateTerms: { success: false, message: 'reject', consent: null, affiliateProfile: null },
        });
        service.acceptAffiliateTerms('v1').subscribe({
          error: (err) => {
            expect(err.message).toBe('reject');
            done();
          },
        });
      });
    });

    it('updateAffiliateProfile passes customMessage', (done) => {
      mutationReturns({
        updateAffiliateProfile: { success: true, message: 'ok', affiliateProfile: { uuid: 'p1' } },
      });
      service.updateAffiliateProfile('hello').subscribe(() => {
        expect(lastMutationVars()).toEqual({ customMessage: 'hello' });
        done();
      });
    });

    it('createStripeConnectAccount returns payload', (done) => {
      mutationReturns({ createStripeConnectAccount: { success: true, message: 'ok' } });
      service.createStripeConnectAccount().subscribe((res) => {
        expect(res.success).toBeTrue();
        done();
      });
    });

    it('refreshStripeAccountStatus returns payload', (done) => {
      mutationReturns({ refreshStripeAccountStatus: { success: true, message: 'ok' } });
      service.refreshStripeAccountStatus().subscribe((res) => {
        expect(res.success).toBeTrue();
        done();
      });
    });

    it('requestCodeChange forwards newCode + reason', (done) => {
      mutationReturns({
        requestCodeChange: { success: true, message: 'ok', requestId: null, requiresReview: false },
      });
      service.requestCodeChange('NEW', 'rebrand').subscribe(() => {
        expect(lastMutationVars()).toEqual({ newCode: 'NEW', reason: 'rebrand' });
        done();
      });
    });

    it('cancelCodeChangeRequest forwards requestId', (done) => {
      mutationReturns({
        cancelCodeChangeRequest: { success: true, message: 'ok', codeChangeRequest: null },
      });
      service.cancelCodeChangeRequest('r1').subscribe(() => {
        expect(lastMutationVars()).toEqual({ requestId: 'r1' });
        done();
      });
    });

    it('approveCodeChangeRequest forwards requestId', (done) => {
      mutationReturns({
        approveCodeChangeRequest: { success: true, message: 'ok', codeChangeRequest: null },
      });
      service.approveCodeChangeRequest('r1').subscribe(() => {
        expect(lastMutationVars()).toEqual({ requestId: 'r1' });
        done();
      });
    });

    it('rejectCodeChangeRequest forwards id + rejectionReason', (done) => {
      mutationReturns({
        rejectCodeChangeRequest: { success: true, message: 'ok', codeChangeRequest: null },
      });
      service.rejectCodeChangeRequest('r1', 'nope').subscribe(() => {
        const vars = lastMutationVars() as Record<string, unknown>;
        expect(vars['requestId']).toBe('r1');
        expect(vars['rejectionReason']).toBe('nope');
        done();
      });
    });

    it('updateAffiliateEligibility forwards userId + status', (done) => {
      mutationReturns({
        updateAffiliateEligibility: { success: true, message: 'ok', affiliateProfile: null },
      });
      service.updateAffiliateEligibility('u1', 'ELIGIBLE', 'manual', 'reason').subscribe(() => {
        const vars = lastMutationVars() as Record<string, unknown>;
        expect(vars['userId']).toBe('u1');
        expect(vars['eligibilityStatus']).toBe('ELIGIBLE');
        done();
      });
    });

    it('updateAffiliateNetworkStatus forwards user + isActive', (done) => {
      mutationReturns({
        updateAffiliateNetworkStatus: { success: true, message: 'ok', affiliateProfile: null },
      });
      service.updateAffiliateNetworkStatus('u1', true).subscribe(() => {
        const vars = lastMutationVars() as Record<string, unknown>;
        expect(vars['userId']).toBe('u1');
        expect(vars['isActive']).toBe(true);
        done();
      });
    });

    it('updateAffiliateProgramEnabled reads updateAffiliateSystemSettings', (done) => {
      mutationReturns({ updateAffiliateSystemSettings: { success: true, message: 'ok' } });
      service.updateAffiliateProgramEnabled(false, 'paused').subscribe(() => {
        const vars = lastMutationVars() as Record<string, unknown>;
        expect(vars['isEnabled']).toBe(false);
        expect(vars['disabledMessage']).toBe('paused');
        done();
      });
    });

    it('approvePayoutRequest forwards conversionId', (done) => {
      mutationReturns({
        approvePayoutRequest: { success: true, message: 'ok', conversion: null },
      });
      service.approvePayoutRequest('pc1').subscribe(() => {
        expect((lastMutationVars() as Record<string, unknown>)['conversionId']).toBe('pc1');
        done();
      });
    });

    it('rejectPayoutRequest forwards id + reason', (done) => {
      mutationReturns({
        rejectPayoutRequest: { success: true, message: 'ok', conversion: null },
      });
      service.rejectPayoutRequest('pc1', 'no').subscribe(() => {
        const vars = lastMutationVars() as Record<string, unknown>;
        expect(vars['conversionId']).toBe('pc1');
        expect(vars['rejectionReason']).toBe('no');
        done();
      });
    });

    it('exportAffiliateGraph forwards format and unwraps payload', (done) => {
      mutationReturns({
        exportAffiliateGraph: { success: true, message: 'ok', graphData: 'graph TB', format: 'mermaid' },
      });
      service.exportAffiliateGraph('mermaid').subscribe((res) => {
        expect(res.success).toBeTrue();
        expect((lastMutationVars() as Record<string, unknown>)['format']).toBe('mermaid');
        done();
      });
    });

    it('convertAffiliateCredits forwards conversionType + amount', (done) => {
      mutationReturns({
        convertAffiliateCredits: { success: true, message: 'ok', conversion: null },
      });
      service.convertAffiliateCredits('to_cash', 10000).subscribe(() => {
        const vars = lastMutationVars() as Record<string, unknown>;
        expect(vars['conversionType']).toBe('to_cash');
        expect(vars['amount']).toBe(10000);
        done();
      });
    });

    it('deleteAffiliateBrandImage reads updateAffiliateBrandImage', (done) => {
      mutationReturns({
        updateAffiliateBrandImage: { success: true, message: 'ok', affiliateProfile: null },
      });
      service.deleteAffiliateBrandImage().subscribe((res) => {
        expect(res.success).toBeTrue();
        // The variable is { deleteImage: true }
        expect((lastMutationVars() as Record<string, unknown>)['deleteImage']).toBe(true);
        done();
      });
    });

    it('checkCodeAvailability uses mutation and forwards code', (done) => {
      mutationReturns({ checkCodeAvailability: { available: true, reason: null } });
      service.checkCodeAvailability('NEWCODE').subscribe((result) => {
        expect(result.available).toBeTrue();
        expect((lastMutationVars() as Record<string, unknown>)['code']).toBe('NEWCODE');
        done();
      });
    });
  });
});
