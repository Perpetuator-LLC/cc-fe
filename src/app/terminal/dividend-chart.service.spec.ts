// Copyright (c) 2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { DividendChartService } from './dividend-chart.service';
import { DividendAnalysisData, DividendYearData } from './dividend.service';
import { EChartsOption } from 'echarts';

function yearData(over: Partial<DividendYearData> = {}): DividendYearData {
  return {
    year: '2024',
    fiscalDateEnding: '2024-12-31',
    dividendPayout: -10_000_000_000,
    operatingCashFlow: 50_000_000_000,
    freeCashFlow: 30_000_000_000,
    netIncome: 25_000_000_000,
    fcfPayoutRatio: 0.33,
    netIncomePayoutRatio: 0.4,
    ...over,
  };
}

function analysis(over: Partial<DividendAnalysisData> = {}): DividendAnalysisData {
  return {
    symbol: 'AAPL',
    metrics: {
      currentPrice: 200,
      dividendYield: 0.005,
      annualDividend: 1,
      ttmPayoutRatio: 0.15,
      ttmFcfPayoutRatio: 0.18,
      dividendCagr5Year: 0.05,
      dividendCagr10Year: 0.06,
      fcfCagr5Year: 0.07,
      fcfCagr10Year: 0.08,
    },
    yearlyData: [
      yearData({ year: '2022' }),
      yearData({ year: '2023', dividendPayout: null, freeCashFlow: null, fcfPayoutRatio: null }),
      yearData({ year: '2024' }),
    ],
    ...over,
  };
}

function tooltipFn(opt: EChartsOption): (p: unknown) => string {
  const tt = opt.tooltip as { formatter: (p: unknown) => string };
  return tt.formatter;
}

describe('DividendChartService', () => {
  let service: DividendChartService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [DividendChartService] });
    service = TestBed.inject(DividendChartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('formatCurrency', () => {
    it('returns N/A for null', () => {
      expect(service.formatCurrency(null)).toBe('N/A');
    });

    it('formats billions/millions/units correctly', () => {
      expect(service.formatCurrency(2_500_000_000)).toBe('$2.50B');
      expect(service.formatCurrency(3_750_000)).toBe('$3.75M');
      expect(service.formatCurrency(42)).toBe('$42.00');
    });

    it('handles negative values via Math.abs threshold check', () => {
      expect(service.formatCurrency(-1_500_000_000)).toBe('$-1.50B');
    });
  });

  describe('formatPercent', () => {
    it('returns N/A for null', () => {
      expect(service.formatPercent(null)).toBe('N/A');
    });

    it('formats with one decimal place', () => {
      expect(service.formatPercent(33.45)).toBe('33.5%');
      expect(service.formatPercent(0)).toBe('0.0%');
    });
  });

  describe('buildFcfPayoutRatioChart', () => {
    it('renders both payout ratio series with formatters', () => {
      const opt = service.buildFcfPayoutRatioChart(analysis());
      expect((opt.title as { text?: string }).text).toContain('Payout Ratios');

      const series = opt.series as { name: string; data: unknown[] }[];
      expect(series.map((s) => s.name)).toEqual(['FCF Payout Ratio', 'Net Income Payout Ratio']);
      // The middle row has null ratios -> null entries
      expect(series[0].data[1]).toBeNull();

      const tip = tooltipFn(opt);
      expect(tip([])).toBe('');
      const html = tip([
        { axisValue: '2024', seriesName: 'FCF Payout Ratio', value: 33, color: '#fff' },
        { axisValue: '2024', seriesName: 'Net Income Payout Ratio', value: null as unknown as number, color: '#fff' },
      ]);
      expect(html).toContain('FCF Payout Ratio');
      // Null values are skipped
      expect(html).not.toContain('Net Income Payout Ratio:');
    });
  });

  describe('buildYearlyDividendsChart', () => {
    it('renders absolute dividend values in billions', () => {
      const opt = service.buildYearlyDividendsChart(analysis());
      const series = opt.series as { data: number[] }[];
      // Dividend payouts are negative; chart uses Math.abs/1e9
      expect(series[0].data[0]).toBeCloseTo(10);
      // Null payout -> 0
      expect(series[0].data[1]).toBe(0);

      const tip = tooltipFn(opt);
      expect(tip([])).toBe('');
      expect(tip([{ axisValue: '2024', value: 10 }])).toContain('10.00B');
    });
  });

  describe('buildCashFlowComparisonChart', () => {
    it('renders 2 series by default (FCF, Dividends)', () => {
      const opt = service.buildCashFlowComparisonChart(analysis());
      const series = opt.series as { name: string }[];
      expect(series.length).toBe(2);
      expect(series.map((s) => s.name)).toEqual(['Free Cash Flow', 'Dividend Payouts']);
    });

    it('renders 3 series when showOperatingCashFlow is true (OCF first)', () => {
      const opt = service.buildCashFlowComparisonChart(analysis(), true);
      const series = opt.series as { name: string }[];
      expect(series.length).toBe(3);
      expect(series[0].name).toBe('Operating Cash Flow');
    });

    it('tooltip formats values as $B', () => {
      const opt = service.buildCashFlowComparisonChart(analysis());
      const tip = tooltipFn(opt);
      expect(tip([])).toBe('');
      expect(
        tip([
          { axisValue: '2024', seriesName: 'Free Cash Flow', value: 30, color: '#fff' },
          { axisValue: '2024', seriesName: 'Dividend Payouts', value: 10, color: '#fff' },
        ]),
      ).toContain('30.00B');
    });
  });
});
