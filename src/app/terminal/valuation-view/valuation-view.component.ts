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
import { DdmViewComponent } from './ddm-view/ddm-view.component';
import { DcfHistoricalViewComponent } from './dcf-historical-view/dcf-historical-view.component';

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
    DdmViewComponent,
    DcfHistoricalViewComponent,
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

  /**
   * Private signals backing the public inputs. Setters keep them in sync so
   * `computed(...)` derivations re-run whenever a parent updates an input
   * (necessary under OnPush since plain @Input changes don't trigger signal
   * reactivity).
   */
  private _dcfData = signal<DCFAnalysisData | null>(null);
  private _ddmData = signal<DDMAnalysisData | null>(null);
  private _historicalYears = signal(10);
  private _livePrice = signal<number | null>(null);

  /** DCF analysis data */
  @Input() set dcfData(v: DCFAnalysisData | null) {
    this._dcfData.set(v);
  }
  get dcfData(): DCFAnalysisData | null {
    return this._dcfData();
  }

  /** DDM analysis data */
  @Input() set ddmData(v: DDMAnalysisData | null) {
    this._ddmData.set(v);
  }
  get ddmData(): DDMAnalysisData | null {
    return this._ddmData();
  }

  /** DCF charts */
  @Input() dcfCharts: ValuationCharts | null = null;

  /** DDM charts */
  @Input() ddmCharts: DdmCharts | null = null;

  /** Loading state */
  @Input() loading = false;

  /** Error message */
  @Input() error: string | null = null;

  /** Historical chart years (5 or 10) */
  @Input() set historicalYears(v: number) {
    this._historicalYears.set(v);
  }
  get historicalYears(): number {
    return this._historicalYears();
  }

  /** Live price from real-time quote - overrides analysis currentPrice when provided */
  @Input() set livePrice(v: number | null) {
    this._livePrice.set(v);
  }
  get livePrice(): number | null {
    return this._livePrice();
  }

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
   * Get the current price to display - uses live price if available, otherwise analysis price.
   * Kept as a method so non-template callers can request a specific model.
   */
  getDisplayPrice(model: 'dcf' | 'ddm'): number {
    const live = this._livePrice();
    if (live !== null && live > 0) return live;
    const dcf = this._dcfData();
    const ddm = this._ddmData();
    if (model === 'dcf' && dcf) return dcf.valuationSummary.currentPrice;
    if (model === 'ddm' && ddm) return ddm.currentPrice;
    return 0;
  }

  /** Pre-computed display prices for templates (no-arg signal reads). */
  readonly dcfDisplayPrice = computed(() => this.getDisplayPrice('dcf'));
  readonly ddmDisplayPrice = computed(() => this.getDisplayPrice('ddm'));

  /** Whether we're using live price (for UI indicator). Computed signal. */
  readonly isUsingLivePrice = computed(() => {
    const live = this._livePrice();
    return live !== null && live > 0;
  });

  /**
   * Calculate upside percentage based on display price (live or analysis).
   * Kept as a method so non-template callers can request a specific model.
   */
  getDisplayUpside(model: 'dcf' | 'ddm'): number {
    const currentPrice = this.getDisplayPrice(model);
    if (currentPrice <= 0) return 0;
    const dcf = this._dcfData();
    const ddm = this._ddmData();
    let intrinsicValue = 0;
    if (model === 'dcf' && dcf) intrinsicValue = dcf.valuationSummary.intrinsicValueBase;
    else if (model === 'ddm' && ddm) intrinsicValue = ddm.intrinsicValue;
    if (intrinsicValue <= 0) return 0;
    return ((intrinsicValue - currentPrice) / currentPrice) * 100;
  }

  /** Pre-computed upsides for templates. */
  readonly dcfDisplayUpside = computed(() => this.getDisplayUpside('dcf'));
  readonly ddmDisplayUpside = computed(() => this.getDisplayUpside('ddm'));

  /** Pre-computed price label for the DCF current-price KPI card. */
  readonly dcfPriceLabel = computed(() => (this.isUsingLivePrice() ? 'Current Price (Live)' : 'Current Price'));

  /** Pre-computed accent for the DCF current-price KPI card. */
  readonly dcfPriceAccent = computed<'success' | 'none'>(() => (this.isUsingLivePrice() ? 'success' : 'none'));

  /** True when the DCF currency-warning banner should render. */
  readonly showDcfCurrencyWarning = computed(() => {
    const data = this._dcfData();
    return this.selectedModel() === 'dcf' && !!data?.currencyNote && data.tradingCurrency !== data.reportingCurrency;
  });

  /**
   * Format DDM model type to friendly display name. Pure function — kept for
   * non-template callers; templates use `ddmModelTypeLabel` instead.
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

  /** Pre-computed model-type label for the currently loaded DDM data. */
  readonly ddmModelTypeLabel = computed(() => {
    const data = this._ddmData();
    return data ? this.formatModelType(data.modelType) : '';
  });

  /** Pre-computed "years of dividend data" as a string for [value] bindings. */
  readonly ddmYearsOfData = computed(() => {
    const data = this._ddmData();
    return data ? String(data.summaryStats.yearsOfDividendData) : '';
  });

  /**
   * Calculate historical valuation stats for the selected period.
   * Computed signal so it re-runs only when `dcfData` or `historicalYears`
   * actually change — not on every CD tick.
   */
  readonly historicalStats = computed<{
    avgPe: number | null;
    avgPb: number | null;
    avgPs: number | null;
    minPe: number | null;
    maxPe: number | null;
    currentPe: number | null;
    currentPb: number | null;
    currentPs: number | null;
  }>(() => {
    const empty = {
      avgPe: null,
      avgPb: null,
      avgPs: null,
      minPe: null,
      maxPe: null,
      currentPe: null,
      currentPb: null,
      currentPs: null,
    };
    const hv = this._dcfData()?.historicalValuation;
    if (!hv || hv.length === 0) return empty;

    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - this._historicalYears());
    const filteredHv = hv.filter((point) => new Date(point.date) >= cutoffDate);
    if (filteredHv.length === 0) return empty;

    const validPe = filteredHv.filter((d) => d.peRatio != null).map((d) => d.peRatio!);
    const validPb = filteredHv.filter((d) => d.pbRatio != null).map((d) => d.pbRatio!);
    const validPs = filteredHv.filter((d) => d.psRatio != null).map((d) => d.psRatio!);
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
  });

  // Check if we have any data to display
  hasData = computed(() => {
    const model = this.selectedModel();
    if (model === 'dcf') {
      return this.dcfData !== null || this.dcfCharts !== null;
    }
    return this.ddmData !== null || this.ddmCharts !== null;
  });

  /**
   * Cost of Equity (CAPM) calculation steps. Re = Rf + β × (Rm - Rf).
   */
  readonly costOfEquitySteps = computed<{ expressionHtml: string; result?: string }[]>(() => {
    const data = this._dcfData();
    if (!data) return [];
    const rf = data.assumptions.riskFreeRate;
    const beta = data.assumptions.beta;
    const mrp = data.assumptions.marketRiskPremium;
    const re = data.baseCase.costOfEquity;
    return [
      {
        expressionHtml: `R<sub>e</sub> = ${rf.toFixed(2)}% + ${beta.toFixed(2)} × ${mrp.toFixed(2)}%`,
        result: `= ${re.toFixed(2)}%`,
      },
    ];
  });

  /**
   * WACC calculation steps. WACC = (E/(E+D)) × Re + (D/(E+D)) × Rd × (1-T).
   */
  readonly waccSteps = computed<{ expressionHtml: string; result?: string }[]>(() => {
    const data = this._dcfData();
    if (!data) return [];
    const bc = data.baseCase;
    const taxRate = data.assumptions.taxRate;
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
  });

  /**
   * Terminal Value calculation steps. TV = FCFn × (1+g) / (WACC - g).
   */
  readonly terminalValueSteps = computed<{ expressionHtml: string; result?: string }[]>(() => {
    const data = this._dcfData();
    if (!data) return [];
    const bc = data.baseCase;
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
  });

  /**
   * Intrinsic Value calculation steps. IV = Equity Value / Shares Outstanding.
   */
  readonly intrinsicValueSteps = computed<{ expressionHtml: string; result?: string }[]>(() => {
    const data = this._dcfData();
    if (!data) return [];
    const bc = data.baseCase;
    const equityValue = (bc.equityValue / 1e9).toFixed(2);
    const shares = (bc.sharesOutstanding / 1e9).toFixed(3);
    const iv = bc.intrinsicValuePerShare.toFixed(2);
    return [
      {
        expressionHtml: `IV = $${equityValue}B / ${shares}B shares`,
        result: `= $${iv}`,
      },
    ];
  });

  /** Projection table data for the FinancialTableComponent. */
  readonly projectionTableData = computed<FinancialTableData>(() => {
    const data = this._dcfData();
    if (!data) return { years: [], rows: [] };
    const projections = data.baseCase.projections;
    const years = projections.map((p) => new Date(p.date).getFullYear().toString());
    return {
      years,
      rows: [
        { label: 'Free Cash Flow', isCurrency: true, values: projections.map((p) => p.fcf) },
        { label: 'Discounted FCF', isCurrency: true, values: projections.map((p) => p.discountedFcf) },
        {
          label: 'Growth Rate',
          isPercent: true,
          values: projections.map((p) => p.growthRate),
          highlightNegative: true,
        },
      ],
    };
  });

  /** Editable variables for Cost of Equity (CAPM) formula. */
  readonly costOfEquityVariables = computed<FormulaVariable[]>(() => {
    const data = this._dcfData();
    if (!data) return [];
    return [
      {
        symbol: 'Rf',
        name: 'Risk-Free Rate',
        value: data.assumptions.riskFreeRate,
        format: 'percent',
        editable: true,
        step: 0.1,
        min: 0,
        max: 10,
      },
      {
        symbol: 'β',
        name: 'Beta',
        value: data.assumptions.beta,
        format: 'number',
        editable: true,
        step: 0.05,
        min: 0,
        max: 3,
      },
      {
        symbol: 'Rm − Rf',
        name: 'Market Risk Premium',
        value: data.assumptions.marketRiskPremium,
        format: 'percent',
        editable: true,
        step: 0.5,
        min: 0,
        max: 15,
      },
    ];
  });

  /** Editable variables for Terminal Value formula. */
  readonly terminalValueVariables = computed<FormulaVariable[]>(() => {
    const data = this._dcfData();
    if (!data) return [];
    return [
      {
        symbol: 'g',
        name: 'Terminal Growth Rate',
        value: data.assumptions.terminalGrowthRate,
        format: 'percent',
        editable: true,
        step: 0.1,
        min: 0,
        max: 5,
      },
    ];
  });

  /** Editable variables for DDM formula. */
  readonly ddmVariables = computed<FormulaVariable[]>(() => {
    const data = this._ddmData();
    if (!data) return [];
    return [
      {
        symbol: 'D₀',
        name: 'Current Dividend',
        value: data.currentDividendPerShare,
        format: 'currency',
        editable: false,
      },
      {
        symbol: 'g',
        name: 'Growth Rate',
        value: data.terminalGrowthRate,
        format: 'percent',
        editable: true,
        step: 0.5,
        min: 0,
        max: 15,
      },
      {
        symbol: 'r',
        name: 'Cost of Equity',
        value: data.costOfEquity,
        format: 'percent',
        editable: true,
        step: 0.5,
        min: 1,
        max: 20,
      },
    ];
  });

  /** Gordon Growth Model calculation steps. */
  readonly gordonGrowthSteps = computed<{ label?: string; expressionHtml: string; result?: string }[]>(() => {
    const data = this._ddmData();
    if (!data) return [];
    const d0 = data.currentDividendPerShare.toFixed(2);
    const g = data.terminalGrowthRate.toFixed(2);
    const r = data.costOfEquity.toFixed(2);
    const d1 = (data.currentDividendPerShare * (1 + data.terminalGrowthRate / 100)).toFixed(2);
    const denominator = (data.costOfEquity - data.terminalGrowthRate).toFixed(2);
    const iv = data.intrinsicValue.toFixed(2);
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
      { expressionHtml: `P = $${iv}` },
    ];
  });

  /** DDM Intrinsic Value calculation steps. */
  readonly ddmIntrinsicValueSteps = computed<{ label?: string; expressionHtml: string; result?: string }[]>(() => {
    const data = this._ddmData();
    if (!data) return [];
    const pvDiv = data.presentValueDividends.toFixed(2);
    const pvTerm = data.presentValueTerminal.toFixed(2);
    const iv = data.intrinsicValue.toFixed(2);
    return [{ expressionHtml: `IV = $${pvDiv} + $${pvTerm}`, result: `= $${iv}` }];
  });

  /** DDM projection table data. */
  readonly ddmProjectionTableData = computed<FinancialTableData>(() => {
    const data = this._ddmData();
    if (!data?.projectedDividends) return { years: [], rows: [] };
    const projections = data.projectedDividends;
    const years = projections.map((p) => new Date(p.date).getFullYear().toString());
    return {
      years,
      rows: [
        { label: 'Dividend/Share', isCurrency: true, values: projections.map((p) => p.dividendPerShare ?? null) },
        { label: 'Discounted Value', isCurrency: true, values: projections.map((p) => p.discountedDividend ?? null) },
        {
          label: 'Growth Rate',
          isPercent: true,
          values: projections.map((p) => p.growthRate ?? null),
          highlightNegative: true,
        },
      ],
    };
  });
}
