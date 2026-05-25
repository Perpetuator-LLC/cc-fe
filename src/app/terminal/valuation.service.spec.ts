// Copyright (c) 2025-2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of, throwError } from 'rxjs';
import { ValuationService } from './valuation.service';

describe('ValuationService', () => {
  let service: ValuationService;
  let apollo: jasmine.SpyObj<Apollo>;

  beforeEach(() => {
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query']);
    TestBed.configureTestingModule({
      providers: [ValuationService, { provide: Apollo, useValue: apollo }],
    });
    service = TestBed.inject(ValuationService);
  });

  it('initializes with default signals', () => {
    expect(service.loading()).toBeFalse();
    expect(service.error()).toBeNull();
    expect(service.currentSymbol()).toBeNull();
    expect(service.valuationData()).toBeNull();
    expect(service.ddmData()).toBeNull();
    expect(service.selectedModel()).toBe('dcf');
  });

  describe('loadValuation (DCF)', () => {
    it('populates valuationData on success', (done) => {
      apollo.query.and.returnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        of({ data: { dcfAnalysis: { symbol: 'AAPL', companyName: 'Apple' } } } as any),
      );
      service.loadValuation('AAPL', 7).subscribe((result) => {
        expect(result?.symbol).toBe('AAPL');
        expect(service.valuationData()?.symbol).toBe('AAPL');
        expect(service.currentSymbol()).toBe('AAPL');
        expect(service.loading()).toBeFalse();
        done();
      });
    });

    it('sets a helpful error when data is null', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apollo.query.and.returnValue(of({ data: { dcfAnalysis: null } } as any));
      service.loadValuation('XYZ').subscribe(() => {
        expect(service.error()).toContain('No valuation data');
        done();
      });
    });

    it('detects schema errors (backend not yet shipped) and substitutes a clearer message', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('Cannot query field "dcfAnalysis"')));
      service.loadValuation('AAPL').subscribe((result) => {
        expect(result).toBeNull();
        expect(service.error()).toContain('DCF Valuation API is not yet available');
        done();
      });
    });

    it('surfaces other errors as-is', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('network down')));
      service.loadValuation('AAPL').subscribe(() => {
        expect(service.error()).toBe('network down');
        done();
      });
    });
  });

  describe('loadDDM', () => {
    it('populates ddmData on success and switches selectedModel to ddm', (done) => {
      apollo.query.and.returnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        of({ data: { ddmAnalysis: { symbol: 'MSFT', isDividendPayer: true } } } as any),
      );
      service.loadDDM('MSFT').subscribe(() => {
        expect(service.ddmData()?.symbol).toBe('MSFT');
        expect(service.selectedModel()).toBe('ddm');
        expect(service.error()).toBeNull();
        done();
      });
    });

    it('warns when company does not pay dividends', (done) => {
      apollo.query.and.returnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        of({ data: { ddmAnalysis: { symbol: 'NVDA', isDividendPayer: false } } } as any),
      );
      service.loadDDM('NVDA').subscribe(() => {
        expect(service.error()).toContain('does not pay dividends');
        done();
      });
    });

    it('warns when no DDM data is returned', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apollo.query.and.returnValue(of({ data: { ddmAnalysis: null } } as any));
      service.loadDDM('UNKNOWN').subscribe(() => {
        expect(service.error()).toContain('No DDM data');
        done();
      });
    });

    it('detects schema errors and substitutes a clearer message', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('Cannot query field "ddmAnalysis"')));
      service.loadDDM('MSFT').subscribe(() => {
        expect(service.error()).toContain('DDM Valuation API is not yet available');
        done();
      });
    });

    it('surfaces other errors as-is', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('timeout')));
      service.loadDDM('MSFT').subscribe(() => {
        expect(service.error()).toBe('timeout');
        done();
      });
    });
  });

  describe('setModel / clear', () => {
    it('setModel updates the selectedModel signal', () => {
      service.setModel('ddm');
      expect(service.selectedModel()).toBe('ddm');
      service.setModel('dcf');
      expect(service.selectedModel()).toBe('dcf');
    });

    it('clear resets the data signals back to initial values', () => {
      service.currentSymbol.set('AAPL');
      service.valuationData.set({} as never);
      service.ddmData.set({} as never);
      service.error.set('uh oh');
      service.loading.set(true);

      service.clear();
      expect(service.valuationData()).toBeNull();
      expect(service.ddmData()).toBeNull();
      expect(service.currentSymbol()).toBeNull();
      expect(service.error()).toBeNull();
      expect(service.loading()).toBeFalse();
    });
  });
});
