// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { SafeHtml } from '@angular/platform-browser';

import { TableData } from '../../terminal.types';
import { DCFAnalysisData, DDMAnalysisData } from '../../valuation.service';
import { DividendAnalysisData } from '../../dividend.service';
import { DataTableComponent } from '../../data-table/data-table.component';
import { DividendsViewComponent } from '../../dividends-view/dividends-view.component';
import { FundamentalsViewComponent, FundamentalsCharts } from '../../fundamentals-view/fundamentals-view.component';
import {
  ValuationViewComponent,
  ValuationCharts,
  DdmCharts,
  ValuationModel,
} from '../../valuation-view/valuation-view.component';

/** Pre-built chart options for dividend charts. */
export interface DividendCharts {
  payoutRatio: EChartsOption;
  yearlyDividends: EChartsOption;
  cashFlowComparison: EChartsOption;
}

/** Pending background-job descriptor displayed beside the loading spinner. */
export interface PendingJobInfo {
  jobId: string;
  interval: string;
  symbol: string;
}

/**
 * Watchlist Chart Content Component
 *
 * Renders the main content area for the currently selected symbol — a
 * switcher across chart, fundamentals, valuation, dividends, table (HP),
 * data (DES), error, and placeholder views. All visibility decisions are
 * pre-computed in the parent and passed in as booleans so this template
 * stays under the lint complexity ceiling.
 *
 * Extracted from watchlist-tab to reduce template complexity.
 */
@Component({
  selector: 'app-watchlist-chart-content',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    NgxEchartsDirective,
    DataTableComponent,
    DividendsViewComponent,
    FundamentalsViewComponent,
    ValuationViewComponent,
  ],
  templateUrl: './watchlist-chart-content.component.html',
  styleUrl: './watchlist-chart-content.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistChartContentComponent {
  /** Chart-area visibility (pre-computed in parent). */
  @Input() showChartArea = false;
  @Input() chartOptions: EChartsOption | null = null;
  @Input() loadingMoreData = false;
  @Input() showNoMoreDataHint = false;
  @Input() selectedIntervalFormatted = '';

  /** Chart-loading visibility. */
  @Input() showChartLoading = false;
  @Input() chartLoadingLabel = 'chart';

  /** Fundamentals view. */
  @Input() showFundamentals = false;
  @Input() fundamentalsCharts: FundamentalsCharts | null = null;
  @Input() fundamentalsLoading = false;
  @Input() fundamentalsError: string | null = null;
  @Input() fundamentalsIsAnnual = true;

  /** Valuation view. */
  @Input() showValuation = false;
  @Input() valuationData: DCFAnalysisData | null = null;
  @Input() ddmData: DDMAnalysisData | null = null;
  @Input() valuationCharts: ValuationCharts | null = null;
  @Input() ddmCharts: DdmCharts | null = null;
  @Input() valuationLoading = false;
  @Input() valuationError: string | null = null;
  @Input() valuationHistoricalYears = 10;
  @Input() selectedValuationModel: ValuationModel = 'dcf';
  @Input() valuationLivePrice: number | null = null;

  /** Dividends view. */
  @Input() showDividends = false;
  @Input() dividendData: DividendAnalysisData | null = null;
  @Input() dividendCharts: DividendCharts | null = null;
  @Input() dividendLoading = false;
  @Input() dividendError: string | null = null;

  /** Table (HP) and data (DES) sections. */
  @Input() showTableData = false;
  @Input() tableData: TableData | null = null;
  @Input() showDataContentOnly = false;
  @Input() dataContent: SafeHtml | null = null;

  /** Error block. */
  @Input() showError = false;
  @Input() chartError: string | null = null;
  @Input() isChartErrorFetching = false;
  @Input() chartLoadingDetails: string | null = null;
  @Input() pendingJobInfo: PendingJobInfo | null = null;

  /** Placeholder block. */
  @Input() showPlaceholder = false;
  @Input() currentCommand = 'CHART';
  @Input() selectedSymbol: string | null = null;
  @Input() contentPlaceholderIcon = 'insert_chart';

  @Output() chartInitialized = new EventEmitter<echarts.ECharts>();
  @Output() periodToggle = new EventEmitter<void>();
  @Output() valuationModelChange = new EventEmitter<ValuationModel>();
  @Output() valuationYearsChange = new EventEmitter<number>();
  @Output() ocfToggleChange = new EventEmitter<boolean>();
  @Output() retry = new EventEmitter<void>();

  onChartInit(chart: echarts.ECharts): void {
    this.chartInitialized.emit(chart);
  }

  onPeriodToggle(): void {
    this.periodToggle.emit();
  }

  onValuationModelChange(model: ValuationModel): void {
    this.valuationModelChange.emit(model);
  }

  onValuationYearsChange(years: number): void {
    this.valuationYearsChange.emit(years);
  }

  onOcfToggleChange(show: boolean): void {
    this.ocfToggleChange.emit(show);
  }

  onRetry(): void {
    this.retry.emit();
  }
}
