// Copyright (c) 2026 Perpetuator LLC
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of, throwError } from 'rxjs';
import { CashFlowData, DividendService, IncomeData } from './dividend.service';

function cashflow(over: Partial<CashFlowData> = {}): CashFlowData {
  return {
    fiscalDateEnding: '2024-12-31',
    operatingCashFlow: 100_000_000_000,
    capitalExpenditures: -10_000_000_000,
    dividendPayout: -20_000_000_000,
    ...over,
  };
}

function income(over: Partial<IncomeData> = {}): IncomeData {
  return {
    fiscalDateEnding: '2024-12-31',
    netIncome: 80_000_000_000,
    ...over,
  };
}

function stubQueries(
  apollo: jasmine.SpyObj<Apollo>,
  opts: {
    cashFlows?: CashFlowData[];
    incomeStatements?: IncomeData[];
    quote?: { price: number; change: number; changePercent: number } | null;
    shares?: number | null;
  },
) {
  apollo.query.and.callFake(((options: { query: { definitions: unknown[] } }) => {
    const op = (options.query.definitions[0] as { name?: { value: string } }).name?.value || '';
    if (op === 'CashFlowsForDividends') {
      return of({ data: { cashFlows: opts.cashFlows ?? [] } } as any);
    }
    if (op === 'IncomeStatementsForDividends') {
      return of({ data: { incomeStatements: opts.incomeStatements ?? [] } } as any);
    }
    if (op === 'QuoteForDividends') {
      return of({ data: { quote: opts.quote ?? null } } as any);
    }
    if (op === 'BalanceSheetForDividends') {
      const sheets =
        opts.shares !== undefined
          ? [{ fiscalDateEnding: '2024-12-31', commonStockSharesOutstanding: opts.shares }]
          : [];
      return of({ data: { balanceSheets: sheets } } as any);
    }
    return of({ data: {} } as any);
  }) as any);
}

describe('DividendService', () => {
  let service: DividendService;
  let apollo: jasmine.SpyObj<Apollo>;

  beforeEach(() => {
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query']);
    stubQueries(apollo, {});
    TestBed.configureTestingModule({
      providers: [DividendService, { provide: Apollo, useValue: apollo }],
    });
    service = TestBed.inject(DividendService);
  });

  it('is created with sane defaults', () => {
    expect(service.loading()).toBeFalse();
    expect(service.error()).toBeNull();
  });

  describe('loadDividendAnalysis', () => {
    it('returns null and sets error when no cash flow data', (done) => {
      stubQueries(apollo, { cashFlows: [], incomeStatements: [] });
      service.loadDividendAnalysis('AAPL').subscribe((result) => {
        expect(result).toBeNull();
        expect(service.error()).toContain('No cash flow data');
        expect(service.loading()).toBeFalse();
        done();
      });
    });

    it('builds yearly data sorted by date with FCF/payout ratios', (done) => {
      stubQueries(apollo, {
        cashFlows: [cashflow({ fiscalDateEnding: '2024-12-31' }), cashflow({ fiscalDateEnding: '2022-12-31' })],
        incomeStatements: [income({ fiscalDateEnding: '2024-12-31' })],
        quote: { price: 200, change: 1, changePercent: 0.5 },
        shares: 5_000_000_000,
      });
      service.loadDividendAnalysis('AAPL').subscribe((result) => {
        expect(result).not.toBeNull();
        expect(result!.symbol).toBe('AAPL');
        // Sorted oldest -> newest
        expect(result!.yearlyData.map((y) => y.year)).toEqual(['2022', '2024']);
        // FCF = OCF - |CapEx| = 100e9 - 10e9 = 90e9
        expect(result!.yearlyData[0].freeCashFlow).toBe(90_000_000_000);
        // fcfPayoutRatio = |div| / |FCF| = 20e9 / 90e9
        expect(result!.yearlyData[0].fcfPayoutRatio).toBeCloseTo(20 / 90);
        // netIncomePayoutRatio only present where income matches by date
        expect(result!.yearlyData[1].netIncomePayoutRatio).toBeCloseTo(20 / 80);
        expect(result!.yearlyData[0].netIncomePayoutRatio).toBeNull();
        done();
      });
    });

    it('falls back to OCF as proxy when CapEx is null', (done) => {
      stubQueries(apollo, {
        cashFlows: [cashflow({ capitalExpenditures: null })],
        incomeStatements: [income()],
      });
      service.loadDividendAnalysis('AAPL').subscribe((result) => {
        // freeCashFlow = OCF (100e9) when CapEx is missing
        expect(result!.yearlyData[0].freeCashFlow).toBe(100_000_000_000);
        done();
      });
    });

    it('returns null FCF when OCF is also null', (done) => {
      stubQueries(apollo, {
        cashFlows: [cashflow({ operatingCashFlow: null, capitalExpenditures: null })],
      });
      service.loadDividendAnalysis('AAPL').subscribe((result) => {
        expect(result!.yearlyData[0].freeCashFlow).toBeNull();
        expect(result!.yearlyData[0].fcfPayoutRatio).toBeNull();
        done();
      });
    });

    it('computes dividendYield and annualDividend from shares + price', (done) => {
      stubQueries(apollo, {
        cashFlows: [cashflow({ dividendPayout: -1_000_000_000 })],
        incomeStatements: [income()],
        quote: { price: 100, change: 0, changePercent: 0 },
        shares: 1_000_000_000,
      });
      service.loadDividendAnalysis('A').subscribe((result) => {
        // annualDividendPerShare = 1e9 / 1e9 = 1
        expect(result!.metrics.annualDividend).toBe(1);
        // yield = 1/100 * 100 = 1%
        expect(result!.metrics.dividendYield).toBe(1);
        done();
      });
    });

    it('sets dividendYield to null when shares outstanding missing', (done) => {
      stubQueries(apollo, {
        cashFlows: [cashflow()],
        incomeStatements: [income()],
        quote: { price: 100, change: 0, changePercent: 0 },
        shares: null,
      });
      service.loadDividendAnalysis('A').subscribe((result) => {
        expect(result!.metrics.annualDividend).toBeNull();
        expect(result!.metrics.dividendYield).toBeNull();
        done();
      });
    });

    it('returns null CAGRs when fewer than years+1 data points', (done) => {
      stubQueries(apollo, {
        cashFlows: [cashflow({ fiscalDateEnding: '2024-12-31' })],
        incomeStatements: [income()],
      });
      service.loadDividendAnalysis('A').subscribe((result) => {
        expect(result!.metrics.dividendCagr5Year).toBeNull();
        expect(result!.metrics.fcfCagr10Year).toBeNull();
        done();
      });
    });

    it('computes 5y CAGR when enough data is present', (done) => {
      const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
      const cashFlows = years.map((y, i) =>
        cashflow({
          fiscalDateEnding: `${y}-12-31`,
          dividendPayout: -((i + 1) * 1_000_000_000),
          operatingCashFlow: (i + 1) * 10_000_000_000,
        }),
      );
      const incomeStatements = years.map((y) => income({ fiscalDateEnding: `${y}-12-31` }));
      stubQueries(apollo, { cashFlows, incomeStatements });
      service.loadDividendAnalysis('A').subscribe((result) => {
        // We have 7 years; 5y CAGR is computable; 10y CAGR is not
        expect(result!.metrics.dividendCagr5Year).not.toBeNull();
        expect(result!.metrics.dividendCagr10Year).toBeNull();
        // Start = year-5 from end. With end=7e9 and start=2e9, CAGR ~= (3.5)^(1/5)-1 ~= 28.5%
        expect(result!.metrics.dividendCagr5Year!).toBeGreaterThan(20);
        done();
      });
    });

    it('CAGR returns null when start value is 0', (done) => {
      // Exactly 6 entries → endIndex=5, startIndex=0. Put the 0 at index 0.
      const years = [2019, 2020, 2021, 2022, 2023, 2024];
      const cashFlows = years.map((y, i) =>
        cashflow({
          fiscalDateEnding: `${y}-12-31`,
          dividendPayout: i === 0 ? 0 : -((i + 1) * 1_000_000_000),
        }),
      );
      stubQueries(apollo, { cashFlows });
      service.loadDividendAnalysis('A').subscribe((result) => {
        expect(result!.metrics.dividendCagr5Year).toBeNull();
        done();
      });
    });

    it('top-level catchError returns null and surfaces error message on signal', (done) => {
      // forkJoin succeeds (each inner stream has its own catchError), but we
      // can still verify the outer catchError works by inducing an exception
      // inside the buildYearlyData step — e.g., by passing data that would
      // trigger an error in the .map callback. Simulate by spying:
      stubQueries(apollo, { cashFlows: [cashflow()] });
      spyOn(service as unknown as { buildYearlyData: () => never }, 'buildYearlyData').and.throwError('boom');
      service.loadDividendAnalysis('FAIL').subscribe((result) => {
        expect(result).toBeNull();
        expect(service.error()).toContain('boom');
        expect(service.loading()).toBeFalse();
        done();
      });
    });

    it('falls back to [] when inner cashFlows query errors (still returns null due to empty)', (done) => {
      // Throw inside the cashFlows query — catchError converts to []
      apollo.query.and.callFake(((options: { query: { definitions: unknown[] } }) => {
        const op = (options.query.definitions[0] as { name?: { value: string } }).name?.value || '';
        if (op === 'CashFlowsForDividends') return throwError(() => new Error('500'));
        return of({ data: {} } as any);
      }) as any);
      service.loadDividendAnalysis('X').subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
    });
  });
});
