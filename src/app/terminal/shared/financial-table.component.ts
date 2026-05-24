// Copyright (c) 2026 Perpetuator LLC
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FinancialTableRow {
  label: string;
  isRatio?: boolean; // If true, format as percentage (multiplies by 100)
  isPercent?: boolean; // If true, value is already a percentage (just add % suffix)
  isCurrency?: boolean; // If true, format with $ and appropriate scale
  values: (number | null)[];
  highlightNegative?: boolean; // Highlight negative values in red
  highlightThreshold?: number; // For ratios, highlight if above this value
}

export interface FinancialTableData {
  years: string[];
  rows: FinancialTableRow[];
}

/** Pre-built cell display for the template. */
interface FinancialCellDisplay {
  formatted: string;
  highlight: boolean;
  negative: boolean;
}
interface FinancialRowDisplay {
  label: string;
  cells: FinancialCellDisplay[];
}

@Component({
  selector: 'app-financial-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './financial-table.component.html',
  styleUrl: './financial-table.component.scss',
})
export class FinancialTableComponent {
  /** Enriched rows with pre-built cell display per cell. */
  rowsDisplay: FinancialRowDisplay[] = [];
  private _data: FinancialTableData = { years: [], rows: [] };
  @Input() set data(value: FinancialTableData) {
    this._data = value || { years: [], rows: [] };
    this.rowsDisplay = this._data.rows.map((row) => ({
      label: row.label,
      cells: row.values.map((value) => ({
        formatted: this.formatValue(row, value),
        highlight: this.shouldHighlight(row, value),
        negative: !!row.highlightNegative && value !== null && value < 0,
      })),
    }));
  }
  get data(): FinancialTableData {
    return this._data;
  }
  @Input() title?: string;

  formatValue(row: FinancialTableRow, value: number | null): string {
    if (value === null) return 'N/A';

    if (row.isRatio) {
      return `${(value * 100).toFixed(1)}%`;
    }

    if (row.isPercent) {
      return `${value.toFixed(1)}%`;
    }

    if (row.isCurrency) {
      const absValue = Math.abs(value);
      const sign = value < 0 ? '-' : '';
      if (absValue >= 1e9) {
        return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
      } else if (absValue >= 1e6) {
        return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
      }
      return `${sign}$${absValue.toFixed(2)}`;
    }

    // Regular number (like EPS)
    return value.toFixed(2);
  }

  shouldHighlight(row: FinancialTableRow, value: number | null): boolean {
    if (value === null || row.highlightThreshold === undefined) return false;
    return value > row.highlightThreshold;
  }
}
