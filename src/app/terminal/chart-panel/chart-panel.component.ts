// Copyright (c) 2025 Perpetuator LLC
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, CandlestickChart, ScatterChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
  MarkPointComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ChartControls } from '../terminal.types';

// Register required ECharts components
echarts.use([
  LineChart,
  BarChart,
  CandlestickChart,
  ScatterChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
  MarkPointComponent,
  CanvasRenderer,
]);

@Component({
  selector: 'app-chart-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    NgxEchartsDirective,
  ],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './chart-panel.component.html',
  styleUrl: './chart-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartPanelComponent implements OnChanges {
  @Input() chartOptions?: EChartsOption;
  @Input() chartControls?: ChartControls;
  @Input() title = '';
  @Input() height = 400;
  @Input() showHeader = true;
  @Input() showToolbar = true;
  @Input() showControls = true;
  @Input() isLoading = false;
  @Input() dataPoints = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() chartInit = new EventEmitter<any>();
  @Output() refresh = new EventEmitter<void>();
  @Output() fullscreen = new EventEmitter<void>();
  @Output() executeCommand = new EventEmitter<string>();

  updateOptions: EChartsOption = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private chartInstance?: any;
  isFullscreen = false;

  // Selected period/interval for chart controls
  selectedPeriod = '1Y';
  selectedInterval = 'daily';

  // Chart initialization options
  chartInitOptions = {
    renderer: 'canvas' as const,
  };

  // Default dark theme options to merge with incoming options
  private darkThemeDefaults: Partial<EChartsOption> = {
    backgroundColor: 'transparent',
    textStyle: {
      color: '#c0c0c0', // Light text for dark background
    },
    grid: {
      backgroundColor: 'transparent',
    },
    title: {
      textStyle: {
        color: '#e0e0e0',
      },
      subtextStyle: {
        color: '#a0a0a0',
      },
    },
    legend: {
      textStyle: {
        color: '#c0c0c0',
      },
    },
    tooltip: {
      backgroundColor: 'rgba(30, 30, 30, 0.95)',
      borderColor: '#505050',
      textStyle: {
        color: '#e0e0e0',
      },
    },
    dataZoom: {
      textStyle: {
        color: '#a0a0a0',
      },
      borderColor: '#505050',
      backgroundColor: 'rgba(30, 30, 30, 0.5)',
      fillerColor: 'rgba(80, 80, 80, 0.3)',
      handleStyle: {
        color: '#606060',
      },
      dataBackground: {
        lineStyle: {
          color: '#505050',
        },
        areaStyle: {
          color: 'rgba(60, 60, 60, 0.3)',
        },
      },
    },
  };

  // Dark theme axis defaults - applied separately to handle arrays
  private darkAxisDefaults = {
    axisLine: {
      lineStyle: {
        color: '#505050',
      },
    },
    axisLabel: {
      color: '#a0a0a0',
    },
    splitLine: {
      lineStyle: {
        color: '#353535',
      },
    },
    splitArea: {
      show: false, // Disable alternating backgrounds
      areaStyle: {
        color: ['rgba(35, 35, 35, 0.5)', 'rgba(40, 40, 40, 0.5)'],
      },
    },
  };

  // Period labels for display
  periodLabels: Record<string, string> = {
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

  // Interval labels for display
  intervalLabels: Record<string, string> = {
    '1min': '1 Min',
    '5min': '5 Min',
    '15min': '15 Min',
    '30min': '30 Min',
    '60min': '1 Hour',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
  };

  // Recommended intervals for each period (fallback if backend doesn't provide)
  private defaultRecommendedIntervals: Record<string, string[]> = {
    '1D': ['1min', '5min', '15min'],
    '5D': ['5min', '15min', '30min', '60min'],
    '1W': ['15min', '30min', '60min'],
    '2W': ['30min', '60min', 'daily'],
    '1M': ['60min', 'daily'],
    '3M': ['60min', 'daily'],
    '6M': ['daily', 'weekly'],
    '1Y': ['daily', 'weekly'],
    '2Y': ['daily', 'weekly'],
    '5Y': ['weekly', 'monthly'],
    '10Y': ['weekly', 'monthly'],
    '20Y': ['monthly'],
    MAX: ['monthly'],
  };

  /**
   * Get recommended intervals for a period, using backend data when available
   */
  private getRecommendedIntervals(period: string): string[] {
    // If backend provides recommendedIntervals, use the single recommended value
    if (this.chartControls?.recommendedIntervals?.[period]) {
      return [this.chartControls.recommendedIntervals[period]];
    }
    // Fall back to defaults
    return this.defaultRecommendedIntervals[period] || ['daily'];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartOptions'] && this.chartOptions) {
      // Debug: log incoming chart options from backend
      console.log('[ChartPanel] Incoming chartOptions from backend:', JSON.stringify(this.chartOptions, null, 2));

      // Start with backend options
      let merged = this.deepMerge(this.chartOptions, this.darkThemeDefaults);

      // Apply axis theming (handles both single axis and array of axes)
      merged = this.applyAxisTheming(merged);

      // Debug: log final merged options
      console.log('[ChartPanel] Final merged options:', JSON.stringify(merged, null, 2));

      this.updateOptions = merged;
    }

    if (changes['chartControls'] && this.chartControls) {
      this.selectedPeriod = this.chartControls.currentPeriod;
      this.selectedInterval = this.chartControls.currentInterval;
    }
  }

  /**
   * Apply dark theme to axes (handles single axis or array of axes)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyAxisTheming(options: any): any {
    const result = { ...options };

    // Apply to xAxis
    if (result.xAxis) {
      if (Array.isArray(result.xAxis)) {
        result.xAxis = result.xAxis.map((axis: unknown) => this.deepMerge(axis, this.darkAxisDefaults));
      } else {
        result.xAxis = this.deepMerge(result.xAxis, this.darkAxisDefaults);
      }
    }

    // Apply to yAxis
    if (result.yAxis) {
      if (Array.isArray(result.yAxis)) {
        result.yAxis = result.yAxis.map((axis: unknown) => this.deepMerge(axis, this.darkAxisDefaults));
      } else {
        result.yAxis = this.deepMerge(result.yAxis, this.darkAxisDefaults);
      }
    }

    return result;
  }

  /**
   * Deep merge two objects, with source values overriding target
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private deepMerge(target: any, source: any): any {
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

  onPeriodChange(): void {
    // Get recommended intervals for this period (uses backend data when available)
    const recommended = this.getRecommendedIntervals(this.selectedPeriod);

    // If current interval isn't recommended, switch to first recommended
    if (!recommended.includes(this.selectedInterval)) {
      this.selectedInterval = recommended[0];
    }

    this.onSettingsChange();
  }

  onIntervalChange(): void {
    this.onSettingsChange();
  }

  private onSettingsChange(): void {
    if (!this.chartControls) return;

    // Generate new command using the template
    const command = this.chartControls.commandTemplate
      .replace('{period}', this.selectedPeriod)
      .replace('{interval}', this.selectedInterval);

    this.executeCommand.emit(command);
  }

  formatPeriod(period: string): string {
    return this.periodLabels[period] || period;
  }

  formatInterval(interval: string): string {
    return this.intervalLabels[interval] || interval;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChartInit(chart: any): void {
    this.chartInstance = chart;
    this.chartInit.emit(chart);
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  onToggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    this.fullscreen.emit();

    // Resize chart after fullscreen toggle
    setTimeout(() => {
      this.chartInstance?.resize();
    }, 100);
  }

  downloadChart(): void {
    if (!this.chartInstance) return;

    const dataUrl = this.chartInstance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#1e1e1e',
    });

    const link = document.createElement('a');
    link.download = `${this.title || 'chart'}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }
}
