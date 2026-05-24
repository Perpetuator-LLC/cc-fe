// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Watchlist } from '../../terminal.types';

/** A list option used in the categories submenus. */
export interface WatchlistSelectorSystemList {
  id: string;
  name: string;
  icon: string;
  type: 'sector' | 'industry' | 'exchange' | 'assetType';
  value: string;
}

/** Custom watchlist augmented with menu icon for display. */
export interface WatchlistSelectorDisplay extends Watchlist {
  icon: string;
}

/**
 * Watchlist Selector Component
 *
 * Renders the sidebar header dropdown menu for selecting watchlists,
 * sectors/industries/exchanges/asset-type categories, plus the
 * selection-mode toggle and create-watchlist quick action.
 *
 * Extracted from watchlist-tab to reduce template complexity.
 */
@Component({
  selector: 'app-watchlist-selector',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule, MatDividerModule],
  templateUrl: './watchlist-selector.component.html',
  styleUrl: './watchlist-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistSelectorComponent {
  @Input() selectedWatchlistId = 'recent';
  @Input() selectedWatchlistName = '';
  @Input() selectedWatchlistIcon = 'list';
  @Input() recentSymbolCount = 0;
  @Input() customWatchlists: readonly WatchlistSelectorDisplay[] = [];
  @Input() sectorLists: readonly WatchlistSelectorSystemList[] = [];
  @Input() industryLists: readonly WatchlistSelectorSystemList[] = [];
  @Input() exchangeLists: readonly WatchlistSelectorSystemList[] = [];
  @Input() assetTypeLists: readonly WatchlistSelectorSystemList[] = [];
  @Input() hasIndustries = false;
  @Input() hasExchanges = false;
  @Input() selectionMode = false;

  @Output() watchlistChange = new EventEmitter<string>();
  @Output() renameWatchlist = new EventEmitter<WatchlistSelectorDisplay>();
  @Output() duplicateWatchlist = new EventEmitter<WatchlistSelectorDisplay>();
  @Output() exportWatchlist = new EventEmitter<string>();
  @Output() deleteWatchlist = new EventEmitter<WatchlistSelectorDisplay>();
  @Output() toggleSelectionMode = new EventEmitter<void>();
  @Output() createWatchlist = new EventEmitter<void>();

  onWatchlistChange(id: string): void {
    this.watchlistChange.emit(id);
  }

  onRename(wl: WatchlistSelectorDisplay): void {
    this.renameWatchlist.emit(wl);
  }

  onDuplicate(wl: WatchlistSelectorDisplay): void {
    this.duplicateWatchlist.emit(wl);
  }

  onExport(uuid: string): void {
    // Caller decides whether to first switch then copy.
    this.exportWatchlist.emit(uuid);
  }

  onDelete(wl: WatchlistSelectorDisplay): void {
    this.deleteWatchlist.emit(wl);
  }

  onToggleSelectionMode(): void {
    this.toggleSelectionMode.emit();
  }

  onCreateWatchlist(): void {
    this.createWatchlist.emit();
  }
}
