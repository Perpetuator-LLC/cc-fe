// Copyright (c) 2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FqnChipComponent } from '../../../shared/fqn-chip/fqn-chip.component';
import { MatchedHistoryEntry } from '../terminal-bar.types';

@Component({
  selector: 'app-history-preview',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, FqnChipComponent],
  templateUrl: './history-preview.component.html',
  styleUrl: './history-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPreviewComponent {
  @Input({ required: true }) historyLoading = false;
  @Input({ required: true }) historyEmpty = false;
  @Input({ required: true }) selectedHistoryIndex = -1;
  @Input({ required: true }) historyTotalCount = 0;
  @Input({ required: true }) historyRemainingCount = 0;
  @Input({ required: true }) historySearchTerm = '';
  @Input({ required: true }) upcomingHistoryItems: MatchedHistoryEntry[] = [];
  @Input({ required: true }) dropdownStyle: Record<string, string> = {};

  @Output() historyEntrySelected = new EventEmitter<MatchedHistoryEntry>();

  /** True when no items found and not yet navigating. */
  get showEmptyState(): boolean {
    return this.historyEmpty && this.selectedHistoryIndex < 0;
  }

  /** True when the user has navigated to the oldest item. */
  get showEndOfHistory(): boolean {
    return this.upcomingHistoryItems.length === 0 && this.selectedHistoryIndex >= 0;
  }

  /** True when ready to show the actual list of items. */
  get showItemList(): boolean {
    return !this.historyLoading && !this.showEmptyState && !this.showEndOfHistory;
  }

  /** Text shown in the bottom hint row. */
  get remainingHintText(): string {
    if (this.historyRemainingCount > 0) return `${this.historyRemainingCount} more`;
    return `${this.upcomingHistoryItems.length} more`;
  }

  selectEntry(entry: MatchedHistoryEntry): void {
    this.historyEntrySelected.emit(entry);
  }
}
