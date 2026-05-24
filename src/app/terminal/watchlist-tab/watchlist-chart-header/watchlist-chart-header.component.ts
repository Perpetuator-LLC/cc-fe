// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule, MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Single command/action option shown in the view-toggle group. */
export interface WatchlistChartHeaderAction {
  icon: string;
  label: string;
  command: string;
}

/**
 * Watchlist Chart Header Component
 *
 * Renders the selected-symbol header: company/symbol name, live quote chip,
 * metadata chips (exchange/sector/industry/market cap), and the view-toggle
 * group (chart / financials / valuation / dividends / table / info).
 *
 * Extracted from watchlist-tab to reduce template complexity.
 */
@Component({
  selector: 'app-watchlist-chart-header',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatButtonToggleModule, MatTooltipModule],
  templateUrl: './watchlist-chart-header.component.html',
  styleUrl: './watchlist-chart-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistChartHeaderComponent {
  /** Pre-resolved company/display name; empty string hides the chip. */
  @Input() companyName = '';
  /** Currently selected ticker. */
  @Input() selectedSymbol: string | null = null;
  /** Pre-built tooltip text for both name spans. */
  @Input() symbolInfoTooltip = '';

  /** Whether a live quote is available. */
  @Input() showQuote = false;
  /** Whether change is non-negative. Controls positive/negative class. */
  @Input() isPositiveChange = true;
  /** Pre-formatted display values for the quote row. */
  @Input() quotePrice = '';
  @Input() quoteChange = '';
  @Input() quoteChangePercent = '';
  @Input() quoteTooltip = '';

  /** Metadata chip values (empty string hides the chip). */
  @Input() exchange = '';
  @Input() sector = '';
  @Input() industry = '';
  /** Whether the market-cap chip should render. */
  @Input() showMarketCap = false;
  /** Pre-formatted market cap string. */
  @Input() marketCap = '';

  /** Currently active command for the toggle group. */
  @Input() currentCommand = 'CHART';
  /** Action options for the toggle group. */
  @Input() actions: readonly WatchlistChartHeaderAction[] = [];

  /** Emitted when the view toggle group selects a new command. */
  @Output() viewToggleChange = new EventEmitter<MatButtonToggleChange>();
  /** Emitted when the user clicks a metadata chip; navigates to the matching system list. */
  @Output() metadataClick = new EventEmitter<{ type: 'exchange' | 'sector' | 'industry'; value: string }>();

  onViewToggleChange(event: MatButtonToggleChange): void {
    this.viewToggleChange.emit(event);
  }

  onMetadataClick(type: 'exchange' | 'sector' | 'industry', value: string): void {
    this.metadataClick.emit({ type, value });
  }
}
