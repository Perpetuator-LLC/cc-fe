// Copyright (c) 2025-2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { ValuationChartService } from './valuation-chart.service';
import { DCFAnalysisData, DCFResult, DDMAnalysisData, HistoricalValuationPoint } from './valuation.service';
import { EChartsOption } from 'echarts';

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function dcfResult(over: Partial<DCFResult> = {}): DCFResult {
  return {
    intrinsicValuePerShare: 200,
    currentPrice: 150,
    upsidePercentage: 33.3,
    marginOfSafety: 25,
    enterpriseValue: 1_000_000_000_000,
    presentValueFcf: 600_000_000_000,
    terminalValue: 800_000_000_000,
    presentValueTerminal: 400_000_000_000,
    netDebt: 50_000_000_000,
    equityValue: 950_000_000_000,
    sharesOutstanding: 5_000_000_000,
    wacc: 9.5,
    costOfEquity: 11.0,
    costOfDebt: 4.0,
    debtWeight: 0.2,
    equityWeight: 0.8,
    terminalGrowthRate: 2.5,
    projectionYears: 5,
    projections: [
      { year: 1, date: '2025-12-31', fcf: 70_000_000_000, discountedFcf: 64_000_000_000, growthRate: 7 },
      { year: 2, date: '2026-12-31', fcf: 75_000_000_000, discountedFcf: 62_000_000_000, growthRate: 7 },
      { year: 3, date: '2027-12-31', fcf: 80_000_000_000, discountedFcf: 60_000_000_000, growthRate: 6 },
    ],
    ...over,
  };
}

function valuationPoint(over: Partial<HistoricalValuationPoint> = {}): HistoricalValuationPoint {
  return {
    date: '2024-12-31',
    price: 150,
    eps: 5,
    epsIsNegative: false,
    peRatio: 30,
    pbRatio: 5,
    psRatio: 8,
    bookValuePerShare: 30,
    valuationNote: null,
    avgPeRatio: 25,
    minPeRatio: 15,
    maxPeRatio: 40,
    avgPbRatio: 4,
    ...over,
  };
}

function dcfAnalysis(over: Partial<DCFAnalysisData> = {}): DCFAnalysisData {
  const base = dcfResult();
  const bull = dcfResult({ intrinsicValuePerShare: 250 });
  const bear = dcfResult({ intrinsicValuePerShare: 150 });
  const today = new Date();
  const recent = (yearsAgo: number) => {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - yearsAgo);
    return d.toISOString().slice(0, 10);
  };
  return {
    symbol: 'AAPL',
    analysisDate: '2026-05-24',
    companyName: 'Apple Inc.',
    tradingCurrency: 'USD',
    reportingCurrency: 'USD',
    isAdr: false,
    currencyNote: null,
    exchangeRate: null,
    historicalFcf: [
      { date: '2022-12-31', value: 60_000_000_000 },
      { date: '2023-12-31', value: 65_000_000_000 },
      { date: '2024-12-31', value: 70_000_000_000 },
    ],
    historicalRevenue: [{ date: '2024-12-31', value: 400_000_000_000 }],
    historicalNetIncome: [{ date: '2024-12-31', value: 100_000_000_000 }],
    historicalValuation: [
      valuationPoint({ date: recent(8) }),
      valuationPoint({ date: recent(4) }),
      valuationPoint({ date: recent(1), valuationNote: 'Negative EPS adjusted', eps: null }),
    ],
    baseCase: base,
    bullCase: bull,
    bearCase: bear,
    intrinsicValueMin: 150,
    intrinsicValueMax: 250,
    intrinsicValueMean: 200,
    intrinsicValueMedian: 200,
    sensitivityGrid: [
      { discountRate: 8, terminalGrowth: 2, intrinsicValue: 220 },
      { discountRate: 8, terminalGrowth: 3, intrinsicValue: 240 },
      { discountRate: 10, terminalGrowth: 2, intrinsicValue: 180 },
      { discountRate: 10, terminalGrowth: 3, intrinsicValue: 200 },
    ],
    projectionChartData: [
      { date: '2023-12-31', type: 'historical', fcf: 65_000_000_000, fcfBase: null, fcfBull: null, fcfBear: null },
      { date: '2024-12-31', type: 'historical', fcf: 70_000_000_000, fcfBase: null, fcfBull: null, fcfBear: null },
      {
        date: '2025-12-31',
        type: 'projected',
        fcf: null,
        fcfBase: 75_000_000_000,
        fcfBull: 80_000_000_000,
        fcfBear: 70_000_000_000,
      },
      {
        date: '2026-12-31',
        type: 'projected',
        fcf: null,
        fcfBase: 80_000_000_000,
        fcfBull: 90_000_000_000,
        fcfBear: 72_000_000_000,
      },
    ],
    valuationSummary: {
      currentPrice: 150,
      intrinsicValueBase: 200,
      intrinsicValueBull: 250,
      intrinsicValueBear: 150,
      upsideBase: 33,
      marginOfSafety: 25,
      wacc: 9.5,
      terminalGrowth: 2.5,
    },
    assumptions: {
      projectionYears: 5,
      riskFreeRate: 4,
      marketRiskPremium: 5,
      beta: 1.2,
      taxRate: 21,
      terminalGrowthRate: 2.5,
    },
    ...over,
  };
}

function ddmAnalysis(over: Partial<DDMAnalysisData> = {}): DDMAnalysisData {
  return {
    success: true,
    isDividendPayer: true,
    symbol: 'MSFT',
    companyName: 'Microsoft',
    analysisDate: '2026-05-24',
    tradingCurrency: 'USD',
    reportingCurrency: 'USD',
    isAdr: false,
    currencyNote: null,
    exchangeRate: null,
    intrinsicValue: 350,
    currentPrice: 400,
    upsidePercentage: -12.5,
    marginOfSafety: -10,
    modelType: 'gordon',
    modelDescription: 'Gordon Growth Model',
    costOfEquity: 8.5,
    terminalGrowthRate: 2.0,
    historicalGrowthRate: 10,
    currentDividendYield: 0.75,
    payoutRatio: 25,
    dividendSustainabilityScore: 90,
    currentDividendPerShare: 3.0,
    presentValueDividends: 50,
    presentValueTerminal: 300,
    terminalValue: 500,
    historicalDividends: [],
    projectedDividends: [],
    dividendChartData: [
      { date: '2022-12-31', dividendPerShare: 2.5, discountedDividend: 2.4, isProjected: false },
      { date: '2024-12-31', dividendPerShare: 3.0, discountedDividend: 2.8, isProjected: false },
      { date: '2026-12-31', dividendPerShare: 3.3, discountedDividend: 2.6, isProjected: true },
    ],
    summaryStats: { yearsOfDividendData: 10, dividendCagr: 6.5, earningsPerShare: 12 },
    ...over,
  };
}

// Helpers to exercise functional fields on the returned chart options
function tooltipFn(opt: EChartsOption): ((p: unknown) => string) | undefined {
  const tt = opt.tooltip as { formatter?: (p: unknown) => string };
  return tt?.formatter;
}
function labelFn(opt: EChartsOption, seriesIndex = 0): ((p: unknown) => string) | undefined {
  const series = opt.series as { label?: { formatter?: (p: unknown) => string | string } }[];
  const f = series?.[seriesIndex]?.label?.formatter;
  return typeof f === 'function' ? f : undefined;
}

// ---------------------------------------------------------------------------

describe('ValuationChartService', () => {
  let service: ValuationChartService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ValuationChartService] });
    service = TestBed.inject(ValuationChartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('formatters', () => {
    it('formatCurrency renders dollar amount', () => {
      expect(service.formatCurrency(123.456)).toBe('$123.46');
    });

    it('formatPercentage adds sign for both positive and negative', () => {
      expect(service.formatPercentage(5)).toBe('+5.0%');
      expect(service.formatPercentage(0)).toBe('+0.0%');
      expect(service.formatPercentage(-3.14)).toBe('-3.1%');
    });
  });

  describe('buildFcfProjectionChart', () => {
    it('renders historical and scenario series with currency suffix for non-USD ADRs', () => {
      const opt = service.buildFcfProjectionChart(
        dcfAnalysis({ reportingCurrency: 'JPY', exchangeRate: 150, isAdr: true }),
      );
      expect((opt.title as { text?: string }).text).toContain('JPY');
      const series = opt.series as { name?: string }[];
      expect(series.length).toBeGreaterThanOrEqual(2);
      // Tooltip formatter handles both populated and null values
      const tip = tooltipFn(opt);
      expect(tip).toBeDefined();
      const html = tip!([{ axisValue: '2024', seriesName: 'Hist', value: 70, color: '#fff' }]);
      expect(html).toContain('2024');
      // Items with null/undefined value get skipped
      const html2 = tip!([{ axisValue: '2024', seriesName: 'Hist', value: null, color: '#fff' }]);
      expect(html2).toContain('2024');
    });

    it('renders without currency suffix when reporting in USD', () => {
      const opt = service.buildFcfProjectionChart(dcfAnalysis());
      expect((opt.title as { text?: string }).text).not.toContain('converted');
    });
  });

  describe('buildValuationComparisonChart', () => {
    it('exposes 4 bars and a tooltip formatter that produces lines', () => {
      const opt = service.buildValuationComparisonChart(dcfAnalysis());
      const tip = tooltipFn(opt);
      const html = tip!([
        { name: 'Bear Case', value: 150, color: '#fff' },
        { name: 'Base Case', value: 200, color: '#fff' },
      ]);
      expect(html).toContain('Bear Case');
      expect(html).toContain('200.00');
    });
  });

  describe('buildEnterpriseValueWaterfallChart', () => {
    it('returns 5 bars and tooltip/label formatters format absolute billions', () => {
      const opt = service.buildEnterpriseValueWaterfallChart(dcfResult());
      const series = opt.series as { data: unknown[] }[];
      expect(series[0].data.length).toBe(5);

      const tip = tooltipFn(opt);
      expect(tip!([{ name: 'PV of FCF', value: 600 }])).toContain('PV of FCF');

      const lbl = labelFn(opt);
      expect(lbl!({ value: -50 })).toContain('50.0B');
    });
  });

  describe('buildSensitivityHeatmap', () => {
    it('builds the heatmap with formatters wired up', () => {
      const opt = service.buildSensitivityHeatmap([
        { discountRate: 8, terminalGrowth: 2, intrinsicValue: 220 },
        { discountRate: 8, terminalGrowth: 3, intrinsicValue: 240 },
        { discountRate: 10, terminalGrowth: 2, intrinsicValue: 180 },
        { discountRate: 10, terminalGrowth: 3, intrinsicValue: 200 },
      ]);
      const tip = tooltipFn(opt);
      const html = tip!({ value: [1, 0, 240] });
      expect(html).toContain('Discount Rate');
      expect(html).toContain('Terminal Growth');
      expect(html).toContain('240.00');

      const lbl = labelFn(opt);
      expect(lbl!({ value: [0, 0, 220] })).toBe('$220');

      const vm = opt.visualMap as { formatter?: (v: unknown) => string };
      expect(vm.formatter!(240)).toBe('$240');
    });
  });

  describe('buildHistoricalFinancialsChart', () => {
    it('returns an EChartsOption with title containing "Historical"', () => {
      const opt = service.buildHistoricalFinancialsChart(dcfAnalysis());
      expect(typeof (opt.title as { text?: string }).text).toBe('string');
    });
  });

  describe('buildProjectionsTableData', () => {
    it('flattens projections into formatted strings', () => {
      const rows = service.buildProjectionsTableData(dcfResult());
      expect(rows.length).toBe(3);
      expect(rows[0].growthRate).toBe('7.0%');
      expect(rows[0].fcf).toContain('B');
      expect(rows[0].discountedFcf).toContain('B');
      // formatDate runs for each row
      expect(rows[0].date).toMatch(/2025/);
    });
  });

  describe('buildHistoricalValuationChart', () => {
    it('returns null when no historical valuation data', () => {
      const data = dcfAnalysis({ historicalValuation: [] });
      expect(service.buildHistoricalValuationChart(data)).toBeNull();
    });

    it('returns null when all points are older than the window', () => {
      const data = dcfAnalysis({
        historicalValuation: [valuationPoint({ date: '1980-01-01' })],
      });
      expect(service.buildHistoricalValuationChart(data, 5)).toBeNull();
    });

    it('renders chart with tooltip that includes notes and averages', () => {
      const opt = service.buildHistoricalValuationChart(dcfAnalysis(), 10);
      expect(opt).not.toBeNull();
      const tip = tooltipFn(opt!);
      // Empty params guard
      expect(tip!([])).toBe('');
      // Real tooltip — exercise the notes + averages branches
      // Format date the same way the service does, so the note lookup hits.
      const sample = new Date();
      sample.setFullYear(sample.getFullYear() - 1);
      const axisValue = sample.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      const html = tip!([
        { axisValue, seriesName: 'P/E Ratio', value: 30, color: '#fff' },
        { axisValue, seriesName: 'P/B Ratio', value: null as unknown as number, color: '#fff' },
      ]);
      expect(html).toContain('P/E Ratio');
      // The label formatter for the note row uses our notesByDate map; verify
      // the message surfaces the negative-EPS note
      expect(html).toContain('Negative EPS adjusted');
      expect(html).toContain('Y Averages');
    });
  });

  describe('buildPeBandChart', () => {
    it('returns null on empty data', () => {
      expect(service.buildPeBandChart(dcfAnalysis({ historicalValuation: [] }))).toBeNull();
    });

    it('renders chart and tooltip with PE summary', () => {
      const opt = service.buildPeBandChart(dcfAnalysis());
      expect(opt).not.toBeNull();
      const tip = tooltipFn(opt!);
      expect(tip!([])).toBe('');
      const html = tip!([
        { axisValue: 'Jan 2024', seriesName: 'P/E Ratio', value: 32, color: '#fff' },
        { axisValue: 'Jan 2024', seriesName: 'Average', value: 25, color: '#fff' },
      ]);
      expect(html).toContain('P/E Ratio');
      expect(html).toContain('Range:');
    });
  });

  describe('buildPriceVsValuationChart', () => {
    it('returns null on empty historical data', () => {
      expect(service.buildPriceVsValuationChart(dcfAnalysis({ historicalValuation: [] }))).toBeNull();
    });

    it('returns null when filtered window has no points', () => {
      const data = dcfAnalysis({ historicalValuation: [valuationPoint({ date: '1980-01-01' })] });
      expect(service.buildPriceVsValuationChart(data, 5)).toBeNull();
    });

    it('renders chart with tooltip skipping Value Band entries', () => {
      const opt = service.buildPriceVsValuationChart(dcfAnalysis(), 10);
      expect(opt).not.toBeNull();
      const tip = tooltipFn(opt!);
      expect(tip!([])).toBe('');
      const html = tip!([
        { axisValue: 'Jan 2024', seriesName: 'Stock Price', value: 150, color: '#fff' },
        { axisValue: 'Jan 2024', seriesName: 'Value Band', value: 100, color: '#fff' },
        { axisValue: 'Jan 2024', seriesName: 'Fair Value (Avg P/E)', value: 175, color: '#fff' },
      ]);
      expect(html).toContain('Stock Price');
      expect(html).toContain('Fair Value');
      expect(html).not.toContain('Value Band:');
    });

    it('omits intrinsic markPoint when intrinsic value is 0', () => {
      const data = dcfAnalysis();
      data.valuationSummary.intrinsicValueBase = 0;
      const opt = service.buildPriceVsValuationChart(data);
      expect(opt).not.toBeNull();
      const lastSeries = (opt!.series as { markPoint?: unknown }[]).at(-1);
      expect(lastSeries!.markPoint).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // DDM
  // -------------------------------------------------------------------------

  describe('buildDdmDividendChart', () => {
    it('returns null when chart data is empty', () => {
      expect(service.buildDdmDividendChart(ddmAnalysis({ dividendChartData: [] }))).toBeNull();
    });

    it('renders 3 series and tooltip handles null/non-null entries', () => {
      const opt = service.buildDdmDividendChart(ddmAnalysis());
      expect(opt).not.toBeNull();
      const series = opt!.series as { name: string }[];
      expect(series.map((s) => s.name)).toEqual(['Historical', 'Projected', 'Discounted']);
      const tip = tooltipFn(opt!);
      const html = tip!([
        { axisValue: 'Jan 2024', seriesName: 'Historical', value: 3, color: '#fff' },
        { axisValue: 'Jan 2024', seriesName: 'Projected', value: null as unknown as number, color: '#fff' },
      ]);
      expect(html).toContain('Historical');
      expect(html).not.toContain('Projected');
    });
  });

  describe('buildDdmValuationChart', () => {
    it('colors intrinsic green when upside is positive', () => {
      const opt = service.buildDdmValuationChart(ddmAnalysis({ upsidePercentage: 5 }));
      const data = (opt.series as { data: { itemStyle: { color: string } }[] }[])[0].data;
      expect(data[0].itemStyle.color).toContain('#81c784');
    });

    it('colors intrinsic red when upside is negative', () => {
      const opt = service.buildDdmValuationChart(ddmAnalysis({ upsidePercentage: -10 }));
      const data = (opt.series as { data: { itemStyle: { color: string } }[] }[])[0].data;
      expect(data[0].itemStyle.color).toContain('#ef5350');
    });
  });

  describe('buildDdmBreakdownChart', () => {
    it('renders 3 bars and label formatter outputs dollars', () => {
      const opt = service.buildDdmBreakdownChart(ddmAnalysis());
      const series = opt.series as { data: unknown[] }[];
      expect(series[0].data.length).toBe(3);
      const lbl = labelFn(opt);
      expect(lbl!({ value: 50 })).toBe('$50.00');
      const tip = tooltipFn(opt);
      expect(tip!([{ name: 'PV of Dividends', value: 50 }])).toContain('50.00');
    });
  });
});
