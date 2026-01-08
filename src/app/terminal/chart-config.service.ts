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
  useLocalTime = signal(true);

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
    options?: { showCorporateActions?: boolean; lockToRight?: boolean },
  ): EChartsOption {
    // Ensure data is sorted oldest first for proper chart display
    const sortedCandles = [...candles].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Store ISO dates for proper parsing in crosshair and axis labels
    const dates = sortedCandles.map((c) => c.date.toISOString());
    const ohlcData = sortedCandles.map((c) => [c.open, c.close, c.low, c.high]);

    // Get the latest date for right-anchored zoom
    const latestDate = dates.length > 0 ? dates[dates.length - 1] : undefined;
    // Default to locked (lockToRight defaults to true in component)
    const lockToRight = options?.lockToRight ?? true;

    // Determine if this is intraday data
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

    // Build mark lines for corporate actions (splits and dividends)
    const markLineData = options?.showCorporateActions ? this.buildCorporateActionMarkers(sortedCandles) : [];

    // Build dataZoom config based on lock state
    // When locked: use endValue with rangeMode to fix right edge
    // When unlocked: use start/end percentages for free scrolling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataZoomConfig: any = {
      type: 'inside',
      zoomOnMouseWheel: true,
      moveOnMouseMove: !lockToRight, // Disable panning when locked
      moveOnMouseWheel: false,
      throttle: 50,
      minValueSpan: 5,
    };

    if (lockToRight && latestDate) {
      // Fixed right edge mode: end is anchored to the latest data point
      // rangeMode: ['percent', 'value'] means start uses percentage, end uses value
      dataZoomConfig.rangeMode = ['percent', 'value'];
      dataZoomConfig.start = 70; // Show last 30% initially
      dataZoomConfig.endValue = latestDate; // Fix right edge to latest date
    } else {
      // Free scroll mode: both sides use percentages
      dataZoomConfig.start = 70;
      dataZoomConfig.end = 100;
    }

    // Build minimal options - applyDarkTheme will add all theming
    const chartOptions: EChartsOption = {
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: true,
        axisLine: { onZero: false },
        axisLabel: {
          // Dynamic formatter based on zoom level and interval
          formatter: (value: string) => this.formatAxisLabel(value, isIntraday),
        },
        // Axis pointer (crosshair) label formatter for proper date/time display
        axisPointer: {
          label: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (params: any) => this.formatAxisPointerLabel(String(params.value), isIntraday),
          },
        },
      },
      yAxis: {
        type: 'value',
        scale: true,
      },
      // Use the configured dataZoom
      dataZoom: [dataZoomConfig],
      series: [
        {
          name: symbol,
          type: 'candlestick',
          data: ohlcData,
          barWidth: '70%', // Use 70% of available space to reduce gaps
          barMaxWidth: 24, // Limit max width when very zoomed in
          barMinWidth: 1, // Allow thin candles when zoomed out
          itemStyle: {
            color: this.CANDLE_UP_COLOR,
            color0: this.CANDLE_DOWN_COLOR,
            borderColor: this.CANDLE_UP_COLOR,
            borderColor0: this.CANDLE_DOWN_COLOR,
          },
          // Add corporate action markers if enabled
          markLine:
            markLineData.length > 0
              ? {
                  symbol: 'none',
                  lineStyle: {
                    type: 'dashed',
                    width: 1,
                  },
                  label: {
                    show: true,
                    position: 'insideEndBottom', // Position at top of chart area
                    fontSize: 10,
                    color: '#ffffff', // White text for visibility on dark background
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: [4, 8],
                    borderRadius: 4,
                  },
                  data: markLineData,
                }
              : undefined,
        },
      ],
    };

    // Apply complete theming
    return this.applyDarkTheme(chartOptions);
  }

  /**
   * Build mark line data for corporate actions (splits and dividends)
   */
  private buildCorporateActionMarkers(
    candles: ChartCandle[],
  ): { xAxis: string; label: { formatter: string }; lineStyle: { color: string } }[] {
    const markers: { xAxis: string; label: { formatter: string }; lineStyle: { color: string } }[] = [];

    candles.forEach((candle) => {
      // Check for splits (coefficient !== 1.0)
      if (candle.splitCoefficient && candle.splitCoefficient !== 1.0) {
        const ratio = candle.splitCoefficient;
        const label = ratio > 1 ? `${ratio}:1 Split` : `1:${Math.round(1 / ratio)} Rev. Split`;
        markers.push({
          xAxis: candle.date.toISOString(),
          label: { formatter: `🔀 ${label}` },
          lineStyle: { color: '#9c27b0' }, // Purple for splits
        });
      }

      // Check for dividends (amount > 0)
      if (candle.dividendAmount && candle.dividendAmount > 0) {
        markers.push({
          xAxis: candle.date.toISOString(),
          label: { formatter: `💰 $${candle.dividendAmount.toFixed(2)} Div` },
          lineStyle: { color: '#4caf50' }, // Green for dividends
        });
      }
    });

    return markers;
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

        const timeZone = this.useLocalTime() ? undefined : 'America/New_York';
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone,
        });
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

        const timeZone = this.useLocalTime() ? undefined : 'America/New_York';
        const formatted = date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone,
        });
        // Add timezone indicator when not local time
        return this.useLocalTime() ? formatted : formatted + ' ET';
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
   * Shows date in human-readable format: "Jan 2, 2026" or "Jan 2, 2026 09:30" for intraday
   */
  formatCrosshairDateLabel(value: string): string {
    try {
      // Handle case where value might already be formatted or empty
      if (!value || typeof value !== 'string') return String(value);

      // Extract date portion from ISO string to avoid timezone shift
      const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})(T(\d{2}):(\d{2}))?/);
      if (dateMatch) {
        const [, year, month, day, , hour, minute] = dateMatch;
        const date = new Date(
          Date.UTC(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            hour ? parseInt(hour) : 12,
            minute ? parseInt(minute) : 0,
            0,
          ),
        );

        // If we have time info (intraday), include it
        if (hour && minute) {
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'UTC',
          });
        }

        // Daily/weekly/monthly - just show date
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        });
      }

      const date = new Date(value);
      if (isNaN(date.getTime())) return value;

      // Fallback format
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
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
