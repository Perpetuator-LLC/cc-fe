// Copyright (c) 2026 Perpetuator LLC
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Quote data for symbol
 */
export interface ChartHeaderQuote {
  price: number;
  change: number;
  changePercent: number;
  timestamp?: string;
}

/**
 * Chart Header Component
 *
 * Displays symbol info, quote data, and navigation chips.
 * Used at the top of chart, fundamentals, valuation, and dividend views.
 */
@Component({
  selector: 'app-chart-header',
  standalone: true,
  imports: [CommonModule, MatChipsModule, MatIconModule, MatTooltipModule],
  templateUrl: './chart-header.component.html',
  styleUrl: './chart-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartHeaderComponent {
  /** Stock symbol (e.g., "AAPL") */
  @Input() symbol = '';

  /** Company name */
  @Input() displayName?: string;

  /** Quote data */
  @Input() quote?: ChartHeaderQuote | null;

  /** Exchange (e.g., "NASDAQ") */
  @Input() exchange?: string;

  /** GICS Sector */
  @Input() sector?: string;

  /** GICS Industry */
  @Input() industry?: string;

  /** Market capitalization */
  private _marketCap?: number;
  /** Pre-formatted market cap string for the template. */
  formattedMarketCap = '';
  @Input() set marketCap(value: number | undefined) {
    this._marketCap = value;
    this.formattedMarketCap = value !== undefined ? this.formatMarketCap(value) : '';
  }
  get marketCap(): number | undefined {
    return this._marketCap;
  }

  /** Emitted when sector chip clicked */
  @Output() sectorClick = new EventEmitter<string>();

  /** Emitted when industry chip clicked */
  @Output() industryClick = new EventEmitter<string>();

  /** Emitted when exchange chip clicked */
  @Output() exchangeClick = new EventEmitter<string>();

  onSectorClick(): void {
    if (this.sector) {
      this.sectorClick.emit(this.sector);
    }
  }

  onIndustryClick(): void {
    if (this.industry) {
      this.industryClick.emit(this.industry);
    }
  }

  onExchangeClick(): void {
    if (this.exchange) {
      this.exchangeClick.emit(this.exchange);
    }
  }

  formatMarketCap(value: number): string {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    }
    return `$${value.toLocaleString()}`;
  }
}
