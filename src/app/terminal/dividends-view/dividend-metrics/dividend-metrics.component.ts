// Copyright (c) 2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { KpiCardComponent } from '../../shared/kpi-card/kpi-card.component';

/** Pre-formatted KPI strings for the dividend-metrics row. */
export interface DividendFormattedMetrics {
  currentPrice: string;
  dividendYield: string | null;
  ttmPayoutRatio: string | null;
  ttmFcfPayoutRatio: string | null;
  dividendCagr5Year: string | null;
  dividendCagr5YearValue: number | null;
  dividendCagr10Year: string | null;
  dividendCagr10YearValue: number | null;
  fcfCagr5Year: string | null;
  fcfCagr5YearValue: number | null;
  fcfCagr10Year: string | null;
  fcfCagr10YearValue: number | null;
}

@Component({
  selector: 'app-dividend-metrics',
  standalone: true,
  imports: [KpiCardComponent],
  templateUrl: './dividend-metrics.component.html',
  styleUrls: ['./dividend-metrics.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DividendMetricsComponent {
  @Input() metrics: DividendFormattedMetrics | null = null;
}
