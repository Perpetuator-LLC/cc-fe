// Copyright (c) 2025 Perpetuator LLC
import { Component, ChangeDetectionStrategy, HostListener, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TerminalService } from '../terminal.service';
import { TerminalModalComponent } from '../terminal-modal/terminal-modal.component';
import { HistoryEntry } from '../terminal.types';

@Component({
  selector: 'app-terminal-bar',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule],
  templateUrl: './terminal-bar.component.html',
  styleUrl: './terminal-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalBarComponent {
  private dialog = inject(MatDialog);
  private terminalService = inject(TerminalService);

  // Get the last command from history
  lastEntry = computed<HistoryEntry | null>(() => {
    const history = this.terminalService.history();
    return history.length > 0 ? history[history.length - 1] : null;
  });

  isProcessing = computed(() => {
    const last = this.lastEntry();
    return last?.isLoading ?? false;
  });

  // Global keyboard shortcut: Ctrl+1 or Cmd+1 to open terminal
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Ctrl+1 or Cmd+1
    if ((event.ctrlKey || event.metaKey) && event.key === '1') {
      event.preventDefault();
      this.openTerminal();
    }
    // Also support Ctrl+K as alternative (common command palette shortcut)
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.openTerminal();
    }
  }

  openTerminal(): void {
    this.dialog.open(TerminalModalComponent, {
      panelClass: 'terminal-modal-panel',
      backdropClass: 'terminal-modal-backdrop',
      autoFocus: false,
      disableClose: false,
    });
  }
}
