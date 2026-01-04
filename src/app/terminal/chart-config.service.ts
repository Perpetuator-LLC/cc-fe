// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable } from '@angular/core';
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
    // Axis pointer for x-axis
    axisPointer: {
      show: true,
      type: 'line',
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

  // yAxis specific defaults - position prices on right with axis pointer
  private readonly yAxisDefaults = {
    position: 'right',
    axisPointer: {
      show: true,
      type: 'line',
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  buildChartFromCandles(candles: ChartCandle[], symbol: string, _interval?: string): EChartsOption {
    // Ensure data is sorted oldest first for proper chart display
    const sortedCandles = [...candles].sort((a, b) => a.date.getTime() - b.date.getTime());

    const dates = sortedCandles.map((c) => this.formatDateForChart(c.date));
    const ohlcData = sortedCandles.map((c) => [c.open, c.close, c.low, c.high]);

    // Build minimal options - applyDarkTheme will add all theming
    const options: EChartsOption = {
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: true,
      },
      yAxis: {
        type: 'value',
        scale: true,
      },
      series: [
        {
          name: symbol,
          type: 'candlestick',
          data: ohlcData,
          itemStyle: {
            color: this.CANDLE_UP_COLOR,
            color0: this.CANDLE_DOWN_COLOR,
            borderColor: this.CANDLE_UP_COLOR,
            borderColor0: this.CANDLE_DOWN_COLOR,
          },
        },
      ],
    };

    // Apply complete theming
    return this.applyDarkTheme(options);
  }

  /**
   * Format date for chart display
   */
  formatDateForChart(dateInput: Date | string): string {
    try {
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
   */
  formatDateLabel(value: string): string {
    try {
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
   * Configure dataZoom for scroll-to-zoom with right-sticky behavior
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyDataZoomConfig(options: any): any {
    const result = { ...options };

    // Get existing dataZoom config if any
    const existingZoom = Array.isArray(result.dataZoom) ? result.dataZoom[0] : result.dataZoom;
    const existingStart = existingZoom?.start ?? 0;
    const existingEnd = existingZoom?.end ?? 100;

    // Only use inside dataZoom for mouse wheel zoom - no slider
    const insideZoom = {
      type: 'inside',
      xAxisIndex: 0,
      start: existingStart,
      end: existingEnd,
      zoomOnMouseWheel: true,
      moveOnMouseMove: true,
      moveOnMouseWheel: false,
      preventDefaultMouseMove: false,
      minValueSpan: 5, // Allow zooming in to show at least 5 candles
      zoomLock: false, // Allow both zoom in and out
    };

    // Replace all existing dataZoom with just inside zoom
    result.dataZoom = [insideZoom];

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
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}
