// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

/** Row data structure used by the table. */
export interface SymbolTableRow {
  symbol: string;
  displayName?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  accessCount?: number;
  lastAccessedAt?: string;
  formattedMarketCap: string;
  isSelected: boolean;
}

/** Available column toggle option. */
export interface SymbolTableColumn {
  id: string;
  label: string;
  selected: boolean;
}

/** Quick-action shown in the per-row Actions menu. */
export interface SymbolTableAction {
  icon: string;
  label: string;
  command: string;
}

/** Sort field that can be selected via the column-menu "Sort By" section. */
export type SymbolTableSpecialSort = 'lastAccessedAt' | 'accessCount';

/**
 * Symbol Table Component
 *
 * Renders the watchlist symbol mat-table with column selection menu,
 * sort options, per-row actions, optional selection-mode checkboxes,
 * and the system-watchlist paginator.
 *
 * Extracted from watchlist-tab to reduce template complexity.
 */
@Component({
  selector: 'app-symbol-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    MatTableModule,
    MatSortModule,
    MatCheckboxModule,
    MatPaginatorModule,
  ],
  templateUrl: './symbol-table.component.html',
  styleUrl: './symbol-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SymbolTableComponent {
  @Input() rows: readonly SymbolTableRow[] = [];
  @Input() displayedColumns: string[] = [];
  @Input() columns: SymbolTableColumn[] = [];
  @Input() actions: readonly SymbolTableAction[] = [];

  /** Currently active table sort id, or null. */
  @Input() defaultSortActive = '';
  /** Direction for the active sort. */
  @Input() defaultSortDirection: 'asc' | 'desc' | '' = '';

  /** Selected symbol for row highlight. */
  @Input() selectedSymbol: string | null = null;

  /** Pre-computed column menu state. */
  @Input() columnMenuTooltip = '';
  @Input() columnMenuIcon = 'view_column';
  @Input() columnMenuColorPrimary = false;

  /** Current special sort field for header highlight ("lastAccessedAt" | "accessCount" | null). */
  @Input() specialSortField: SymbolTableSpecialSort | null = null;
  /** Direction of the active special sort. */
  @Input() specialSortDirection: 'asc' | 'desc' | null = null;

  /** Whether the row Actions menu should include the Remove option. */
  @Input() canRemove = true;

  /** Selection-mode multi-select state. */
  @Input() selectedCount = 0;

  /** Whether the master-checkbox in the select column should appear checked. */
  get selectAllChecked(): boolean {
    return this.selectedCount > 0 && this.selectedCount === this.rows.length;
  }

  /** Whether the master-checkbox should appear indeterminate. */
  get selectAllIndeterminate(): boolean {
    return this.selectedCount > 0 && this.selectedCount < this.rows.length;
  }

  /** Static menu options for the "Sort By" section. */
  private readonly _specialSortOptions: readonly { field: SymbolTableSpecialSort; icon: string; label: string }[] = [
    { field: 'lastAccessedAt', icon: 'schedule', label: 'Most Recent' },
    { field: 'accessCount', icon: 'trending_up', label: 'Most Viewed' },
  ];

  /**
   * Pre-computed menu items with an active flag and the matching direction icon,
   * so the template doesn't need an inner @if to show the indicator.
   * (Recomputes on each binding read; the array is short.)
   */
  get specialSortOptionsDisplay(): readonly {
    field: SymbolTableSpecialSort;
    icon: string;
    label: string;
    isActive: boolean;
    directionIcon: string;
  }[] {
    const dirIcon = this.specialSortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
    return this._specialSortOptions.map((opt) => ({
      ...opt,
      isActive: this.specialSortField === opt.field,
      directionIcon: this.specialSortField === opt.field ? dirIcon : '',
    }));
  }

  /** Whether the system-watchlist paginator should be rendered. */
  @Input() showPaginator = false;
  @Input() paginatorLength = 0;
  @Input() paginatorPageSize = 20;
  @Input() paginatorPageIndex = 0;

  @Output() sortChange = new EventEmitter<Sort>();
  @Output() rowClick = new EventEmitter<SymbolTableRow>();
  @Output() actionClick = new EventEmitter<{ symbol: string; command: string }>();
  @Output() removeRow = new EventEmitter<SymbolTableRow>();
  @Output() metadataClick = new EventEmitter<{ type: 'sector' | 'industry' | 'exchange'; value: string }>();

  @Output() specialSortClick = new EventEmitter<SymbolTableSpecialSort>();
  @Output() clearSpecialSort = new EventEmitter<void>();
  @Output() columnsChange = new EventEmitter<void>();

  @Output() selectAll = new EventEmitter<void>();
  @Output() clearSelection = new EventEmitter<void>();
  @Output() rowSelect = new EventEmitter<string>();

  @Output() paginatorChange = new EventEmitter<PageEvent>();

  onSortChange(sort: Sort): void {
    this.sortChange.emit(sort);
  }

  onRowClick(row: SymbolTableRow): void {
    this.rowClick.emit(row);
  }

  onActionClick(symbol: string, command: string): void {
    this.actionClick.emit({ symbol, command });
  }

  onRemoveRow(row: SymbolTableRow): void {
    this.removeRow.emit(row);
  }

  onMetadataClick(type: 'sector' | 'industry' | 'exchange', value: string): void {
    this.metadataClick.emit({ type, value });
  }

  onSpecialSortClick(field: SymbolTableSpecialSort): void {
    this.specialSortClick.emit(field);
  }

  onClearSpecialSort(): void {
    this.clearSpecialSort.emit();
  }

  onColumnsChange(): void {
    this.columnsChange.emit();
  }

  onMasterCheckboxChange(checked: boolean): void {
    if (checked) {
      this.selectAll.emit();
    } else {
      this.clearSelection.emit();
    }
  }

  onRowSelect(symbol: string): void {
    this.rowSelect.emit(symbol);
  }

  onPaginatorChange(event: PageEvent): void {
    this.paginatorChange.emit(event);
  }

  /** Track function for column @for. */
  trackColumn(_idx: number, col: SymbolTableColumn): string {
    return col.id;
  }

  /** Track function for action @for. */
  trackAction(_idx: number, a: SymbolTableAction): string {
    return a.command;
  }
}
