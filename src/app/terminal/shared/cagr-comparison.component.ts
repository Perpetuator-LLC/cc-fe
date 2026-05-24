// Copyright (c) 2026 Perpetuator LLC
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface CagrComparisonData {
  label: string;
  cagr5Year: number | null;
  cagr10Year: number | null;
  tooltip?: string;
}

/** Pre-built display row for the template. */
export type CagrComparisonDisplay = CagrComparisonData & {
  cagr5YearFormatted: string;
  cagr10YearFormatted: string;
  trendIcon: 'remove' | 'trending_up' | 'trending_down' | 'trending_flat';
};

@Component({
  selector: 'app-cagr-comparison',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './cagr-comparison.component.html',
  styleUrl: './cagr-comparison.component.scss',
})
export class CagrComparisonComponent {
  /** Enriched items with pre-formatted CAGR strings + trend icon per row. */
  itemsDisplay: CagrComparisonDisplay[] = [];

  private _items: CagrComparisonData[] = [];
  @Input() set items(value: CagrComparisonData[]) {
    this._items = value || [];
    this.itemsDisplay = this._items.map((item) => ({
      ...item,
      cagr5YearFormatted: this.formatCagr(item.cagr5Year),
      cagr10YearFormatted: this.formatCagr(item.cagr10Year),
      trendIcon: this.computeTrendIcon(item),
    }));
  }
  get items(): CagrComparisonData[] {
    return this._items;
  }

  @Input() showTrendIndicator = true;

  formatCagr(value: number | null): string {
    if (value === null) return 'N/A';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  private computeTrendIcon(item: CagrComparisonData): CagrComparisonDisplay['trendIcon'] {
    if (item.cagr5Year === null || item.cagr10Year === null) return 'remove';
    if (item.cagr5Year > item.cagr10Year) return 'trending_up';
    if (item.cagr5Year < item.cagr10Year) return 'trending_down';
    return 'trending_flat';
  }
}
