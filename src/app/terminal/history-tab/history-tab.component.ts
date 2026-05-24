// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { TerminalService } from '../terminal.service';
import { CommandHistoryItem } from '../terminal.types';
import { FqnChipComponent, FqnToken } from '../../shared/fqn-chip/fqn-chip.component';

/**
 * Enriched history row — each item carries pre-built tokens / status icon /
 * result message so the template avoids per-CD method calls.
 */
export interface HistoryRow {
  entry: CommandHistoryItem;
  tokens: FqnToken[];
  statusIcon: string;
  resultMessage: string | null;
}

@Component({
  selector: 'app-history-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatExpansionModule,
    FqnChipComponent,
  ],
  templateUrl: './history-tab.component.html',
  styleUrl: './history-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryTabComponent {
  protected terminalService = inject(TerminalService);

  /** Pre-enriched rows the template iterates. */
  @Input() rows: HistoryRow[] = [];

  /** Total history count (across pages). */
  @Input() totalCount = 0;

  /** Whether duplicates are currently shown. */
  @Input() showDuplicates = false;

  /** Whether more history pages can be loaded. */
  @Input() hasMore = false;

  /** Whether a page-load is in progress. */
  @Input() loading = false;

  @Output() showDuplicatesChange = new EventEmitter<boolean>();
  @Output() panelOpened = new EventEmitter<CommandHistoryItem>();
  @Output() rerun = new EventEmitter<string>();
  @Output() copyCommand = new EventEmitter<string>();
  @Output() loadMore = new EventEmitter<void>();
}
