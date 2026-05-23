// Copyright (c) 2026 Perpetuator LLC
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DCFAnalysisData } from '../../valuation.service';
import { KpiCardComponent } from '../../shared/kpi-card/kpi-card.component';
import { CHART_DEFINITIONS } from '../../../shared/chart-info/chart-definitions';
import { ToFixedPipe } from '../../../shared/pipes';
import { ValuationCharts } from '../valuation-view.component';

/**
 * Pre-computed historical-valuation stats used for KPI display.
 */
interface HistoricalStatsDisplay {
  currentPe: string;
  avgPe: string;
  peRangeLabel: string;
  avgPb: string;
  avgPs: string;
}

/**
 * DCF Historical Valuation section. Renders trend KPIs (P/E, P/B, P/S) and
 * supporting charts for the chosen lookback period.
 */
@Component({
  selector: 'app-dcf-historical-view',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    NgxEchartsDirective,
    KpiCardComponent,
    ToFixedPipe,
  ],
  templateUrl: './dcf-historical-view.component.html',
  styleUrl: './dcf-historical-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DcfHistoricalViewComponent {
  protected readonly CHART_DEFINITIONS = CHART_DEFINITIONS;

  private _dcfData = signal<DCFAnalysisData | null>(null);
  private _historicalYears = signal(10);

  @Input() set dcfData(v: DCFAnalysisData | null) {
    this._dcfData.set(v);
  }
  get dcfData(): DCFAnalysisData | null {
    return this._dcfData();
  }

  @Input() dcfCharts: ValuationCharts | null = null;

  @Input() set historicalYears(v: number) {
    this._historicalYears.set(v);
  }
  get historicalYears(): number {
    return this._historicalYears();
  }

  @Output() historicalYearsChange = new EventEmitter<number>();

  /** True when historical data is present (non-empty array). */
  readonly hasHistorical = computed(() => {
    const hv = this._dcfData()?.historicalValuation;
    return !!hv && hv.length > 0;
  });

  /** Pre-formatted period labels (e.g. "5Y Avg P/E"). */
  readonly periodLabelPe = computed(() => `${this._historicalYears()}Y Avg P/E`);
  readonly periodLabelPb = computed(() => `${this._historicalYears()}Y Avg P/B`);
  readonly periodLabelPs = computed(() => `${this._historicalYears()}Y Avg P/S`);

  /**
   * Calculated stats with all values pre-formatted as strings (with N/A
   * fallbacks). Computed once per data/period change.
   */
  readonly stats = computed<HistoricalStatsDisplay>(() => {
    const empty: HistoricalStatsDisplay = {
      currentPe: 'N/A',
      avgPe: 'N/A',
      peRangeLabel: 'N/A',
      avgPb: 'N/A',
      avgPs: 'N/A',
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

    const fmt = (n: number | null | undefined): string => (n == null ? 'N/A' : n.toFixed(1));
    const avg = (arr: number[]): number | null => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

    const minPe = validPe.length > 0 ? Math.min(...validPe) : null;
    const maxPe = validPe.length > 0 ? Math.max(...validPe) : null;
    const peRangeLabel = minPe == null || maxPe == null ? 'N/A' : `${minPe.toFixed(1)} - ${maxPe.toFixed(1)}`;

    return {
      currentPe: fmt(latest?.peRatio ?? null),
      avgPe: fmt(avg(validPe)),
      peRangeLabel,
      avgPb: fmt(avg(validPb)),
      avgPs: fmt(avg(validPs)),
    };
  });
}
