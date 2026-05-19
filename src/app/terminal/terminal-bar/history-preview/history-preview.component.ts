// Copyright (c) 2026 Perpetuator LLC
import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FqnChipComponent } from '../../../shared/fqn-chip/fqn-chip.component';
import { MatchedHistoryEntry } from '../terminal-bar.component';

@Component({
  selector: 'app-terminal-history-preview',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, FqnChipComponent],
  templateUrl: './history-preview.component.html',
  styleUrl: './history-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalHistoryPreviewComponent {
  @Input({ required: true }) historyLoading = false;
  @Input({ required: true }) historyEmpty = false;
  @Input({ required: true }) selectedHistoryIndex = -1;
  @Input({ required: true }) historyTotalCount = 0;
  @Input({ required: true }) historySearchTerm = '';
  @Input({ required: true }) upcomingHistoryItems: MatchedHistoryEntry[] = [];
  @Input({ required: true }) historyRemainingCount = 0;
  @Input({ required: true }) dropdownStyle: Record<string, string> = {};

  @Output() selectEntry = new EventEmitter<MatchedHistoryEntry>();
}
