// Copyright (c) 2025-2026 Perpetuator LLC
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
  HostBinding,
  inject,
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
import { ChartConfigService } from '../chart-config.service';

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
  private _chartControls?: ChartControls;
  /** Pre-built dropdown rows for the template (label included so no per-CD method call). */
  periodOptionsDisplay: { value: string; label: string }[] = [];
  intervalOptionsDisplay: { value: string; label: string }[] = [];
  @Input() set chartControls(value: ChartControls | undefined) {
    this._chartControls = value;
    this.periodOptionsDisplay = (value?.periodOptions ?? []).map((v) => ({ value: v, label: this.formatPeriod(v) }));
    this.intervalOptionsDisplay = (value?.intervalOptions ?? []).map((v) => ({
      value: v,
      label: this.formatInterval(v),
    }));
  }
  get chartControls(): ChartControls | undefined {
    return this._chartControls;
  }
  @Input() title = '';
  @Input() height = 400;
  @Input() showHeader = true;
  @Input() showToolbar = true;
  @Input() showControls = true;
  @Input() isLoading = false;
  @Input() dataPoints = 0;

  // Inject shared chart config service
  private chartConfigService = inject(ChartConfigService);

  @HostBinding('style.--chart-height.px')
  get chartHeight(): number {
    return this.height;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() chartInit = new EventEmitter<any>();
  @Output() refresh = new EventEmitter<void>();
  @Output() fullscreen = new EventEmitter<void>();
  @Output() executeCommand = new EventEmitter<string>();

  updateOptions: EChartsOption = {};

  /**
   * Check if updateOptions has real chart data (not just empty object)
   */
  get hasChartData(): boolean {
    return this.updateOptions && Object.keys(this.updateOptions).length > 0;
  }

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

  // Period labels for display (delegated to service for shared use)
  get periodLabels(): Record<string, string> {
    return this.chartConfigService.periodLabels;
  }

  // Interval labels for display (delegated to service for shared use)
  get intervalLabels(): Record<string, string> {
    return this.chartConfigService.intervalLabels;
  }

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

      // Use shared service for consistent theming
      const themed = this.chartConfigService.applyDarkTheme(this.chartOptions);

      // Debug: log final themed options
      console.log('[ChartPanel] Final themed options:', JSON.stringify(themed, null, 2));

      this.updateOptions = themed;
    }

    if (changes['chartControls'] && this.chartControls) {
      this.selectedPeriod = this.chartControls.currentPeriod;
      // Sync interval with available options (case-insensitive matching)
      this.selectedInterval = this.syncIntervalWithOptions(
        this.chartControls.currentInterval,
        this.chartControls.intervalOptions,
      );
    }
  }

  /**
   * Sync interval value with available options (case-insensitive matching)
   */
  private syncIntervalWithOptions(interval: string, options: string[]): string {
    const lowerInterval = interval.toLowerCase();

    // Find matching option (case-insensitive)
    const matchingOption = options.find((opt) => opt.toLowerCase() === lowerInterval);
    if (matchingOption) {
      return matchingOption;
    }

    // Try normalized name matching
    const normalizedInterval = this.normalizeIntervalName(interval);
    const normalizedMatch = options.find((opt) => this.normalizeIntervalName(opt) === normalizedInterval);
    if (normalizedMatch) {
      return normalizedMatch;
    }

    // Fallback to original value
    return interval;
  }

  /**
   * Normalize interval name for comparison
   */
  private normalizeIntervalName(interval: string): string {
    const lower = interval.toLowerCase();
    const mappings: Record<string, string> = {
      min_1: '1min',
      min_5: '5min',
      min_15: '15min',
      min_30: '30min',
      min_60: '60min',
      hourly: '60min',
    };
    return mappings[lower] || lower;
  }

  onPeriodChange(): void {
    // Get recommended intervals for this period (uses backend data when available)
    const recommended = this.getRecommendedIntervals(this.selectedPeriod);

    // If current interval isn't recommended, switch to first recommended
    const normalizedCurrent = this.normalizeIntervalName(this.selectedInterval);
    const isRecommended = recommended.some((r) => this.normalizeIntervalName(r) === normalizedCurrent);
    if (!isRecommended && recommended.length > 0) {
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
