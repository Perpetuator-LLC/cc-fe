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
import { KpiCardComponent } from '../shared/kpi-card/kpi-card.component';
import { ChartInfoComponent } from '../../shared/chart-info/chart-info.component';
import { CHART_DEFINITIONS } from '../../shared/chart-info/chart-definitions';

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
    KpiCardComponent,
    ChartInfoComponent,
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
  @Input() data: DividendAnalysisData | null = null;

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
