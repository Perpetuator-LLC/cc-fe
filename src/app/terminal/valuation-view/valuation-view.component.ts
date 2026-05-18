// Copyright (c) 2026 Perpetuator LLC
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { FormulaDisplayComponent, FormulaVariable } from '../../shared/formula-display/formula-display.component';
import { DCF_FORMULAS, DDM_FORMULAS } from '../../shared/formula-display/valuation-formulas';
import { FinancialTableComponent, FinancialTableData } from '../shared/financial-table.component';
import { ToFixedPipe } from '../../shared/pipes';

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
    FinancialTableComponent,
    ToFixedPipe,
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

  /** Live price from real-time quote - overrides analysis currentPrice when provided */
  @Input() livePrice: number | null = null;

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
   * Get the current price to display - uses live price if available, otherwise analysis price
   */
  getDisplayPrice(model: 'dcf' | 'ddm'): number {
    if (this.livePrice !== null && this.livePrice > 0) {
      return this.livePrice;
    }
    if (model === 'dcf' && this.dcfData) {
      return this.dcfData.valuationSummary.currentPrice;
    }
    if (model === 'ddm' && this.ddmData) {
      return this.ddmData.currentPrice;
    }
    return 0;
  }

  /**
   * Get whether we're using live price (for UI indicator)
   */
  isUsingLivePrice(): boolean {
    return this.livePrice !== null && this.livePrice > 0;
  }

  /**
   * Calculate upside percentage based on display price (live or analysis)
   */
  getDisplayUpside(model: 'dcf' | 'ddm'): number {
    const currentPrice = this.getDisplayPrice(model);
    if (currentPrice <= 0) return 0;

    let intrinsicValue = 0;
    if (model === 'dcf' && this.dcfData) {
      intrinsicValue = this.dcfData.valuationSummary.intrinsicValueBase;
    } else if (model === 'ddm' && this.ddmData) {
      intrinsicValue = this.ddmData.intrinsicValue;
    }

    if (intrinsicValue <= 0) return 0;
    return ((intrinsicValue - currentPrice) / currentPrice) * 100;
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

  /**
   * Calculate historical valuation stats for the selected period
   */
  getHistoricalStats(): {
    avgPe: number | null;
    avgPb: number | null;
    avgPs: number | null;
    minPe: number | null;
    maxPe: number | null;
    currentPe: number | null;
    currentPb: number | null;
    currentPs: number | null;
  } {
    const hv = this.dcfData?.historicalValuation;
    if (!hv || hv.length === 0) {
      return {
        avgPe: null,
        avgPb: null,
        avgPs: null,
        minPe: null,
        maxPe: null,
        currentPe: null,
        currentPb: null,
        currentPs: null,
      };
    }

    // Filter data to the specified number of years
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - this.historicalYears);
    const filteredHv = hv.filter((point) => new Date(point.date) >= cutoffDate);

    if (filteredHv.length === 0) {
      return {
        avgPe: null,
        avgPb: null,
        avgPs: null,
        minPe: null,
        maxPe: null,
        currentPe: null,
        currentPb: null,
        currentPs: null,
      };
    }

    // Extract valid values
    const validPe = filteredHv.filter((d) => d.peRatio != null).map((d) => d.peRatio!);
    const validPb = filteredHv.filter((d) => d.pbRatio != null).map((d) => d.pbRatio!);
    const validPs = filteredHv.filter((d) => d.psRatio != null).map((d) => d.psRatio!);

    // Get current (most recent) values
    const latest = filteredHv[filteredHv.length - 1];

    return {
      avgPe: validPe.length > 0 ? validPe.reduce((a, b) => a + b, 0) / validPe.length : null,
      avgPb: validPb.length > 0 ? validPb.reduce((a, b) => a + b, 0) / validPb.length : null,
      avgPs: validPs.length > 0 ? validPs.reduce((a, b) => a + b, 0) / validPs.length : null,
      minPe: validPe.length > 0 ? Math.min(...validPe) : null,
      maxPe: validPe.length > 0 ? Math.max(...validPe) : null,
      currentPe: latest?.peRatio ?? null,
      currentPb: latest?.pbRatio ?? null,
      currentPs: latest?.psRatio ?? null,
    };
  }

  // Check if we have any data to display
  hasData = computed(() => {
    const model = this.selectedModel();
    if (model === 'dcf') {
      return this.dcfData !== null || this.dcfCharts !== null;
    }
    return this.ddmData !== null || this.ddmCharts !== null;
  });

  /**
   * Generate Cost of Equity (CAPM) calculation steps
   * Re = Rf + β × (Rm - Rf)
   */
  getCostOfEquitySteps(): { expressionHtml: string; result?: string }[] {
    if (!this.dcfData) return [];
    const rf = this.dcfData.assumptions.riskFreeRate;
    const beta = this.dcfData.assumptions.beta;
    const mrp = this.dcfData.assumptions.marketRiskPremium;
    const re = this.dcfData.baseCase.costOfEquity;

    return [
      {
        expressionHtml: `R<sub>e</sub> = ${rf.toFixed(2)}% + ${beta.toFixed(2)} × ${mrp.toFixed(2)}%`,
        result: `= ${re.toFixed(2)}%`,
      },
    ];
  }

  /**
   * Generate WACC calculation steps
   * WACC = (E/(E+D)) × Re + (D/(E+D)) × Rd × (1-T)
   */
  getWaccSteps(): { expressionHtml: string; result?: string }[] {
    if (!this.dcfData) return [];
    const bc = this.dcfData.baseCase;
    const taxRate = this.dcfData.assumptions.taxRate;

    const eWeight = (bc.equityWeight * 100).toFixed(1);
    const dWeight = (bc.debtWeight * 100).toFixed(1);
    const re = bc.costOfEquity.toFixed(2);
    const rd = bc.costOfDebt.toFixed(2);
    const taxFactor = (1 - taxRate / 100).toFixed(2);
    const wacc = bc.wacc.toFixed(2);

    return [
      {
        expressionHtml: `WACC = ${eWeight}% × ${re}% + ${dWeight}% × ${rd}% × ${taxFactor}`,
        result: `= ${wacc}%`,
      },
    ];
  }

  /**
   * Generate Terminal Value calculation steps
   * TV = FCFn × (1+g) / (WACC - g)
   */
  getTerminalValueSteps(): { expressionHtml: string; result?: string }[] {
    if (!this.dcfData) return [];
    const bc = this.dcfData.baseCase;
    const projections = bc.projections;
    if (projections.length === 0) return [];

    const lastFcf = projections[projections.length - 1].fcf / 1e9;
    const g = bc.terminalGrowthRate.toFixed(2);
    const wacc = bc.wacc.toFixed(2);
    const tv = bc.terminalValue / 1e9;

    return [
      {
        expressionHtml: `TV = $${lastFcf.toFixed(2)}B × (1 + ${g}%) / (${wacc}% − ${g}%)`,
        result: `= $${tv.toFixed(2)}B`,
      },
    ];
  }

  /**
   * Generate Intrinsic Value calculation steps
   * IV = Equity Value / Shares Outstanding
   */
  getIntrinsicValueSteps(): { expressionHtml: string; result?: string }[] {
    if (!this.dcfData) return [];
    const bc = this.dcfData.baseCase;

    const equityValue = (bc.equityValue / 1e9).toFixed(2);
    const shares = (bc.sharesOutstanding / 1e9).toFixed(3);
    const iv = bc.intrinsicValuePerShare.toFixed(2);

    return [
      {
        expressionHtml: `IV = $${equityValue}B / ${shares}B shares`,
        result: `= $${iv}`,
      },
    ];
  }

  /**
   * Generate projection table data for the financial table component
   */
  getProjectionTableData(): FinancialTableData {
    if (!this.dcfData) {
      return { years: [], rows: [] };
    }

    const projections = this.dcfData.baseCase.projections;
    const years = projections.map((p) => new Date(p.date).getFullYear().toString());

    return {
      years,
      rows: [
        {
          label: 'Free Cash Flow',
          isCurrency: true,
          values: projections.map((p) => p.fcf),
        },
        {
          label: 'Discounted FCF',
          isCurrency: true,
          values: projections.map((p) => p.discountedFcf),
        },
        {
          label: 'Growth Rate',
          isPercent: true,
          values: projections.map((p) => p.growthRate),
          highlightNegative: true,
        },
      ],
    };
  }

  /**
   * Build editable variables for Cost of Equity (CAPM) formula
   */
  getCostOfEquityVariables(): FormulaVariable[] {
    if (!this.dcfData) return [];
    return [
      {
        symbol: 'Rf',
        name: 'Risk-Free Rate',
        value: this.dcfData.assumptions.riskFreeRate,
        format: 'percent',
        editable: true,
        step: 0.1,
        min: 0,
        max: 10,
      },
      {
        symbol: 'β',
        name: 'Beta',
        value: this.dcfData.assumptions.beta,
        format: 'number',
        editable: true,
        step: 0.05,
        min: 0,
        max: 3,
      },
      {
        symbol: 'Rm − Rf',
        name: 'Market Risk Premium',
        value: this.dcfData.assumptions.marketRiskPremium,
        format: 'percent',
        editable: true,
        step: 0.5,
        min: 0,
        max: 15,
      },
    ];
  }

  /**
   * Build editable variables for Terminal Value formula
   */
  getTerminalValueVariables(): FormulaVariable[] {
    if (!this.dcfData) return [];
    return [
      {
        symbol: 'g',
        name: 'Terminal Growth Rate',
        value: this.dcfData.assumptions.terminalGrowthRate,
        format: 'percent',
        editable: true,
        step: 0.1,
        min: 0,
        max: 5,
      },
    ];
  }

  /**
   * Build editable variables for DDM formula
   */
  getDdmVariables(): FormulaVariable[] {
    if (!this.ddmData) return [];
    return [
      {
        symbol: 'D₀',
        name: 'Current Dividend',
        value: this.ddmData.currentDividendPerShare,
        format: 'currency',
        editable: false,
      },
      {
        symbol: 'g',
        name: 'Growth Rate',
        value: this.ddmData.terminalGrowthRate,
        format: 'percent',
        editable: true,
        step: 0.5,
        min: 0,
        max: 15,
      },
      {
        symbol: 'r',
        name: 'Cost of Equity',
        value: this.ddmData.costOfEquity,
        format: 'percent',
        editable: true,
        step: 0.5,
        min: 1,
        max: 20,
      },
    ];
  }

  /**
   * Gordon Growth Model calculation steps
   */
  getGordonGrowthSteps(): { label?: string; expressionHtml: string; result?: string }[] {
    if (!this.ddmData) return [];

    const d0 = this.ddmData.currentDividendPerShare.toFixed(2);
    const g = this.ddmData.terminalGrowthRate.toFixed(2);
    const r = this.ddmData.costOfEquity.toFixed(2);
    const d1 = (this.ddmData.currentDividendPerShare * (1 + this.ddmData.terminalGrowthRate / 100)).toFixed(2);
    const denominator = (this.ddmData.costOfEquity - this.ddmData.terminalGrowthRate).toFixed(2);
    const iv = this.ddmData.intrinsicValue.toFixed(2);

    return [
      {
        label: 'Next year dividend:',
        expressionHtml: `D<sub>1</sub> = $${d0} × (1 + ${g}%)`,
        result: `= $${d1}`,
      },
      {
        label: 'Substituting values:',
        expressionHtml: `P = $${d1} / (${r}% − ${g}%)`,
        result: `= $${d1} / ${denominator}%`,
      },
      {
        expressionHtml: `P = $${iv}`,
      },
    ];
  }

  /**
   * DDM Intrinsic Value calculation steps
   */
  getDdmIntrinsicValueSteps(): { label?: string; expressionHtml: string; result?: string }[] {
    if (!this.ddmData) return [];

    const pvDiv = this.ddmData.presentValueDividends.toFixed(2);
    const pvTerm = this.ddmData.presentValueTerminal.toFixed(2);
    const iv = this.ddmData.intrinsicValue.toFixed(2);

    return [
      {
        expressionHtml: `IV = $${pvDiv} + $${pvTerm}`,
        result: `= $${iv}`,
      },
    ];
  }

  /**
   * Generate DDM projection table data
   */
  getDdmProjectionTableData(): FinancialTableData {
    if (!this.ddmData?.projectedDividends) {
      return { years: [], rows: [] };
    }

    const projections = this.ddmData.projectedDividends;
    const years = projections.map((p) => new Date(p.date).getFullYear().toString());

    return {
      years,
      rows: [
        {
          label: 'Dividend/Share',
          isCurrency: true,
          values: projections.map((p) => p.dividendPerShare ?? null),
        },
        {
          label: 'Discounted Value',
          isCurrency: true,
          values: projections.map((p) => p.discountedDividend ?? null),
        },
        {
          label: 'Growth Rate',
          isPercent: true,
          values: projections.map((p) => p.growthRate ?? null),
          highlightNegative: true,
        },
      ],
    };
  }
}
