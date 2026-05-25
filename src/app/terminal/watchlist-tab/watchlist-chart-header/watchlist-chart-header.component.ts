// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Single command/action option shown in the view menu. */
export interface WatchlistChartHeaderAction {
  icon: string;
  label: string;
  command: string;
}

/**
 * Watchlist Chart Header Component
 *
 * Renders the selected-symbol header: company/symbol name, live quote chip,
 * metadata chips (exchange/sector/industry/market cap), and the view selector
 * menu (chart / financials / valuation / dividends / table / info).
 *
 * Extracted from watchlist-tab to reduce template complexity.
 */
@Component({
  selector: 'app-watchlist-chart-header',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule],
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

  /** Currently active command for the view selector. */
  @Input() set currentCommand(value: string) {
    this._currentCommand.set(value);
  }
  get currentCommand(): string {
    return this._currentCommand();
  }
  private readonly _currentCommand = signal('CHART');

  /** Action options for the view selector menu. */
  @Input() set actions(value: readonly WatchlistChartHeaderAction[]) {
    this._actions.set(value);
  }
  get actions(): readonly WatchlistChartHeaderAction[] {
    return this._actions();
  }
  private readonly _actions = signal<readonly WatchlistChartHeaderAction[]>([]);

  /** The action matching the current command (or undefined while loading). */
  readonly currentAction = computed<WatchlistChartHeaderAction | undefined>(() =>
    this._actions().find((a) => a.command === this._currentCommand()),
  );

  /** Emitted when the user picks a new view from the menu. */
  @Output() viewToggleChange = new EventEmitter<{ value: string }>();
  /** Emitted when the user clicks a metadata chip; navigates to the matching system list. */
  @Output() metadataClick = new EventEmitter<{ type: 'exchange' | 'sector' | 'industry'; value: string }>();

  onActionSelect(command: string): void {
    this.viewToggleChange.emit({ value: command });
  }

  onMetadataClick(type: 'exchange' | 'sector' | 'industry', value: string): void {
    this.metadataClick.emit({ type, value });
  }
}
