// Copyright (c) 2026 Perpetuator LLC
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { ChartInfoComponent } from '../../shared/chart-info/chart-info.component';
import { CHART_DEFINITIONS } from '../../shared/chart-info/chart-definitions';

/**
 * Fundamentals charts structure
 */
export interface FundamentalsCharts {
  incomeStatement: EChartsOption;
  balanceSheet: EChartsOption;
  cashFlow: EChartsOption;
  margins: EChartsOption;
  eps: EChartsOption;
  revenue: EChartsOption;
}

/**
 * Fundamentals View Component
 *
 * Displays fundamental financial data:
 * - Revenue & Cost chart
 * - Income Statement chart
 * - EPS chart
 * - Balance Sheet chart
 * - Cash Flow chart
 * - Margins chart
 */
@Component({
  selector: 'app-fundamentals-view',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    NgxEchartsDirective,
    ChartInfoComponent,
  ],
  templateUrl: './fundamentals-view.component.html',
  styleUrl: './fundamentals-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FundamentalsViewComponent {
  /** Chart definitions for educational tooltips */
  protected readonly CHART_DEFINITIONS = CHART_DEFINITIONS;

  /** Pre-built ECharts options for fundamentals charts */
  @Input() charts: FundamentalsCharts | null = null;

  /** Loading state */
  @Input() loading = false;

  /** Error message */
  @Input() error: string | null = null;

  /** Whether showing annual data (true) or quarterly (false) */
  @Input() isAnnual = true;

  /** Emitted when period toggle changes */
  @Output() periodToggle = new EventEmitter<void>();

  togglePeriod(): void {
    this.periodToggle.emit();
  }
}
