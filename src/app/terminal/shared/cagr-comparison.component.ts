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

@Component({
  selector: 'app-cagr-comparison',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './cagr-comparison.component.html',
  styleUrl: './cagr-comparison.component.scss',
})
export class CagrComparisonComponent {
  @Input() items: CagrComparisonData[] = [];
  @Input() showTrendIndicator = true;

  formatCagr(value: number | null): string {
    if (value === null) return 'N/A';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  getTrendIcon(item: CagrComparisonData): string {
    if (item.cagr5Year === null || item.cagr10Year === null) return 'remove';
    if (item.cagr5Year > item.cagr10Year) return 'trending_up';
    if (item.cagr5Year < item.cagr10Year) return 'trending_down';
    return 'trending_flat';
  }
}
