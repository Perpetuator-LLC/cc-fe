// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { TerminalService } from '../terminal.service';
import { TerminalBarComponent } from '../terminal-bar/terminal-bar.component';
import { TerminalDashboardComponent } from '../terminal-dashboard/terminal-dashboard.component';
import { CommandHistoryItem } from '../terminal.types';

@Component({
  selector: 'app-terminal-page',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    TerminalBarComponent,
    TerminalDashboardComponent,
  ],
  templateUrl: './terminal-page.component.html',
  styleUrl: './terminal-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalPageComponent implements OnInit, OnDestroy {
  selectedTabIndex = 0;
  historyLoading = signal(false);
  private subscriptions = new Subscription();

  constructor(protected terminalService: TerminalService) {}

  ngOnInit(): void {
    // Load available commands from backend registry
    this.subscriptions.add(
      this.terminalService.loadCommands().subscribe({
        next: (commands) => {
          console.debug('Loaded commands:', commands.length);
        },
        error: () => {
          // Commands query failed - terminal still works via WebSocket
          console.debug('Commands registry not available - using WebSocket commands');
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    // Load user history when switching to History tab
    if (index === 1) {
      this.loadUserHistory();
    }
  }

  loadUserHistory(): void {
    this.historyLoading.set(true);
    this.subscriptions.add(
      this.terminalService.loadCommandHistory(100).subscribe({
        next: () => {
          this.historyLoading.set(false);
        },
        error: () => {
          this.historyLoading.set(false);
        },
      }),
    );
  }

  /**
   * Re-run a command from history
   */
  rerunCommand(command: string): void {
    this.terminalService.execute(command);
    // Switch to Dashboard tab to see result
    this.selectedTabIndex = 0;
  }

  /**
   * Copy command to clipboard
   */
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
  }

  /**
   * Format result for copy
   */
  copyResultToClipboard(item: CommandHistoryItem): void {
    let text = item.rawInput;
    if (item.result) {
      text += '\n\nResult:\n' + JSON.stringify(item.result, null, 2);
    }
    navigator.clipboard.writeText(text);
  }

  /**
   * Get status icon for history item
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'check_circle';
      case 'FAILED':
        return 'error';
      case 'RUNNING':
        return 'hourglass_empty';
      default:
        return 'pending';
    }
  }
}
