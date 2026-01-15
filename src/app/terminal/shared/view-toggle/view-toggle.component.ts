// Copyright (c) 2026 Perpetuator LLC
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';

/**
 * Available view types
 */
export type ViewType = 'chart' | 'table' | 'financials' | 'valuation' | 'dividends';

/**
 * View Toggle Component
 *
 * Displays buttons to switch between different views (Chart, Table, Fundamentals, Valuation, Dividends).
 * Used in the watchlist area to toggle the main content display.
 */
@Component({
  selector: 'app-view-toggle',
  standalone: true,
  imports: [CommonModule, MatButtonToggleModule, MatTooltipModule, MatIconModule],
  templateUrl: './view-toggle.component.html',
  styleUrl: './view-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewToggleComponent {
  /** Currently active view */
  @Input() activeView: ViewType = 'chart';

  /** Show Table button */
  @Input() showTable = true;

  /** Show Fundamentals button */
  @Input() showFundamentals = true;

  /** Show Valuation button */
  @Input() showValuation = true;

  /** Show Dividends button */
  @Input() showDividends = true;

  /** Emitted when view selection changes */
  @Output() viewChange = new EventEmitter<ViewType>();

  onViewChange(view: ViewType): void {
    this.viewChange.emit(view);
  }
}
