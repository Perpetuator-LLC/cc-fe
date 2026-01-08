// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Subscription } from 'rxjs';
import { marked } from 'marked';
import { TerminalService } from '../terminal.service';
import { TerminalBarComponent } from '../terminal-bar/terminal-bar.component';
import { TerminalDashboardComponent } from '../terminal-dashboard/terminal-dashboard.component';
import { WatchlistTabComponent } from '../watchlist-tab/watchlist-tab.component';
import { CommandHistoryItem, TerminalHelp } from '../terminal.types';
import { FqnChipComponent, FqnToken, FqnUtils } from '../../shared/fqn-chip/fqn-chip.component';

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
    MatSlideToggleModule,
    TerminalBarComponent,
    TerminalDashboardComponent,
    WatchlistTabComponent,
    FqnChipComponent,
  ],
  templateUrl: './terminal-page.component.html',
  styleUrl: './terminal-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalPageComponent implements OnInit, OnDestroy {
  private sanitizer = inject(DomSanitizer);

  selectedTabIndex = 0;
  historyLoading = signal(false);
  helpLoading = signal(false);
  /** When true, show all command executions. When false (default), deduplicate by command. */
  showDuplicates = signal(false);
  help: TerminalHelp = {
    overview: '',
    categories: [],
    aiNote: 'You can also type natural language questions and our AI will interpret them for you.',
  };
  private subscriptions = new Subscription();

  constructor(protected terminalService: TerminalService) {}

  /**
   * Convert markdown text to safe HTML for rendering.
   */
  markdownToHtml(markdown: string): SafeHtml {
    const html = marked.parse(markdown, { async: false }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  ngOnInit(): void {
    // Load available commands from backend registry
    this.subscriptions.add(
      this.terminalService.loadCommands().subscribe({
        next: () => {
          // Commands loaded successfully
        },
        error: () => {
          // Commands query failed - terminal still works via WebSocket
        },
      }),
    );

    // Load terminal help content
    this.loadTerminalHelp();
  }

  private loadTerminalHelp(): void {
    this.helpLoading.set(true);
    this.subscriptions.add(
      this.terminalService.loadTerminalHelp().subscribe({
        next: (help) => {
          this.help = help;
          this.helpLoading.set(false);
        },
        error: () => {
          this.helpLoading.set(false);
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    // Load user history when switching to History tab (now index 2)
    if (index === 2) {
      this.loadUserHistory();
    }
  }

  loadUserHistory(): void {
    this.historyLoading.set(true);
    // uniqueLatest = !showDuplicates (when showing duplicates, we want all entries)
    const uniqueLatest = !this.showDuplicates();
    this.subscriptions.add(
      this.terminalService.loadCommandHistory(100, uniqueLatest).subscribe({
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
   * Toggle showing duplicate commands and reload history
   */
  onShowDuplicatesChange(showDuplicates: boolean): void {
    this.showDuplicates.set(showDuplicates);
    this.loadUserHistory();
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

  /**
   * Parse a command string into FQN tokens for chip display
   * Uses the parsed command and symbols from the history entry when available
   */
  getCommandTokens(entry: CommandHistoryItem): FqnToken[] {
    const tokens: FqnToken[] = [];

    // Add parsed symbols first (these are from the backend)
    // Note: parsedSymbols may come as a JSON string or an array
    let symbols: string[] = [];
    if (entry.parsedSymbols) {
      if (typeof entry.parsedSymbols === 'string') {
        try {
          symbols = JSON.parse(entry.parsedSymbols);
        } catch {
          // If it's not valid JSON, treat as single symbol
          symbols = [entry.parsedSymbols];
        }
      } else if (Array.isArray(entry.parsedSymbols)) {
        symbols = entry.parsedSymbols;
      }
    }

    for (const symbol of symbols) {
      if (symbol && typeof symbol === 'string') {
        tokens.push(FqnUtils.toToken(symbol));
      }
    }

    // Add parsed command
    if (entry.parsedCommand) {
      tokens.push({
        fqn: `COMMAND:${entry.parsedCommand}`,
        display: entry.parsedCommand,
        type: 'command',
      });
    }

    // Add parsed args as parameters
    // Note: parsedArgs may come as a JSON string or an object
    let args: Record<string, unknown> = {};
    if (entry.parsedArgs) {
      if (typeof entry.parsedArgs === 'string') {
        try {
          args = JSON.parse(entry.parsedArgs);
        } catch {
          args = {};
        }
      } else if (typeof entry.parsedArgs === 'object') {
        args = entry.parsedArgs as Record<string, unknown>;
      }
    }

    for (const [key, value] of Object.entries(args)) {
      if (value !== null && value !== undefined) {
        tokens.push({
          fqn: `-${key} ${value}`,
          display: `-${key} ${value}`,
          type: 'parameter',
        });
      }
    }

    // Fallback: if no parsed data, parse from raw input
    if (tokens.length === 0) {
      return FqnUtils.parseCommand(entry.rawInput);
    }

    return tokens;
  }
}
