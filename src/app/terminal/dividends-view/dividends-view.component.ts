// Copyright (c) 2026 Perpetuator LLC
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { DividendAnalysisData } from '../dividend.service';
import { DividendChartService } from '../dividend-chart.service';
import { ChartInfoComponent } from '../../shared/chart-info/chart-info.component';
import { CHART_DEFINITIONS } from '../../shared/chart-info/chart-definitions';
import { DividendMetricsComponent } from './dividend-metrics/dividend-metrics.component';
import { DividendDataTableComponent } from './dividend-data-table/dividend-data-table.component';

/**
 * Dividends View Component
 *
 * Displays dividend analysis including:
 * - Key metrics (yield, payout ratios, CAGRs)
 * - Annual dividend chart
 * - Payout ratio chart
 * - Cash flow comparison chart
 * - Historical data table
 */
@Component({
  selector: 'app-dividends-view',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    NgxEchartsDirective,
    ChartInfoComponent,
    DividendMetricsComponent,
    DividendDataTableComponent,
  ],
  templateUrl: './dividends-view.component.html',
  styleUrl: './dividends-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DividendsViewComponent {
  dividendChartService = inject(DividendChartService);

  /** Chart definitions for educational tooltips */
  protected readonly CHART_DEFINITIONS = CHART_DEFINITIONS;

  /** Dividend analysis data from service */
  private _data = signal<DividendAnalysisData | null>(null);
  @Input() set data(value: DividendAnalysisData | null) {
    this._data.set(value);
  }
  get data(): DividendAnalysisData | null {
    return this._data();
  }

  /**
   * Pre-enriched yearly data with formatted currency / percent strings and
   * pre-computed warning flags so the table can read property access
   * instead of calling formatters per change-detection tick.
   */
  readonly enrichedYearlyData = computed(() => {
    const data = this._data();
    if (!data) return [];
    return data.yearlyData.map((year) => ({
      ...year,
      formattedFreeCashFlow: this.dividendChartService.formatCurrency(year.freeCashFlow),
      formattedDividendsPaid: this.dividendChartService.formatCurrency(
        year.dividendPayout ? -year.dividendPayout : null,
      ),
      formattedFcfPayoutRatio: this.dividendChartService.formatPercent(
        year.fcfPayoutRatio ? year.fcfPayoutRatio * 100 : null,
      ),
      formattedNetIncomePayoutRatio: this.dividendChartService.formatPercent(
        year.netIncomePayoutRatio ? year.netIncomePayoutRatio * 100 : null,
      ),
      fcfPayoutWarning: !!(year.fcfPayoutRatio && year.fcfPayoutRatio > 0.8),
      netIncomePayoutWarning: !!(year.netIncomePayoutRatio && year.netIncomePayoutRatio > 0.8),
    }));
  });

  /**
   * Pre-formatted dividend metric strings so the template avoids `??`/`?:`
   * ternaries that inflate template cyclomatic complexity.
   */
  readonly formattedMetrics = computed(() => {
    const data = this._data();
    if (!data) return null;
    const m = data.metrics;
    return {
      currentPrice: `$${m.currentPrice.toFixed(2)}`,
      dividendYield: m.dividendYield !== null ? `${m.dividendYield.toFixed(2)}%` : null,
      ttmPayoutRatio: m.ttmPayoutRatio !== null ? `${m.ttmPayoutRatio.toFixed(1)}%` : null,
      ttmFcfPayoutRatio: m.ttmFcfPayoutRatio !== null ? `${m.ttmFcfPayoutRatio.toFixed(1)}%` : null,
      dividendCagr5Year: this.formatSignedPercent(m.dividendCagr5Year),
      dividendCagr5YearValue: m.dividendCagr5Year,
      dividendCagr10Year: this.formatSignedPercent(m.dividendCagr10Year),
      dividendCagr10YearValue: m.dividendCagr10Year,
      fcfCagr5Year: this.formatSignedPercent(m.fcfCagr5Year),
      fcfCagr5YearValue: m.fcfCagr5Year,
      fcfCagr10Year: this.formatSignedPercent(m.fcfCagr10Year),
      fcfCagr10YearValue: m.fcfCagr10Year,
    };
  });

  /** Combined display state: 'loading' | 'error' | 'empty' | 'ready'. */
  get viewState(): 'loading' | 'error' | 'empty' | 'ready' {
    if (this.loading) return 'loading';
    if (this.error && !this.charts) return 'error';
    if (!this.charts) return 'empty';
    return 'ready';
  }

  /** Format a signed percent with one decimal, prepending '+' when > 0. */
  private formatSignedPercent(value: number | null): string | null {
    if (value === null) return null;
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  /** Pre-built ECharts options for dividend charts */
  @Input() charts: {
    payoutRatio: EChartsOption;
    yearlyDividends: EChartsOption;
    cashFlowComparison: EChartsOption;
  } | null = null;

  /** Loading state */
  @Input() loading = false;

  /** Error message */
  @Input() error: string | null = null;

  /** Show Operating Cash Flow in comparison chart */
  showOperatingCashFlow = signal(false);

  /** Emitted when OCF toggle changes */
  @Output() ocfToggleChange = new EventEmitter<boolean>();

  toggleOperatingCashFlow(): void {
    const newValue = !this.showOperatingCashFlow();
    this.showOperatingCashFlow.set(newValue);
    this.ocfToggleChange.emit(newValue);
  }

  // Computed: Check if we have data to display
  hasData = computed(() => !!this.data && !!this.charts);
}
