// Copyright (c) 2026 Perpetuator LLC
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MetricCardData {
  label: string;
  value: string | number;
  suffix?: string; // %, $, etc.
  change?: number; // For showing positive/negative change
  highlight?: boolean;
  tooltip?: string;
}

@Component({
  selector: 'app-metric-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metric-cards.component.html',
  styleUrl: './metric-cards.component.scss',
})
export class MetricCardsComponent {
  @Input() metrics: MetricCardData[] = [];

  formatValue(metric: MetricCardData): string {
    if (typeof metric.value === 'number') {
      if (metric.suffix === '%') {
        return `${metric.value.toFixed(1)}%`;
      } else if (metric.suffix === '$') {
        return `$${metric.value.toFixed(2)}`;
      } else if (metric.suffix === '$B') {
        return `$${(metric.value / 1e9).toFixed(2)}B`;
      } else if (metric.suffix === '$M') {
        return `$${(metric.value / 1e6).toFixed(2)}M`;
      }
      return metric.value.toFixed(2);
    }
    return String(metric.value);
  }
}
