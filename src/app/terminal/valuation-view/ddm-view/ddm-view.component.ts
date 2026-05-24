// Copyright (c) 2026 Perpetuator LLC
import { Component, Input, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DDMAnalysisData } from '../../valuation.service';
import { KpiCardComponent } from '../../shared/kpi-card/kpi-card.component';
import { CHART_DEFINITIONS } from '../../../shared/chart-info/chart-definitions';
import { FormulaDisplayComponent, FormulaVariable } from '../../../shared/formula-display/formula-display.component';
import { DDM_FORMULAS } from '../../../shared/formula-display/valuation-formulas';
import { FinancialTableComponent, FinancialTableData } from '../../shared/financial-table.component';
import { ToFixedPipe } from '../../../shared/pipes';
import { DdmCharts, ValuationDrillDown } from '../valuation-view.component';

/**
 * DDM (Dividend Discount Model) section of the valuation view.
 * Renders the summary, historical, projections, sensitivity, and methodology
 * drill-downs for DDM analyses.
 */
@Component({
  selector: 'app-ddm-view',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    NgxEchartsDirective,
    KpiCardComponent,
    FormulaDisplayComponent,
    FinancialTableComponent,
    ToFixedPipe,
  ],
  templateUrl: './ddm-view.component.html',
  styleUrl: './ddm-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DdmViewComponent {
  protected readonly CHART_DEFINITIONS = CHART_DEFINITIONS;
  protected readonly DDM_FORMULAS = DDM_FORMULAS;

  private _ddmData = signal<DDMAnalysisData | null>(null);
  private _livePrice = signal<number | null>(null);

  /** DDM analysis data */
  @Input() set ddmData(v: DDMAnalysisData | null) {
    this._ddmData.set(v);
  }
  get ddmData(): DDMAnalysisData | null {
    return this._ddmData();
  }

  /** DDM charts */
  @Input() ddmCharts: DdmCharts | null = null;

  /** Currently selected drill-down view */
  @Input() drillDown: ValuationDrillDown = 'summary';

  /** Live price from real-time quote */
  @Input() set livePrice(v: number | null) {
    this._livePrice.set(v);
  }
  get livePrice(): number | null {
    return this._livePrice();
  }

  /** Pre-computed display price (live if available, else analysis price). */
  readonly displayPrice = computed(() => {
    const live = this._livePrice();
    if (live !== null && live > 0) return live;
    const data = this._ddmData();
    return data ? data.currentPrice : 0;
  });

  /** Whether we're using live price (for UI indicator). */
  readonly isUsingLivePrice = computed(() => {
    const live = this._livePrice();
    return live !== null && live > 0;
  });

  /** Upside percentage based on display price. */
  readonly displayUpside = computed(() => {
    const currentPrice = this.displayPrice();
    if (currentPrice <= 0) return 0;
    const data = this._ddmData();
    if (!data || data.intrinsicValue <= 0) return 0;
    return ((data.intrinsicValue - currentPrice) / currentPrice) * 100;
  });

  /** Format DDM model type to friendly display name. */
  private formatModelType(modelType: string): string {
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
  readonly modelTypeLabel = computed(() => {
    const data = this._ddmData();
    return data ? this.formatModelType(data.modelType) : '';
  });

  /** Pre-computed "years of dividend data" as a string for [value] bindings. */
  readonly yearsOfData = computed(() => {
    const data = this._ddmData();
    return data ? String(data.summaryStats.yearsOfDividendData) : '';
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

  /** Pre-computed price label for the current-price KPI card. */
  readonly priceLabel = computed(() => (this.isUsingLivePrice() ? 'Current Price (Live)' : 'Current Price'));

  /** Pre-computed accent for the current-price KPI card. */
  readonly priceAccent = computed<'success' | 'none'>(() => (this.isUsingLivePrice() ? 'success' : 'none'));

  /** True when this view should render the currency warning banner. */
  readonly showCurrencyWarning = computed(() => {
    const data = this._ddmData();
    return !!(data?.currencyNote && data.tradingCurrency !== data.reportingCurrency);
  });
}
