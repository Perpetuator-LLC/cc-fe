// Copyright (c) 2026 Perpetuator LLC
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { DCFAnalysisData, DDMAnalysisData } from '../valuation.service';
import { KpiCardComponent } from '../shared/kpi-card/kpi-card.component';
import { CHART_DEFINITIONS } from '../../shared/chart-info/chart-definitions';
import { FormulaDisplayComponent } from '../../shared/formula-display/formula-display.component';
import { DCF_FORMULAS, DDM_FORMULAS } from '../../shared/formula-display/valuation-formulas';

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
  priceVsValuation: EChartsOption | null;
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
    MatSelectModule,
    MatFormFieldModule,
    NgxEchartsDirective,
    KpiCardComponent,
    FormulaDisplayComponent,
    DatePipe,
  ],
  templateUrl: './valuation-view.component.html',
  styleUrl: './valuation-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValuationViewComponent {
  /** Chart definitions for tooltips */
  protected readonly CHART_DEFINITIONS = CHART_DEFINITIONS;
  protected readonly DCF_FORMULAS = DCF_FORMULAS;
  protected readonly DDM_FORMULAS = DDM_FORMULAS;

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

  /** Historical chart years (5 or 10) */
  @Input() historicalYears = 10;

  /** Current model from parent */
  @Input() set model(value: ValuationModel) {
    if (value) {
      this.selectedModel.set(value);
    }
  }

  /** Currently selected valuation model */
  selectedModel = signal<ValuationModel>('dcf');

  /** Currently selected drill-down view */
  drillDown = signal<ValuationDrillDown>('summary');

  /** Emitted when model changes */
  @Output() modelChange = new EventEmitter<ValuationModel>();

  /** Emitted when historical years changes */
  @Output() historicalYearsChange = new EventEmitter<number>();

  onModelChange(model: ValuationModel): void {
    this.selectedModel.set(model);
    this.modelChange.emit(model);
  }

  setDrillDown(view: ValuationDrillDown): void {
    this.drillDown.set(view);
  }

  onHistoricalYearsChange(years: number): void {
    this.historicalYearsChange.emit(years);
  }

  /**
   * Format DDM model type to friendly display name
   */
  formatModelType(modelType: string): string {
    const names: Record<string, string> = {
      gordon: 'Gordon Growth',
      gordon_growth: 'Gordon Growth',
      two_stage: 'Two-Stage Growth',
      h_model: 'H-Model (Declining Growth)',
      three_stage: 'Three-Stage Growth',
    };
    return names[modelType.toLowerCase()] || modelType;
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
