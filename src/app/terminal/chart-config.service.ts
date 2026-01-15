// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, signal } from '@angular/core';
import { EChartsOption } from 'echarts';
import { ChartCandle } from './chart-data.service';

// Re-export for convenience
export { ChartCandle };

/**
 * Tooltip parameter interface
 */
export interface EChartsTooltipParam {
  name?: string;
  data?: number[];
  seriesName?: string;
  color?: string;
}

/**
 * Timezone setting for chart display
 */
export type ChartTimezone = 'local' | 'exchange';

/**
 * Shared service for chart configuration and theming.
 * This is the SINGLE SOURCE OF TRUTH for all chart styling.
 * Both command results (backend chartOptions) and locally-built charts
 * should go through this service for consistent appearance.
 */
@Injectable({
  providedIn: 'root',
})
export class ChartConfigService {
  // ============================================================================
  // TIMEZONE CONFIGURATION
  // ============================================================================

  /** Whether to use local time (true) or exchange time/EST (false) */
  useLocalTime = signal(false); // Default: Exchange Time (showLocalTime: false → show times in ET)

  // Debug counter for axis label logging
  private _axisLabelLogCount = 0;

  // ============================================================================
  // CANONICAL CHART COLORS - Use these everywhere for consistency
  // ============================================================================

  /** Candlestick color for price going UP (close > open) */
  readonly CANDLE_UP_COLOR = '#26a69a';
  /** Candlestick color for price going DOWN (close < open) */
  readonly CANDLE_DOWN_COLOR = '#ef5350';
  /** Crosshair line color - WHITE for visibility against dark background */
  readonly CROSSHAIR_COLOR = '#ffffff';
  /** Crosshair label background */
  readonly CROSSHAIR_LABEL_BG = '#505050';
  /** Axis line color */
  readonly AXIS_LINE_COLOR = '#505050';
  /** Axis label color */
  readonly AXIS_LABEL_COLOR = '#a0a0a0';
  /** Grid line color */
  readonly GRID_LINE_COLOR = '#353535';
  /** Text color */
  readonly TEXT_COLOR = '#c0c0c0';

  // ============================================================================
  // THEME DEFAULTS
  // ============================================================================

  // Default dark theme options for charts
  private readonly darkThemeDefaults: Partial<EChartsOption> = {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 500,
    animationDurationUpdate: 0, // Disable animation for updates (zoom, etc.)
    textStyle: {
      color: this.TEXT_COLOR,
    },
    // Tight grid margins to maximize chart area; yAxis on right
    grid: {
      left: 8,
      right: 60, // Space for yAxis labels on right
      top: 16,
      bottom: 32,
      containLabel: false,
      backgroundColor: 'transparent',
    },
    title: {
      show: false, // Hide title - we have our own header
    },
    legend: {
      show: false, // Hide legend - symbol is shown in header
    },
    tooltip: {
      show: false, // Disabled - we show OHLC data at the top via crosshair events
    },
    // Global axis pointer (crosshair) configuration - WHITE crosshairs
    axisPointer: {
      show: true,
      type: 'line',
      link: [{ xAxisIndex: 'all' }],
      animation: false, // Disable animation for instant crosshair response
      label: {
        show: true,
        backgroundColor: this.CROSSHAIR_LABEL_BG,
        color: '#fff',
      },
      lineStyle: {
        color: this.CROSSHAIR_COLOR,
        width: 1,
        type: 'dashed',
      },
    },
  };

  // Dark theme axis defaults
  private readonly darkAxisDefaults = {
    axisLine: {
      lineStyle: { color: this.AXIS_LINE_COLOR },
    },
    axisLabel: { color: this.AXIS_LABEL_COLOR },
    splitLine: {
      lineStyle: { color: this.GRID_LINE_COLOR },
    },
    splitArea: {
      show: false,
    },
  };

  // xAxis specific defaults for date formatting
  private readonly xAxisDateDefaults = {
    axisLabel: {
      color: this.AXIS_LABEL_COLOR,
      formatter: (value: string) => this.formatDateLabel(value),
    },
    // Axis pointer for x-axis - includes formatter for crosshair label
    axisPointer: {
      show: true,
      type: 'line',
      animation: false, // Disable animation for instant crosshair response
      label: {
        show: true,
        backgroundColor: this.CROSSHAIR_LABEL_BG,
        formatter: (params: { value: string }) => this.formatCrosshairDateLabel(params.value),
      },
      lineStyle: {
        color: this.CROSSHAIR_COLOR,
        type: 'dashed',
      },
    },
  };

  // yAxis specific defaults - position prices on right with axis pointer
  private readonly yAxisDefaults = {
    position: 'right',
    axisPointer: {
      show: true,
      type: 'line',
      animation: false, // Disable animation for instant crosshair response
      label: {
        show: true,
        backgroundColor: this.CROSSHAIR_LABEL_BG,
      },
      lineStyle: {
        color: this.CROSSHAIR_COLOR,
        type: 'dashed',
      },
    },
  };

  // Period display labels
  readonly periodLabels: Record<string, string> = {
    '1D': '1 Day',
    '5D': '5 Days',
    '1W': '1 Week',
    '2W': '2 Weeks',
    '1M': '1 Month',
    '3M': '3 Months',
    '6M': '6 Months',
    '1Y': '1 Year',
    '2Y': '2 Years',
    '5Y': '5 Years',
    '10Y': '10 Years',
    '20Y': '20 Years',
    MAX: 'Maximum',
  };

  // Interval display labels
  readonly intervalLabels: Record<string, string> = {
    '1min': '1 Min',
    '5min': '5 Min',
    '15min': '15 Min',
    '30min': '30 Min',
    '60min': '1 Hour',
    hourly: '1 Hour',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    MIN_1: '1 Min',
    MIN_5: '5 Min',
    MIN_15: '15 Min',
    MIN_30: '30 Min',
    MIN_60: '1 Hour',
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    MONTHLY: 'Monthly',
  };

  /**
   * Apply dark theme to chart options from backend or locally built.
   * This is the MAIN ENTRY POINT for theming - all charts should go through this.
   * It normalizes:
   * - Candlestick colors (backend uses different colors)
   * - Crosshair to white
   * - yAxis position to right
   * - DataZoom to inside only (no slider)
   * - Grid margins
   * - Animation settings
   */
  applyDarkTheme(options: EChartsOption): EChartsOption {
    if (typeof options !== 'object' || options === null) {
      console.error('[ChartConfigService] applyDarkTheme received non-object:', typeof options);
      return this.darkThemeDefaults as EChartsOption;
    }

    let merged = this.deepMerge(options, this.darkThemeDefaults);
    merged = this.applyAxisTheming(merged);
    merged = this.applyDataZoomConfig(merged);
    merged = this.normalizeCandlestickColors(merged);

    return merged;
  }

  /**
   * Normalize candlestick colors to our canonical colors.
   * Backend may send different colors (e.g., #00da3c, #ec0000).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizeCandlestickColors(options: any): any {
    if (!options.series) return options;

    const result = { ...options };
    result.series = options.series.map((series: unknown) => {
      const s = series as { type?: string; itemStyle?: Record<string, unknown> };
      if (s.type === 'candlestick') {
        return {
          ...s,
          itemStyle: {
            ...s.itemStyle,
            color: this.CANDLE_UP_COLOR,
            color0: this.CANDLE_DOWN_COLOR,
            borderColor: this.CANDLE_UP_COLOR,
            borderColor0: this.CANDLE_DOWN_COLOR,
          },
        };
      }
      return s;
    });

    return result;
  }

  /**
   * Build chart options from candle data.
   * This method creates a complete EChartsOption from raw candle data.
   * Used when loading data via ChartDataService (progressive loading).
   */

  buildChartFromCandles(
    candles: ChartCandle[],
    symbol: string,
    interval?: string,
    options?: {
      showCorporateActions?: boolean;
      lockToRight?: boolean;
      showVolume?: boolean;
      showExtendedHoursBackground?: boolean;
    },
  ): EChartsOption {
    // Reset debug counter for axis label logging
    this._axisLabelLogCount = 0;

    // DEBUG: Log all options with JSON.stringify for visibility in Chrome debug log
    console.log(
      '[ChartConfig] buildChartFromCandles:',
      JSON.stringify({
        symbol,
        interval,
        candleCount: candles.length,
        showCorporateActions: options?.showCorporateActions,
        lockToRight: options?.lockToRight,
        showVolume: options?.showVolume,
        showExtendedHoursBackground: options?.showExtendedHoursBackground,
        useLocalTime: this.useLocalTime(), // Log current timezone setting
      }),
    );

    // Ensure data is sorted oldest first for proper chart display
    const sortedCandles = [...candles].sort((a, b) => a.date.getTime() - b.date.getTime());

    // DEBUG: Check for corporate actions and extended hours data
    const splitsFound = sortedCandles.filter((c) => c.splitCoefficient && c.splitCoefficient !== 1.0).length;
    const dividendsFound = sortedCandles.filter((c) => c.dividendAmount && c.dividendAmount > 0).length;
    const extendedHoursFromBackend = sortedCandles.filter((c) => c.isExtendedHours === true).length;
    console.log(
      '[ChartConfig] Data analysis:',
      JSON.stringify({
        splitsFound,
        dividendsFound,
        extendedHoursFromBackend,
        sampleCandle: sortedCandles[0]
          ? {
              date: sortedCandles[0].date.toISOString(),
              splitCoefficient: sortedCandles[0].splitCoefficient,
              dividendAmount: sortedCandles[0].dividendAmount,
              isExtendedHours: sortedCandles[0].isExtendedHours,
            }
          : null,
      }),
    );

    // Determine if this is intraday data (needed for formatting)
    const isIntraday = interval
      ? interval.toLowerCase().includes('min') ||
        interval.toLowerCase().includes('hour') ||
        interval === '60min' ||
        interval === 'MIN_60' ||
        interval === 'MIN_30' ||
        interval === 'MIN_15' ||
        interval === 'MIN_5' ||
        interval === 'MIN_1'
      : false;

    // Store ISO dates for proper parsing in crosshair and axis labels
    const dates = sortedCandles.map((c) => c.date.toISOString());

    // Pre-format axis labels based on current timezone setting
    // This ensures labels are correct when chart is built, not relying on formatter callback
    const useLocal = this.useLocalTime();
    const timeZone = useLocal ? undefined : 'America/New_York';

    // Track the last date to detect day changes
    let lastDateStr = '';

    const formattedAxisLabels = sortedCandles.map((c) => {
      if (isIntraday) {
        // Get the date in the target timezone
        const dateOptions: Intl.DateTimeFormatOptions = {
          month: 'short',
          day: 'numeric',
          timeZone: timeZone || undefined,
        };
        const currentDateStr = c.date.toLocaleDateString('en-US', dateOptions);
        const isNewDay = currentDateStr !== lastDateStr;
        lastDateStr = currentDateStr;

        const timeLabel = c.date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone,
        });

        // For first candle of each day, show date + time
        // This helps users understand date context when zoomed out
        if (isNewDay) {
          return useLocal ? `${currentDateStr} ${timeLabel}` : `${currentDateStr} ${timeLabel} ET`;
        }
        // For other candles, just show time with optional ET suffix
        return useLocal ? timeLabel : `${timeLabel} ET`;
      } else {
        // For daily+, show date only (no time suffix needed)
        return c.date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'America/New_York', // Always use ET for daily dates
        });
      }
    });

    console.log(
      '[ChartConfig] Pre-formatted axis labels:',
      JSON.stringify({
        useLocal,
        timeZone: timeZone || 'local',
        sampleLabel: formattedAxisLabels[0],
        sampleDate: dates[0],
      }),
    );

    const ohlcData = sortedCandles.map((c) => [c.open, c.close, c.low, c.high]);

    // Volume data with color based on candle direction
    const volumeData = sortedCandles.map((c) => ({
      value: c.volume || 0,
      itemStyle: {
        color: c.close >= c.open ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)',
      },
    }));

    // Check if we have meaningful volume data
    const hasVolume = sortedCandles.some((c) => c.volume && c.volume > 0);
    const showVolume = hasVolume && (options?.showVolume ?? true); // Default to showing volume if data exists

    // Get the latest date for right-anchored zoom
    const latestDate = dates.length > 0 ? dates[dates.length - 1] : undefined;
    // Default to locked (lockToRight defaults to true in component)
    const lockToRight = options?.lockToRight ?? true;

    // Build mark lines for corporate actions (splits and dividends)
    const markLineData = options?.showCorporateActions ? this.buildCorporateActionMarkers(sortedCandles) : [];

    // Build markArea for extended hours background shading (only for intraday)
    // Only show if explicitly enabled (defaults to showing when intraday data has extended hours)
    const showExtendedHoursBackground = options?.showExtendedHoursBackground ?? isIntraday;
    const extendedHoursAreas = showExtendedHoursBackground ? this.buildExtendedHoursMarkAreas(sortedCandles) : [];

    // DEBUG: Log corporate actions and extended hours results
    console.log(
      '[ChartConfig] Markers generated:',
      JSON.stringify({
        showCorporateActions: options?.showCorporateActions,
        markLineCount: markLineData.length,
        showExtendedHoursBackground,
        extendedHoursAreasCount: extendedHoursAreas.length,
        isIntraday,
      }),
    );

    // Build dataZoom config based on lock state
    // When locked: use endValue with rangeMode to fix right edge
    // When unlocked: use start/end percentages for free scrolling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataZoomConfig: any = {
      type: 'inside',
      xAxisIndex: showVolume ? [0, 1] : [0], // Apply zoom to both x-axes when showing volume
      zoomOnMouseWheel: true,
      moveOnMouseMove: !lockToRight, // Disable panning when locked
      moveOnMouseWheel: false,
      throttle: 50,
      minValueSpan: 5,
    };

    if (lockToRight && latestDate) {
      // Fixed right edge mode: end is anchored to the latest data point
      dataZoomConfig.rangeMode = ['percent', 'value'];
      dataZoomConfig.start = 70; // Show last 30% initially
      dataZoomConfig.endValue = latestDate; // Fix right edge to latest date
    } else {
      // Free scroll mode: both sides use percentages
      dataZoomConfig.start = 70;
      dataZoomConfig.end = 100;
    }

    // Grid configuration - adjust based on whether volume is shown
    // Grid configuration for dual chart layout
    // Price chart: 70% of height, Volume chart: 20% of height, with 40px for axis labels at bottom
    const grids = showVolume
      ? [
          { left: 60, right: 20, top: 20, height: '60%' }, // Price chart - 60% of available height
          { left: 60, right: 20, top: '75%', height: '15%' }, // Volume chart - positioned at 75%, 15% height
        ]
      : [{ left: 60, right: 20, top: 20, bottom: 60 }]; // Single grid without volume

    // X-axis configuration - both axes share the same data for synchronized crosshairs
    // Use formattedAxisLabels for display, but store dates for crosshair tooltip lookup
    const xAxes = showVolume
      ? [
          {
            type: 'category' as const,
            data: formattedAxisLabels, // Use pre-formatted labels
            boundaryGap: true,
            axisLine: { onZero: false },
            axisLabel: { show: false }, // Hide labels on price chart x-axis
            axisTick: { show: false },
            gridIndex: 0,
            axisPointer: {
              show: true,
              label: { show: false }, // Don't show label on price chart x-axis
            },
          },
          {
            type: 'category' as const,
            data: formattedAxisLabels, // Use pre-formatted labels
            boundaryGap: true,
            axisLine: { onZero: false },
            gridIndex: 1,
            axisLabel: {
              // No formatter needed - data is already formatted
            },
            axisPointer: {
              show: true,
              label: {
                // For crosshair tooltip, use the index to look up the original date
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter: (params: any) => {
                  const index =
                    typeof params.value === 'number' ? params.value : formattedAxisLabels.indexOf(String(params.value));
                  const originalDate = index >= 0 && index < dates.length ? dates[index] : String(params.value);
                  return this.formatAxisPointerLabel(originalDate, isIntraday);
                },
              },
            },
          },
        ]
      : [
          {
            type: 'category' as const,
            data: formattedAxisLabels, // Use pre-formatted labels
            boundaryGap: true,
            axisLine: { onZero: false },
            axisLabel: {
              // No formatter needed - data is already formatted
            },
            axisPointer: {
              label: {
                // For crosshair tooltip, use the index to look up the original date
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter: (params: any) => {
                  const index =
                    typeof params.value === 'number' ? params.value : formattedAxisLabels.indexOf(String(params.value));
                  const originalDate = index >= 0 && index < dates.length ? dates[index] : String(params.value);
                  return this.formatAxisPointerLabel(originalDate, isIntraday);
                },
              },
            },
          },
        ];

    // Y-axis configuration
    const yAxes = showVolume
      ? [
          { type: 'value' as const, scale: true, gridIndex: 0, splitNumber: 4 },
          {
            type: 'value' as const,
            gridIndex: 1,
            splitNumber: 2,
            axisLabel: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter: (value: any) => this.formatVolumeLabel(value),
            },
          },
        ]
      : [{ type: 'value' as const, scale: true }];

    // Series configuration - use explicit array type to allow push()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const series: any[] = [
      {
        name: symbol,
        type: 'candlestick',
        data: ohlcData,
        xAxisIndex: 0,
        yAxisIndex: 0,
        barWidth: '70%',
        barMaxWidth: 24,
        barMinWidth: 1,
        itemStyle: {
          color: this.CANDLE_UP_COLOR,
          color0: this.CANDLE_DOWN_COLOR,
          borderColor: this.CANDLE_UP_COLOR,
          borderColor0: this.CANDLE_DOWN_COLOR,
        },
        // Extended hours background shading
        markArea:
          extendedHoursAreas.length > 0
            ? {
                silent: true,
                itemStyle: {
                  color: 'rgba(100, 100, 100, 0.15)',
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data: extendedHoursAreas as any,
              }
            : undefined,
        markLine:
          markLineData.length > 0
            ? {
                symbol: 'none',
                lineStyle: { type: 'dashed', width: 1 },
                label: {
                  show: true,
                  position: 'insideEndBottom',
                  fontSize: 10,
                  color: '#ffffff',
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  padding: [4, 8],
                  borderRadius: 4,
                },
                data: markLineData,
              }
            : undefined,
      },
    ];

    // Add volume series if showing
    if (showVolume) {
      series.push({
        name: 'Volume',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumeData,
        barWidth: '60%',
      });
    }

    // Build chart options
    const chartOptions: EChartsOption = {
      grid: grids,
      xAxis: xAxes,
      yAxis: yAxes,
      dataZoom: [dataZoomConfig],
      series,
    };

    // Apply complete theming
    return this.applyDarkTheme(chartOptions);
  }

  /**
   * Format volume labels (e.g., 1.2M, 500K)
   */
  private formatVolumeLabel(value: number): string {
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K';
    return value.toString();
  }

  /**
   * Build mark line data for corporate actions (splits and dividends)
   * Uses index-based xAxis positioning to match category axis.
   */
  private buildCorporateActionMarkers(
    candles: ChartCandle[],
  ): { xAxis: number; label: { formatter: string }; lineStyle: { color: string } }[] {
    const markers: { xAxis: number; label: { formatter: string }; lineStyle: { color: string } }[] = [];

    // Debug: Check for any candles with split or dividend data
    const splitsInData = candles.filter((c) => c.splitCoefficient && c.splitCoefficient !== 1.0);
    const dividendsInData = candles.filter((c) => c.dividendAmount && c.dividendAmount > 0);
    console.log('[ChartConfig] Corporate actions in data:', {
      totalCandles: candles.length,
      splitsFound: splitsInData.length,
      dividendsFound: dividendsInData.length,
      sampleSplits: splitsInData.slice(0, 3).map((c) => ({
        date: c.date.toISOString().split('T')[0],
        coeff: c.splitCoefficient,
      })),
      sampleDividends: dividendsInData.slice(0, 3).map((c) => ({
        date: c.date.toISOString().split('T')[0],
        amount: c.dividendAmount,
      })),
    });

    candles.forEach((candle, index) => {
      // Check for splits (coefficient !== 1.0)
      if (candle.splitCoefficient && candle.splitCoefficient !== 1.0) {
        const ratio = candle.splitCoefficient;
        const label = ratio > 1 ? `${ratio}:1 Split` : `1:${Math.round(1 / ratio)} Rev. Split`;
        markers.push({
          xAxis: index,
          label: { formatter: `🔀 ${label}` },
          lineStyle: { color: '#9c27b0' }, // Purple for splits
        });
      }

      // Check for dividends (amount > 0)
      if (candle.dividendAmount && candle.dividendAmount > 0) {
        markers.push({
          xAxis: index,
          label: { formatter: `💰 $${candle.dividendAmount.toFixed(2)} Div` },
          lineStyle: { color: '#4caf50' }, // Green for dividends
        });
      }
    });

    return markers;
  }

  /**
   * Check if a given candle is during extended hours (pre-market or after-hours).
   * Uses backend's isExtendedHours field if available, falls back to time-based detection.
   *
   * Pre-market: 4:00 AM - 9:30 AM ET
   * Regular: 9:30 AM - 4:00 PM ET
   * After-hours: 4:00 PM - 8:00 PM ET
   */
  private isExtendedHoursCandle(candle: ChartCandle): boolean {
    // Prefer backend's isExtendedHours field (handles holidays, half-days correctly)
    if (typeof candle.isExtendedHours === 'boolean') {
      return candle.isExtendedHours;
    }

    // Fallback: time-based detection
    const date = candle.date;
    const etTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hours = etTime.getHours();
    const minutes = etTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const marketOpen = 9 * 60 + 30; // 9:30 AM = 570 minutes
    const marketClose = 16 * 60; // 4:00 PM = 960 minutes

    return totalMinutes < marketOpen || totalMinutes >= marketClose;
  }

  /**
   * Build markArea data for extended hours background shading.
   * Creates contiguous shaded regions for pre-market and after-hours periods.
   * Returns array of [startIndex, endIndex] pairs that match xAxis category indices.
   */
  private buildExtendedHoursMarkAreas(candles: ChartCandle[]): { xAxis: number }[][] {
    const areas: { xAxis: number }[][] = [];
    let currentAreaStartIndex: number | null = null;

    // Debug: Check if any candles have isExtendedHours field set
    const candlesWithBackendField = candles.filter((c) => typeof c.isExtendedHours === 'boolean');
    const extendedHoursCandles = candles.filter((c) => this.isExtendedHoursCandle(c));
    console.log(
      '[ChartConfig] Extended hours detection:',
      JSON.stringify({
        totalCandles: candles.length,
        candlesWithBackendField: candlesWithBackendField.length,
        extendedHoursCandles: extendedHoursCandles.length,
        sampleCandle: candles[0]
          ? {
              date: candles[0].date.toISOString(),
              isExtendedHours: candles[0].isExtendedHours,
              detected: this.isExtendedHoursCandle(candles[0]),
            }
          : null,
      }),
    );

    const EXTENDED_HOURS_COLOR = 'rgba(100, 100, 100, 0.15)';

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const isExtended = this.isExtendedHoursCandle(candle);

      if (isExtended) {
        if (currentAreaStartIndex === null) {
          // Start a new extended hours area
          currentAreaStartIndex = i;
        }
      } else {
        // Regular hours - close any open extended hours area
        if (currentAreaStartIndex !== null && i > 0) {
          areas.push([{ xAxis: currentAreaStartIndex }, { xAxis: i - 1 }]);
          currentAreaStartIndex = null;
        }
      }
    }

    // Close final area if still open
    if (currentAreaStartIndex !== null && candles.length > 0) {
      areas.push([{ xAxis: currentAreaStartIndex }, { xAxis: candles.length - 1 }]);
    }

    // Log the areas for debugging
    if (areas.length > 0) {
      console.log(
        '[ChartConfig] Extended hours markAreas:',
        JSON.stringify({
          count: areas.length,
          sample: areas[0],
          color: EXTENDED_HOURS_COLOR,
        }),
      );
    }

    return areas;
  }

  /**
   * Format axis label dynamically based on interval type
   * For intraday: shows time, with date when day changes (respects timezone setting)
   * For daily+: shows date (uses date portion of ISO string to avoid timezone shift)
   */
  formatAxisLabel(value: string, isIntraday: boolean): string {
    try {
      if (isIntraday) {
        // For intraday, parse as Date and apply timezone
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;

        const useLocal = this.useLocalTime();
        const timeZone = useLocal ? undefined : 'America/New_York';
        const result = date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone,
        });
        // Debug: ALWAYS log first 3 calls to verify timezone is working
        if (!this._axisLabelLogCount) this._axisLabelLogCount = 0;
        if (this._axisLabelLogCount < 3) {
          this._axisLabelLogCount++;
          console.log(
            '[ChartConfig] formatAxisLabel:',
            JSON.stringify({ useLocal, timeZone, input: value, output: result }),
          );
        }
        return result;
      } else {
        // For daily+, extract date portion from ISO string to avoid timezone shift
        // ISO format: "2024-01-15T00:00:00.000Z" - we want "Jan 15" not local conversion
        const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          const [, year, month, day] = dateMatch;
          // Create date at noon UTC to avoid any DST issues
          const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0));
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC', // Use UTC to match the date we extracted
          });
        }
        // Fallback to original parsing if not ISO format
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }
    } catch {
      return value;
    }
  }

  /**
   * Format axis pointer label (crosshair bubble) for proper date/time display
   * Shows full date and time for intraday (respects timezone setting), just date for daily+
   */
  formatAxisPointerLabel(value: string, isIntraday: boolean): string {
    try {
      if (isIntraday) {
        // For intraday, parse as Date and apply timezone
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;

        const useLocal = this.useLocalTime();
        const timeZone = useLocal ? undefined : 'America/New_York';
        const formatted = date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone,
        });
        // Add timezone indicator when not local time
        const result = useLocal ? formatted : formatted + ' ET';
        // DEBUG: Log timezone formatting (only once per 100 calls to avoid spam)
        if (Math.random() < 0.01) {
          console.log('[ChartConfig] formatAxisPointerLabel:', { value, useLocal, result });
        }
        return result;
      } else {
        // For daily+, extract date portion from ISO string to avoid timezone shift
        const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          const [, year, month, day] = dateMatch;
          // Create date at noon UTC to avoid any DST issues
          const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0));
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC', // Use UTC to match the date we extracted
          });
        }
        // Fallback to original parsing if not ISO format
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch {
      return value;
    }
  }

  /**
   * Format axis label for zoomed out view (date only)
   */
  formatAxisLabelDateOnly(value: string): string {
    try {
      // Extract date portion from ISO string to avoid timezone shift
      const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0));
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        });
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return value;
    }
  }

  /**
   * Format date for chart display
   * Extracts date portion from ISO string to avoid timezone shift for daily data
   */
  formatDateForChart(dateInput: Date | string): string {
    try {
      const value = typeof dateInput === 'string' ? dateInput : dateInput.toISOString();

      // Extract date portion from ISO string to avoid timezone shift
      const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0));
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        });
      }

      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (isNaN(date.getTime())) return String(dateInput);

      // Format: "Jan 2, 2025"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return String(dateInput);
    }
  }

  /**
   * Format date label for axis (shorter format)
   * Extracts date portion from ISO string to avoid timezone shift
   */
  formatDateLabel(value: string): string {
    try {
      // Extract date portion from ISO string to avoid timezone shift
      const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0));
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        });
      }

      const date = new Date(value);
      if (isNaN(date.getTime())) return value;

      // Format: "Jan 2"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return value;
    }
  }

  /**
   * Format date label for crosshair/axisPointer (fuller format than axis label)
   * Shows date in human-readable format: "Jan 2, 2026" or "Jan 2, 2026 09:30 AM ET" for intraday
   * Respects useLocalTime setting for timezone display
   */
  formatCrosshairDateLabel(value: string): string {
    try {
      // Handle case where value might already be formatted or empty
      if (!value || typeof value !== 'string') return String(value);

      const useLocal = this.useLocalTime();
      const timeZone = useLocal ? undefined : 'America/New_York';

      // Parse the ISO date
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;

      // Check if this is intraday data (has meaningful time component)
      const hasTime = value.includes('T') && !value.endsWith('T00:00:00.000Z');

      if (hasTime) {
        // Intraday - show full date with time
        const formatted = date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone,
        });
        // Add timezone suffix when using exchange time
        return useLocal ? formatted : `${formatted} ET`;
      }

      // Daily/weekly/monthly - just show date in ET (exchange time)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/New_York',
      });
    } catch {
      return String(value);
    }
  }

  /**
   * Format period for display
   */
  formatPeriod(period: string): string {
    return this.periodLabels[period] || period;
  }

  /**
   * Format interval for display
   */
  formatInterval(interval: string): string {
    return this.intervalLabels[interval] || interval;
  }

  /**
   * Format candlestick tooltip HTML
   */
  formatCandlestickTooltip(params: EChartsTooltipParam[]): string {
    if (!params || params.length === 0) return '';
    const p = params[0];
    const data = p.data as number[];
    if (!data || data.length < 4) return '';

    const [open, close, low, high] = data;
    const isUp = close >= open;
    const color = isUp ? '#26a69a' : '#ef5350';

    return `
      <div style="font-family: monospace; padding: 8px;">
        <div style="margin-bottom: 4px; font-weight: bold;">${p.name}</div>
        <div style="color: ${color};">
          O: ${open.toFixed(2)}<br/>
          H: ${high.toFixed(2)}<br/>
          L: ${low.toFixed(2)}<br/>
          C: ${close.toFixed(2)}
        </div>
      </div>
    `;
  }

  /**
   * Parse chartOptions from backend - handles string or object, and double-encoded JSON
   */
  parseChartOptions(chartOptions: unknown): EChartsOption | null {
    console.log('[ChartConfigService] parseChartOptions input type:', typeof chartOptions);

    // If already an object, use it directly
    if (typeof chartOptions === 'object' && chartOptions !== null) {
      const keys = Object.keys(chartOptions);
      console.log('[ChartConfigService] chartOptions is object, keys:', keys.slice(0, 5));

      // If keys are numeric strings (0, 1, 2...), this is a spread string - parse it
      if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
        console.error('[ChartConfigService] chartOptions looks like a spread string, attempting recovery');
        const chars = keys
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => (chartOptions as Record<string, string>)[k]);
        const reconstructed = chars.join('');
        try {
          const parsed = JSON.parse(reconstructed);
          console.log('[ChartConfigService] Recovered parsed options keys:', Object.keys(parsed).slice(0, 5));
          return parsed as EChartsOption;
        } catch (e) {
          console.error('[ChartConfigService] Failed to recover chartOptions:', e);
          return null;
        }
      }

      return chartOptions as EChartsOption;
    }

    // If it's a string, parse it (may need multiple passes for double-encoded)
    if (typeof chartOptions === 'string') {
      let parsed: unknown = chartOptions;
      let attempts = 0;
      const maxAttempts = 5;

      while (typeof parsed === 'string' && attempts < maxAttempts) {
        try {
          parsed = JSON.parse(parsed);
          attempts++;
          console.log('[ChartConfigService] Parse attempt', attempts, 'result type:', typeof parsed);
        } catch (e) {
          console.error('[ChartConfigService] Failed to parse chartOptions at attempt', attempts, ':', e);
          return null;
        }
      }

      if (typeof parsed === 'object' && parsed !== null) {
        console.log('[ChartConfigService] Successfully parsed chartOptions, keys:', Object.keys(parsed).slice(0, 5));
        return parsed as EChartsOption;
      }

      console.error('[ChartConfigService] chartOptions is not an object after parsing:', typeof parsed);
      return null;
    }

    console.error('[ChartConfigService] chartOptions has unexpected type:', typeof chartOptions);
    return null;
  }

  /**
   * Configure dataZoom styling defaults.
   * IMPORTANT: This preserves the backend's functional configuration (rangeMode, endValue, etc.)
   * and only adds UI/interaction defaults that the backend doesn't specify.
   *
   * For right-anchored zoom behavior (lockToRight), the backend should provide:
   * - rangeMode: ['percent', 'value']
   * - endValue: <latest_date>
   * - moveOnMouseMove: false
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyDataZoomConfig(options: any): any {
    const result = { ...options };

    // Get existing dataZoom config from backend
    const existingZoom = Array.isArray(result.dataZoom) ? result.dataZoom[0] : result.dataZoom;

    if (!existingZoom) {
      // No dataZoom from backend - create a basic default
      result.dataZoom = [
        {
          type: 'inside',
          start: 70,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseWheel: false,
          throttle: 50,
          minValueSpan: 5,
        },
      ];
      return result;
    }

    // Merge with styling defaults, preserving backend's functional config
    const styledZoom = {
      ...existingZoom,
      // Only set defaults if not provided by backend
      type: existingZoom.type ?? 'inside',
      zoomOnMouseWheel: existingZoom.zoomOnMouseWheel ?? true,
      moveOnMouseWheel: existingZoom.moveOnMouseWheel ?? false,
      throttle: existingZoom.throttle ?? 50,
      minValueSpan: existingZoom.minValueSpan ?? 5,
      // Preserve backend's range configuration (don't override!)
      // rangeMode, start, end, startValue, endValue, moveOnMouseMove
    };

    result.dataZoom = [styledZoom];
    return result;
  }

  /**
   * Apply dark theme to axes (handles arrays).
   * This ensures consistent crosshair and label styling on all axes.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyAxisTheming(options: any): any {
    const result = { ...options };

    if (result.xAxis) {
      if (Array.isArray(result.xAxis)) {
        result.xAxis = result.xAxis.map((axis: unknown) => {
          let themed = this.deepMerge(axis, this.darkAxisDefaults);
          themed = this.deepMerge(themed, this.xAxisDateDefaults);
          return themed;
        });
      } else {
        result.xAxis = this.deepMerge(result.xAxis, this.darkAxisDefaults);
        result.xAxis = this.deepMerge(result.xAxis, this.xAxisDateDefaults);
      }
    }

    if (result.yAxis) {
      if (Array.isArray(result.yAxis)) {
        result.yAxis = result.yAxis.map((axis: unknown) => {
          let themed = this.deepMerge(axis, this.darkAxisDefaults);
          themed = this.deepMerge(themed, this.yAxisDefaults);
          return themed;
        });
      } else {
        result.yAxis = this.deepMerge(result.yAxis, this.darkAxisDefaults);
        result.yAxis = this.deepMerge(result.yAxis, this.yAxisDefaults);
      }
    }

    return result;
  }

  /**
   * Deep merge two objects (source values override target)
   * IMPORTANT: If target has an array and source has an object for the same key,
   * keep the target array to preserve multi-grid/multi-axis configurations.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private deepMerge(target: any, source: any): any {
    if (typeof target !== 'object' || target === null) {
      target = {};
    }
    if (typeof source !== 'object' || source === null) {
      return target;
    }
    const result = { ...target };
    for (const key of Object.keys(source)) {
      // If target has an array but source has an object, keep target's array
      // This preserves multi-grid/multi-axis configurations
      if (Array.isArray(result[key]) && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        // Keep the array from target, don't overwrite with object from source
        continue;
      }
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}
