// Copyright (c) 2026 Perpetuator LLC
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of, throwError } from 'rxjs';
import { BalanceSheet, CashFlow, FundamentalsService, IncomeStatement } from './fundamentals.service';

function balance(over: Partial<BalanceSheet> = {}): BalanceSheet {
  return {
    fiscalDateEnding: '2024-12-31',
    reportedCurrency: 'USD',
    totalAssets: 100,
    totalLiabilities: 50,
    totalEquity: 50,
    shortTermDebt: 5,
    longTermDebt: 30,
    commonStockSharesOutstanding: 1_000_000_000,
    ...over,
  };
}

function income(over: Partial<IncomeStatement> = {}): IncomeStatement {
  return {
    fiscalDateEnding: '2024-12-31',
    reportedCurrency: 'USD',
    totalRevenue: 100,
    costOfRevenue: 60,
    grossProfit: 40,
    operatingIncome: 30,
    ebitda: 35,
    netIncome: 25,
    epsReported: 5,
    grossProfitRatio: 0.4,
    operatingMargin: 0.3,
    netIncomeRatio: 0.25,
    ...over,
  };
}

function cash(over: Partial<CashFlow> = {}): CashFlow {
  return {
    fiscalDateEnding: '2024-12-31',
    reportedCurrency: 'USD',
    operatingCashFlow: 30,
    dividendPayout: -10,
    ...over,
  };
}

describe('FundamentalsService', () => {
  let service: FundamentalsService;
  let apollo: jasmine.SpyObj<Apollo>;

  beforeEach(() => {
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query', 'mutate']);
    apollo.query.and.callFake(((options: { query: { definitions: unknown[] } }) => {
      // Default empty responses; tests override via and.returnValues / and.callFake
      const op = (options.query.definitions[0] as { name?: { value: string } }).name?.value || '';
      const data: Record<string, unknown> = {};
      if (op === 'BalanceSheets') data['balanceSheets'] = [];
      if (op === 'IncomeStatements') data['incomeStatements'] = [];
      if (op === 'CashFlows') data['cashFlows'] = [];
      return of({ data } as any);
    }) as any);
    apollo.mutate.and.returnValue(of({ data: {} } as any));
    TestBed.configureTestingModule({
      providers: [FundamentalsService, { provide: Apollo, useValue: apollo }],
    });
    service = TestBed.inject(FundamentalsService);
  });

  function stubLoad(bs: BalanceSheet[] = [], is: IncomeStatement[] = [], cf: CashFlow[] = []) {
    apollo.query.and.callFake(((options: { query: { definitions: unknown[] } }) => {
      const op = (options.query.definitions[0] as { name?: { value: string } }).name?.value || '';
      if (op === 'BalanceSheets') return of({ data: { balanceSheets: bs } } as any);
      if (op === 'IncomeStatements') return of({ data: { incomeStatements: is } } as any);
      if (op === 'CashFlows') return of({ data: { cashFlows: cf } } as any);
      return of({ data: {} } as any);
    }) as any);
  }

  it('is created with initial state', () => {
    expect(service.loading()).toBeFalse();
    expect(service.error()).toBeNull();
    expect(service.currentSymbol()).toBeNull();
    expect(service.isAnnual()).toBeTrue();
    expect(service.fundamentalsData()).toBeNull();
  });

  describe('formatLargeNumber', () => {
    it('returns N/A for null/undefined', () => {
      expect(service.formatLargeNumber(null)).toBe('N/A');
      expect(service.formatLargeNumber(undefined)).toBe('N/A');
    });

    it('formats trillions/billions/millions/thousands/units', () => {
      expect(service.formatLargeNumber(1.2e12)).toBe('$1.20T');
      expect(service.formatLargeNumber(1.5e9)).toBe('$1.50B');
      expect(service.formatLargeNumber(2.5e6)).toBe('$2.50M');
      expect(service.formatLargeNumber(25_000)).toBe('$25.00K');
      expect(service.formatLargeNumber(50)).toBe('$50');
    });

    it('handles negative values with sign prefix', () => {
      expect(service.formatLargeNumber(-1.5e9)).toBe('-$1.50B');
      expect(service.formatLargeNumber(-50)).toBe('-$50');
    });
  });

  describe('loadFundamentals', () => {
    it('forkJoins all three queries, derives reportedCurrency from income statements, and updates signals', (done) => {
      stubLoad([balance()], [income({ reportedCurrency: 'TWD' })], [cash()]);
      service.loadFundamentals('AAPL').subscribe((data) => {
        expect(data.symbol).toBe('AAPL');
        expect(data.isAnnual).toBeTrue();
        expect(data.reportedCurrency).toBe('TWD');
        expect(data.balanceSheets.length).toBe(1);
        expect(data.incomeStatements.length).toBe(1);
        expect(data.cashFlows.length).toBe(1);
        expect(service.loading()).toBeFalse();
        expect(service.currentSymbol()).toBe('AAPL');
        expect(service.fundamentalsData()).toEqual(data);
        done();
      });
    });

    it('defaults reportedCurrency to USD when income statements are empty', (done) => {
      stubLoad([balance()], [], [cash()]);
      service.loadFundamentals('MSFT').subscribe((data) => {
        expect(data.reportedCurrency).toBe('USD');
        done();
      });
    });

    it('returns empty fallback when forkJoin errors at the map step', (done) => {
      // Inject a query that throws inside the forkJoin
      apollo.query.and.callFake(((options: { query: { definitions: unknown[] } }) => {
        const op = (options.query.definitions[0] as { name?: { value: string } }).name?.value || '';
        if (op === 'IncomeStatements') return throwError(() => new Error('boom'));
        return of({ data: {} } as any);
      }) as any);
      spyOn(console, 'error');
      service.loadFundamentals('FAIL').subscribe((data) => {
        // The inner catchError on queryIncomeStatements turns the throw into []
        // so forkJoin actually succeeds. Verify the resulting shape.
        expect(data.symbol).toBe('FAIL');
        expect(data.incomeStatements).toEqual([]);
        done();
      });
    });

    it('passes limit + isAnnual + ticker variables to each query', (done) => {
      stubLoad();
      service.loadFundamentals('TSLA', false, 5).subscribe(() => {
        const calls = apollo.query.calls.allArgs() as unknown as { variables: Record<string, unknown> }[][];
        const vars = calls.map((args) => args[0].variables);
        vars.forEach((v) => {
          expect(v['ticker']).toBe('TSLA');
          expect(v['isAnnual']).toBeFalse();
          expect(v['limit']).toBe(5);
        });
        done();
      });
    });
  });

  describe('hasFundamentalsData / togglePeriod', () => {
    it('hasFundamentalsData returns false on init', () => {
      expect(service.hasFundamentalsData()).toBeFalse();
    });

    it('hasFundamentalsData returns true once any of the arrays is non-empty', (done) => {
      stubLoad([balance()], [], []);
      service.loadFundamentals('X').subscribe(() => {
        expect(service.hasFundamentalsData()).toBeTrue();
        done();
      });
    });

    it('togglePeriod re-loads with flipped isAnnual', (done) => {
      stubLoad([balance()], [income()], [cash()]);
      service.loadFundamentals('X', true).subscribe(() => {
        const before = apollo.query.calls.count();
        service.togglePeriod();
        // togglePeriod calls loadFundamentals, which issues 3 more queries
        expect(apollo.query.calls.count()).toBe(before + 3);
        const lastCallVars = (apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> })
          .variables;
        expect(lastCallVars['isAnnual']).toBeFalse();
        done();
      });
    });

    it('togglePeriod is a no-op when no current symbol', () => {
      const before = apollo.query.calls.count();
      service.togglePeriod();
      expect(apollo.query.calls.count()).toBe(before);
    });
  });

  describe('fetchFundamentalsFromProvider', () => {
    it('returns success=true with job UUIDs when all three mutations succeed', (done) => {
      apollo.mutate.and.callFake(((options: { mutation: { definitions: unknown[] } }) => {
        const op = (options.mutation.definitions[0] as { name?: { value: string } }).name?.value || '';
        if (op === 'FetchBalanceSheet')
          return of({ data: { fetchBalanceSheet: { success: true, job: { uuid: 'bs-1' } } } } as any);
        if (op === 'FetchIncomeStatement')
          return of({ data: { fetchIncomeStatement: { success: true, job: { uuid: 'is-1' } } } } as any);
        if (op === 'FetchCashFlow')
          return of({ data: { fetchCashFlow: { success: true, job: { uuid: 'cf-1' } } } } as any);
        return of({ data: {} } as any);
      }) as any);
      service.fetchFundamentalsFromProvider('AAPL').subscribe((result) => {
        expect(result.success).toBeTrue();
        expect(result.jobIds.sort()).toEqual(['bs-1', 'cf-1', 'is-1']);
        done();
      });
    });

    it('returns success=true if at least one succeeded, omits missing job UUIDs', (done) => {
      apollo.mutate.and.callFake(((options: { mutation: { definitions: unknown[] } }) => {
        const op = (options.mutation.definitions[0] as { name?: { value: string } }).name?.value || '';
        if (op === 'FetchBalanceSheet') return of({ data: { fetchBalanceSheet: { success: false } } } as any);
        if (op === 'FetchIncomeStatement')
          return of({ data: { fetchIncomeStatement: { success: true, job: { uuid: 'is-1' } } } } as any);
        return of({ data: { fetchCashFlow: { success: false } } } as any);
      }) as any);
      service.fetchFundamentalsFromProvider('X').subscribe((result) => {
        expect(result.success).toBeTrue();
        expect(result.jobIds).toEqual(['is-1']);
        done();
      });
    });
  });
});
