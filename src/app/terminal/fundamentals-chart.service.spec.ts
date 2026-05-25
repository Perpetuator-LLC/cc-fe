// Copyright (c) 2025-2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { FundamentalsChartService } from './fundamentals-chart.service';
import { BalanceSheet, CashFlow, IncomeStatement } from './fundamentals.service';
import { EChartsOption } from 'echarts';

function income(over: Partial<IncomeStatement>): IncomeStatement {
  return {
    fiscalDateEnding: '2024-12-31',
    reportedCurrency: 'USD',
    totalRevenue: 100_000_000_000,
    costOfRevenue: 60_000_000_000,
    grossProfit: 40_000_000_000,
    operatingIncome: 30_000_000_000,
    ebitda: 35_000_000_000,
    netIncome: 25_000_000_000,
    epsReported: 5.0,
    grossProfitRatio: 0.4,
    operatingMargin: 0.3,
    netIncomeRatio: 0.25,
    ...over,
  };
}

function balance(over: Partial<BalanceSheet>): BalanceSheet {
  return {
    fiscalDateEnding: '2024-12-31',
    reportedCurrency: 'USD',
    totalAssets: 200_000_000_000,
    totalLiabilities: 100_000_000_000,
    totalEquity: 100_000_000_000,
    shortTermDebt: 5_000_000_000,
    longTermDebt: 50_000_000_000,
    commonStockSharesOutstanding: 5_000_000_000,
    ...over,
  };
}

function cash(over: Partial<CashFlow>): CashFlow {
  return {
    fiscalDateEnding: '2024-12-31',
    reportedCurrency: 'USD',
    operatingCashFlow: 30_000_000_000,
    dividendPayout: -2_000_000_000,
    ...over,
  };
}

describe('FundamentalsChartService', () => {
  let service: FundamentalsChartService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [FundamentalsChartService] });
    service = TestBed.inject(FundamentalsChartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // The chart builders all return EChartsOption objects with title/series.
  // The yAxis formatter and tooltip formatter are functions on the returned
  // option; invoking them exercises the private helpers (formatAxisValue,
  // formatTooltip, formatLargeNumber, getCurrencyLabel, formatFiscalDate).
  function invokeAxisFormatter(opt: EChartsOption, value: number): string {
    const yAxis = (Array.isArray(opt.yAxis) ? opt.yAxis[0] : opt.yAxis) as {
      axisLabel?: { formatter?: (v: number) => string };
    };
    return yAxis?.axisLabel?.formatter ? yAxis.axisLabel.formatter(value) : '';
  }
  function invokeTooltip(opt: EChartsOption, params: unknown): string {
    const tt = opt.tooltip as { formatter?: (p: unknown) => string };
    return tt?.formatter ? tt.formatter(params) : '';
  }

  describe('empty / placeholder behavior', () => {
    it('buildIncomeStatementChart returns placeholder when no data', () => {
      const opt = service.buildIncomeStatementChart([]);
      expect((opt.title as { text?: string }).text).toContain('No Income Statement Data');
    });

    it('buildEpsChart returns placeholder when no data', () => {
      const opt = service.buildEpsChart([]);
      expect((opt.title as { text?: string }).text).toContain('No EPS Data');
    });

    it('buildEpsChart returns placeholder when all EPS values are null', () => {
      const opt = service.buildEpsChart([income({ epsReported: null })]);
      expect((opt.title as { text?: string }).text).toContain('No EPS Data');
    });

    it('buildRevenueChart returns placeholder when no data', () => {
      const opt = service.buildRevenueChart([]);
      expect((opt.title as { text?: string }).text).toContain('No Revenue Data');
    });

    it('buildBalanceSheetChart returns placeholder when no data', () => {
      const opt = service.buildBalanceSheetChart([]);
      expect((opt.title as { text?: string }).text).toContain('No Balance Sheet Data');
    });

    it('buildCashFlowChart returns placeholder when no data', () => {
      const opt = service.buildCashFlowChart([]);
      expect((opt.title as { text?: string }).text).toContain('No Cash Flow Data');
    });

    it('buildDebtChart returns placeholder when no data', () => {
      const opt = service.buildDebtChart([]);
      expect((opt.title as { text?: string }).text).toContain('No Debt Data');
    });
  });

  describe('buildIncomeStatementChart', () => {
    it('renders title, two series and exercises formatters', () => {
      const data = [income({ fiscalDateEnding: '2022-12-31' }), income({ fiscalDateEnding: '2024-12-31' })];
      const opt = service.buildIncomeStatementChart(data);
      expect((opt.title as { text?: string }).text).toContain('Income Statement');
      const series = opt.series as { name: string; data: unknown[] }[];
      expect(series.length).toBe(2);
      expect(series.map((s) => s.name)).toEqual(['Revenue', 'Net Income']);

      // Axis formatter handles trillions/billions/millions/small values
      expect(invokeAxisFormatter(opt, 1.5e12)).toContain('T');
      expect(invokeAxisFormatter(opt, 2.5e9)).toContain('B');
      expect(invokeAxisFormatter(opt, 3.5e6)).toContain('M');
      expect(invokeAxisFormatter(opt, 500)).toContain('500');

      // Tooltip formatter handles array and non-array params
      const tipHtml = invokeTooltip(opt, [{ name: '2024', seriesName: 'Revenue', value: 1.2e9, color: '#fff' }]);
      expect(tipHtml).toContain('2024');
      expect(tipHtml).toContain('Revenue');
      expect(invokeTooltip(opt, null)).toBe('');
    });
  });

  describe('buildEpsChart', () => {
    it('renders EPS series and merges shares-outstanding overlay when balance sheets supplied', () => {
      const data = [income({ fiscalDateEnding: '2022-12-31' }), income({ fiscalDateEnding: '2024-12-31' })];
      const bs = [balance({ fiscalDateEnding: '2022-12-31' }), balance({ fiscalDateEnding: '2024-12-31' })];
      const opt = service.buildEpsChart(data, bs);
      const series = opt.series as { name: string }[];
      expect(series.length).toBeGreaterThanOrEqual(1);
      // Tooltip formatter should run on per-series, non-array params too
      invokeTooltip(opt, [{ name: '2024', seriesName: 'EPS', value: 5, color: '#fff' }]);
    });

    it('handles balance sheets with null shares (no overlay)', () => {
      const opt = service.buildEpsChart([income({})], [balance({ commonStockSharesOutstanding: null })]);
      expect(opt.series).toBeDefined();
    });
  });

  describe('buildRevenueChart', () => {
    it('renders without gross profit when none present', () => {
      const opt = service.buildRevenueChart([income({ grossProfit: null })]);
      expect((opt.title as { text?: string }).text).toContain('Revenue');
    });

    it('renders with gross profit overlay when at least one row has it', () => {
      const opt = service.buildRevenueChart([income({}), income({ fiscalDateEnding: '2023-12-31' })]);
      expect(opt.series).toBeDefined();
    });
  });

  describe('buildBalanceSheetChart', () => {
    it('renders sorted by date with assets/liabilities/equity series', () => {
      const opt = service.buildBalanceSheetChart([
        balance({ fiscalDateEnding: '2023-12-31' }),
        balance({ fiscalDateEnding: '2024-12-31' }),
        balance({ fiscalDateEnding: '2022-12-31' }),
      ]);
      const series = opt.series as { name: string }[];
      expect(series.length).toBeGreaterThanOrEqual(2);
      invokeAxisFormatter(opt, 0); // exercise small-value branch (returns "$0")
    });
  });

  describe('buildCashFlowChart', () => {
    it('renders cash flow series', () => {
      const opt = service.buildCashFlowChart([cash({ fiscalDateEnding: '2023-12-31' }), cash({})]);
      expect((opt.title as { text?: string }).text).toContain('Cash Flow');
    });

    it('formats negative values correctly via formatLargeNumber', () => {
      const opt = service.buildCashFlowChart([cash({ operatingCashFlow: -1_500_000_000 })]);
      const html = invokeTooltip(opt, [{ name: '2024', seriesName: 'OCF', value: -1_500_000_000, color: '#fff' }]);
      expect(html).toContain('-');
    });
  });

  describe('buildDebtChart', () => {
    it('renders debt series with sorted data', () => {
      const opt = service.buildDebtChart([
        balance({ fiscalDateEnding: '2023-12-31' }),
        balance({ fiscalDateEnding: '2022-12-31' }),
      ]);
      expect((opt.title as { text?: string }).text).toContain('Debt');
    });
  });

  describe('formatLargeNumber via tooltip (null & K-range branches)', () => {
    it('renders N/A for null and K-suffix for thousands', () => {
      const opt = service.buildCashFlowChart([cash({})]);
      const nullCase = invokeTooltip(opt, [{ name: '2024', seriesName: 'X', value: null, color: '#fff' }]);
      expect(nullCase).toContain('N/A');
      const kCase = invokeTooltip(opt, [{ name: '2024', seriesName: 'X', value: 25_000, color: '#fff' }]);
      expect(kCase).toContain('K');
    });
  });

  describe('non-USD currency branch', () => {
    it('reflects reportedCurrency in chart title when not USD', () => {
      // The service tracks `currentCurrency` internally; the income statement
      // chart pulls the currency suffix via getCurrencyLabel(). To exercise it
      // we have to invoke a builder that sets currentCurrency. The service
      // never publicly exposes the setter, so we mutate the private field —
      // this is the same pattern the chart-data integration uses at runtime.
      (service as unknown as { currentCurrency: string }).currentCurrency = 'TWD';
      const opt = service.buildIncomeStatementChart([income({ reportedCurrency: 'TWD' })]);
      expect((opt.title as { text?: string }).text).toContain('TWD');
      // Axis formatter prefixes currency code (no $ symbol)
      expect(invokeAxisFormatter(opt, 1e9)).toContain('TWD');
    });

    it('quarterly date formatting uses month abbreviation', () => {
      (service as unknown as { currentIsAnnual: boolean }).currentIsAnnual = false;
      const opt = service.buildIncomeStatementChart([income({ fiscalDateEnding: '2024-03-31' })]);
      const xAxis = (Array.isArray(opt.xAxis) ? opt.xAxis[0] : opt.xAxis) as { data?: string[] };
      expect(xAxis.data?.[0]).toMatch(/\w{3} 2024/);
    });
  });
});
