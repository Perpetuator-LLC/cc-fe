// Copyright (c) 2026 Perpetuator LLC
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { DCFAnalysisData, DDMAnalysisData } from '../valuation.service';
import { KpiCardComponent } from '../shared/kpi-card/kpi-card.component';

/**
 * DCF valuation charts structure
 */
export interface ValuationCharts {
  fcfProjection: EChartsOption;
  valuationComparison: EChartsOption;
  enterpriseValue: EChartsOption;
  sensitivityHeatmap: EChartsOption;
  historicalFinancials: EChartsOption;
  historicalValuation: EChartsOption | null;
  peBand: EChartsOption | null;
}

/**
 * DDM valuation charts structure
 */
export interface DdmCharts {
  dividendProjection: EChartsOption | null;
  valuation: EChartsOption;
  breakdown: EChartsOption;
}

export type ValuationModel = 'dcf' | 'ddm';
export type ValuationDrillDown = 'summary' | 'historical' | 'projections' | 'sensitivity' | 'methodology';

/**
 * Valuation View Component
 *
 * Displays valuation analysis including:
 * - DCF (Discounted Cash Flow) model
 * - DDM (Dividend Discount Model)
 * - Summary, Historical, Projections, Sensitivity, Methodology views
 */
@Component({
  selector: 'app-valuation-view',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    MatTableModule,
    MatTooltipModule,
    NgxEchartsDirective,
    KpiCardComponent,
    DatePipe,
  ],
  templateUrl: './valuation-view.component.html',
  styleUrl: './valuation-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValuationViewComponent {
  /** DCF analysis data */
  @Input() dcfData: DCFAnalysisData | null = null;

  /** DDM analysis data */
  @Input() ddmData: DDMAnalysisData | null = null;

  /** DCF charts */
  @Input() dcfCharts: ValuationCharts | null = null;

  /** DDM charts */
  @Input() ddmCharts: DdmCharts | null = null;

  /** Loading state */
  @Input() loading = false;

  /** Error message */
  @Input() error: string | null = null;

  /** Currently selected valuation model */
  selectedModel = signal<ValuationModel>('dcf');

  /** Currently selected drill-down view */
  drillDown = signal<ValuationDrillDown>('summary');

  /** Emitted when model changes */
  @Output() modelChange = new EventEmitter<ValuationModel>();

  onModelChange(model: ValuationModel): void {
    this.selectedModel.set(model);
    this.modelChange.emit(model);
  }

  setDrillDown(view: ValuationDrillDown): void {
    this.drillDown.set(view);
  }

  // Check if we have any data to display
  hasData = computed(() => {
    const model = this.selectedModel();
    if (model === 'dcf') {
      return this.dcfData !== null || this.dcfCharts !== null;
    }
    return this.ddmData !== null || this.ddmCharts !== null;
  });
}
