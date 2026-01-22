// Copyright (c) 2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { ChartConfigService } from './chart-config.service';
import { ChartCandle } from './chart-data.service';
import { EChartsOption, SeriesOption } from 'echarts';

// Type for series with markArea/markLine (ECharts doesn't export these fully typed)
interface CandlestickSeriesWithMarkers {
  type: string;
  markArea?: {
    data: unknown[];
    itemStyle?: { color: string };
  };
  markLine?: {
    data: unknown[];
  };
}

describe('ChartConfigService', () => {
  let service: ChartConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ChartConfigService],
    });
    service = TestBed.inject(ChartConfigService);
  });

  describe('basic functionality', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have useLocalTime signal defaulting to false', () => {
      expect(service.useLocalTime()).toBeFalse();
    });
  });

  describe('axis label formatting with ET suffix', () => {
    it('should add ET suffix for exchange time on intraday charts', () => {
      service.useLocalTime.set(false);

      const candles: ChartCandle[] = [
        createMockCandle('2026-01-08T14:30:00.000Z'), // 9:30 AM ET
        createMockCandle('2026-01-08T15:00:00.000Z'), // 10:00 AM ET
      ];

      const options = service.buildChartFromCandles(candles, 'MSFT', '30min', {});

      // Get the formatted axis labels from the xAxis data
      const xAxisData = getXAxisData(options);

      // Should have ET suffix for exchange time
      expect(xAxisData[0]).toContain('ET');
    });

    it('should NOT add ET suffix for local time on intraday charts', () => {
      service.useLocalTime.set(true);

      const candles: ChartCandle[] = [
        createMockCandle('2026-01-08T14:30:00.000Z'),
        createMockCandle('2026-01-08T15:00:00.000Z'),
      ];

      const options = service.buildChartFromCandles(candles, 'MSFT', '30min', {});

      const xAxisData = getXAxisData(options);

      // Should NOT have ET suffix for local time
      expect(xAxisData[0]).not.toContain('ET');
    });

    it('should NOT add ET suffix for daily charts', () => {
      service.useLocalTime.set(false);

      const candles: ChartCandle[] = [
        createMockCandle('2026-01-06T00:00:00.000Z'),
        createMockCandle('2026-01-07T00:00:00.000Z'),
        createMockCandle('2026-01-08T00:00:00.000Z'),
      ];

      const options = service.buildChartFromCandles(candles, 'MSFT', 'daily', {});

      const xAxisData = getXAxisData(options);

      // Daily charts should show date, not time with ET
      expect(xAxisData[0]).not.toContain('ET');
      expect(xAxisData[0]).toContain('Jan');
    });
  });

  describe('daily chart timezone handling', () => {
    // This test captures a regression where daily candles with UTC midnight dates
    // were being displayed as the previous day when formatted in local time.
    // Example: "2026-01-20T00:00:00.000Z" should show "Jan 20", not "Jan 19"

    it('should display correct date for UTC midnight daily candles (timezone regression test)', () => {
      // Simulate MA daily data from backend - dates are midnight UTC
      // These represent trading days Jan 17, 20, 21 2026
      const candles: ChartCandle[] = [
        createMockCandle('2026-01-17T00:00:00.000Z'), // Friday Jan 17
        createMockCandle('2026-01-20T00:00:00.000Z'), // Monday Jan 20 (MLK Day - market closed, but simulating)
        createMockCandle('2026-01-21T00:00:00.000Z'), // Tuesday Jan 21
      ];

      const options = service.buildChartFromCandles(candles, 'MA', 'daily', {});
      const xAxisData = getXAxisData(options);

      // The axis labels should match the date portion of the ISO string,
      // NOT be shifted by timezone conversion
      expect(xAxisData.length).toBe(3);

      // Jan 17 (2026-01-17T00:00:00.000Z) should display as "Jan 17", NOT "Jan 16"
      expect(xAxisData[0]).toContain('17');
      expect(xAxisData[0]).toContain('Jan');

      // Jan 20 (2026-01-20T00:00:00.000Z) should display as "Jan 20", NOT "Jan 19"
      expect(xAxisData[1]).toContain('20');
      expect(xAxisData[1]).toContain('Jan');

      // Jan 21 (2026-01-21T00:00:00.000Z) should display as "Jan 21", NOT "Jan 20"
      expect(xAxisData[2]).toContain('21');
      expect(xAxisData[2]).toContain('Jan');
    });

    it('should handle daily data regardless of local timezone', () => {
      // This test verifies that daily chart dates are stable across timezones
      // The backend sends dates as midnight UTC representing the trading day
      const candles: ChartCandle[] = [
        createMockCandle('2026-01-15T00:00:00.000Z'), // Jan 15
        createMockCandle('2026-01-16T00:00:00.000Z'), // Jan 16
      ];

      const options = service.buildChartFromCandles(candles, 'AAPL', 'daily', {});
      const xAxisData = getXAxisData(options);

      // Dates should be extracted from the ISO string, not converted through Date object
      // which would shift them based on local timezone
      expect(xAxisData[0]).toMatch(/Jan\s+15/);
      expect(xAxisData[1]).toMatch(/Jan\s+16/);
    });
  });

  describe('extended hours markArea', () => {
    it('should generate markAreas for extended hours candles', () => {
      const candles: ChartCandle[] = [
        createMockCandle('2026-01-08T14:30:00.000Z', { isExtendedHours: false }), // 9:30 AM ET - regular
        createMockCandle('2026-01-08T21:00:00.000Z', { isExtendedHours: true }), // 4:00 PM ET - extended
        createMockCandle('2026-01-08T21:30:00.000Z', { isExtendedHours: true }), // 4:30 PM ET - extended
      ];

      const options = service.buildChartFromCandles(candles, 'MSFT', '30min', {
        showExtendedHoursBackground: true,
      });

      // Check that markArea is present in series
      const series = options.series as CandlestickSeriesWithMarkers[];
      const candlestickSeries = series.find((s) => s.type === 'candlestick');

      expect(candlestickSeries).toBeDefined();
      expect(candlestickSeries!.markArea).toBeDefined();
      expect(candlestickSeries!.markArea!.data.length).toBeGreaterThan(0);
    });

    it('should NOT generate markAreas when showExtendedHoursBackground is false', () => {
      const candles: ChartCandle[] = [
        createMockCandle('2026-01-08T14:30:00.000Z', { isExtendedHours: false }),
        createMockCandle('2026-01-08T21:00:00.000Z', { isExtendedHours: true }),
      ];

      const options = service.buildChartFromCandles(candles, 'MSFT', '30min', {
        showExtendedHoursBackground: false,
      });

      const series = options.series as CandlestickSeriesWithMarkers[];
      const candlestickSeries = series.find((s) => s.type === 'candlestick');

      expect(candlestickSeries!.markArea).toBeUndefined();
    });

    it('should have correct markArea itemStyle color', () => {
      const candles: ChartCandle[] = [
        createMockCandle('2026-01-08T21:00:00.000Z', { isExtendedHours: true }),
        createMockCandle('2026-01-08T21:30:00.000Z', { isExtendedHours: true }),
      ];

      const options = service.buildChartFromCandles(candles, 'MSFT', '30min', {
        showExtendedHoursBackground: true,
      });

      const series = options.series as CandlestickSeriesWithMarkers[];
      const candlestickSeries = series.find((s) => s.type === 'candlestick');

      expect(candlestickSeries!.markArea!.itemStyle).toBeDefined();
      expect(candlestickSeries!.markArea!.itemStyle!.color).toContain('rgba');
    });
  });

  describe('isExtendedHoursCandle detection', () => {
    it('should detect extended hours from backend field', () => {
      const candle = createMockCandle('2026-01-08T21:00:00.000Z', { isExtendedHours: true });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isExtended = (service as any).isExtendedHoursCandle(candle);

      expect(isExtended).toBeTrue();
    });

    it('should return false for regular hours', () => {
      const candle = createMockCandle('2026-01-08T15:00:00.000Z', { isExtendedHours: false });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isExtended = (service as any).isExtendedHoursCandle(candle);

      expect(isExtended).toBeFalse();
    });
  });

  describe('volume chart', () => {
    it('should include volume series when showVolume is true', () => {
      const candles: ChartCandle[] = [
        createMockCandle('2026-01-08T14:30:00.000Z', { volume: 1000000 }),
        createMockCandle('2026-01-08T15:00:00.000Z', { volume: 1500000 }),
      ];

      const options = service.buildChartFromCandles(candles, 'MSFT', '30min', {
        showVolume: true,
      });

      const series = options.series as SeriesOption[];
      const volumeSeries = series.find((s) => s.type === 'bar');

      expect(volumeSeries).toBeDefined();
    });

    it('should NOT include volume series when showVolume is false', () => {
      const candles: ChartCandle[] = [createMockCandle('2026-01-08T14:30:00.000Z', { volume: 1000000 })];

      const options = service.buildChartFromCandles(candles, 'MSFT', '30min', {
        showVolume: false,
      });

      const series = options.series as SeriesOption[];
      const volumeSeries = series.find((s) => s.type === 'bar');

      expect(volumeSeries).toBeUndefined();
    });
  });

  describe('corporate actions (splits/dividends)', () => {
    it('should include markLines for dividends when showCorporateActions is true', () => {
      const candles: ChartCandle[] = [
        createMockCandle('2026-01-06T00:00:00.000Z', { dividendAmount: 0 }),
        createMockCandle('2026-01-07T00:00:00.000Z', { dividendAmount: 0.91 }),
        createMockCandle('2026-01-08T00:00:00.000Z', { dividendAmount: 0 }),
      ];

      const options = service.buildChartFromCandles(candles, 'MSFT', 'daily', {
        showCorporateActions: true,
      });

      const series = options.series as CandlestickSeriesWithMarkers[];
      const candlestickSeries = series.find((s) => s.type === 'candlestick');

      expect(candlestickSeries!.markLine).toBeDefined();
      expect(candlestickSeries!.markLine!.data.length).toBeGreaterThan(0);
    });

    it('should NOT include markLines when showCorporateActions is false', () => {
      const candles: ChartCandle[] = [createMockCandle('2026-01-07T00:00:00.000Z', { dividendAmount: 0.91 })];

      const options = service.buildChartFromCandles(candles, 'MSFT', 'daily', {
        showCorporateActions: false,
      });

      const series = options.series as CandlestickSeriesWithMarkers[];
      const candlestickSeries = series.find((s) => s.type === 'candlestick');

      expect(candlestickSeries!.markLine).toBeUndefined();
    });
  });

  describe('lockToRight zoom behavior', () => {
    it('should have dataZoom configuration when lockToRight is true', () => {
      const candles: ChartCandle[] = [
        createMockCandle('2026-01-06T00:00:00.000Z'),
        createMockCandle('2026-01-07T00:00:00.000Z'),
        createMockCandle('2026-01-08T00:00:00.000Z'),
      ];

      const options = service.buildChartFromCandles(candles, 'MSFT', 'daily', {
        lockToRight: true,
      });

      const dataZoom = options.dataZoom as EChartsOption['dataZoom'];

      expect(dataZoom).toBeDefined();
      expect(Array.isArray(dataZoom)).toBeTrue();
      expect((dataZoom as unknown[]).length).toBeGreaterThan(0);
    });
  });
});

// Helper functions

function createMockCandle(dateStr: string, overrides: Partial<ChartCandle> = {}): ChartCandle {
  return {
    date: new Date(dateStr),
    open: 100,
    high: 105,
    low: 98,
    close: 102,
    volume: 1000000,
    adjustedClose: 102,
    splitCoefficient: 1,
    dividendAmount: 0,
    isExtendedHours: false,
    ...overrides,
  };
}

function getXAxisData(options: EChartsOption): string[] {
  const xAxis = options.xAxis;
  if (Array.isArray(xAxis)) {
    // Find the one with data (usually the second one for volume charts)
    const axisWithLabels = xAxis.find((x) => x && typeof x === 'object' && 'axisLabel' in x && 'data' in x);
    return (axisWithLabels as { data?: string[] })?.data || [];
  }
  if (xAxis && typeof xAxis === 'object' && 'data' in xAxis) {
    return (xAxis as { data?: string[] }).data || [];
  }
  return [];
}
