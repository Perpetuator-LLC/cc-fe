// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { marked } from 'marked';
import { TerminalService } from '../terminal.service';
import { TerminalBarComponent } from '../terminal-bar/terminal-bar.component';
import { TerminalDashboardComponent } from '../terminal-dashboard/terminal-dashboard.component';
import { WatchlistTabComponent } from '../watchlist-tab/watchlist-tab.component';
import { HistoryTabComponent } from '../history-tab/history-tab.component';
import { HelpTabComponent, HelpCategoryDisplay } from '../help-tab/help-tab.component';
import { CommandHistoryItem, TerminalHelp } from '../terminal.types';
import { FqnToken, FqnUtils } from '../../shared/fqn-chip/fqn-chip.component';
import { TerminalRoutingService } from '../terminal-routing.service';

@Component({
  selector: 'app-terminal-page',
  standalone: true,
  imports: [
    CommonModule,
    TerminalBarComponent,
    TerminalDashboardComponent,
    WatchlistTabComponent,
    HistoryTabComponent,
    HelpTabComponent,
  ],
  templateUrl: './terminal-page.component.html',
  styleUrl: './terminal-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalPageComponent implements OnInit, OnDestroy {
  protected terminalService = inject(TerminalService);

  private sanitizer = inject(DomSanitizer);

  historyLoading = signal(false);
  helpLoading = signal(false);
  /** Pre-rendered help overview markdown. Updated whenever help loads. */
  helpOverviewHtml: SafeHtml = '';

  /**
   * Enriched user-history entries — each row carries pre-built tokens /
   * status icon / result message so the template avoids per-CD method
   * calls. Re-runs whenever userHistory() signal changes.
   */
  readonly enrichedHistory = computed(() =>
    this.terminalService.userHistory().map((entry) => ({
      entry,
      tokens: this.getCommandTokens(entry),
      statusIcon: this.getStatusIcon(entry.status),
      resultMessage: this.getResultMessage(entry),
    })),
  );
  /** When true, show all command executions. When false (default), deduplicate by command. */
  showDuplicates = signal(false);
  help: TerminalHelp = {
    overview: '',
    categories: [],
    aiNote: 'You can also type natural language questions and our AI will interpret them for you.',
  };
  /** Help categories enriched with pre-joined alias strings per command. */
  helpDisplay: HelpCategoryDisplay[] = [];
  private subscriptions = new Subscription();
  protected routingService = inject(TerminalRoutingService);

  constructor() {
    // Sync tab selection from routing service
    effect(() => {
      const tab = this.routingService.tab();
      // If switching to history, load it
      if (tab === 'history') {
        this.loadUserHistory();
      }
    });
  }

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
          this.helpOverviewHtml = this.markdownToHtml(help.overview ?? '');
          this.helpDisplay = (help.categories ?? []).map((cat) => ({
            ...cat,
            commands: (cat.commands ?? []).map((cmd) => ({
              ...cmd,
              aliasesText: (cmd.aliases ?? []).join(', '),
            })),
          }));
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
    this.routingService.setTab('dashboards');
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
        // Add the switch as its own chip
        tokens.push({
          fqn: `-${key}`,
          display: `-${key}`,
          type: 'parameter',
        });
        // Add the value as its own chip
        tokens.push({
          fqn: `${value}`,
          display: `${value}`,
          type: 'value',
        });
      }
    }

    // Fallback: if no parsed data, parse from raw input
    if (tokens.length === 0) {
      return FqnUtils.parseCommand(entry.rawInput);
    }

    return tokens;
  }

  /**
   * Get the result message from a history entry for display.
   */
  getResultMessage(entry: CommandHistoryItem): string | null {
    if (!entry.result) return null;

    // Result can be a string or object
    if (typeof entry.result === 'string') {
      return entry.result;
    }

    // If result is an object, try to get the message property
    if (typeof entry.result === 'object') {
      const result = entry.result as Record<string, unknown>;
      if (result['message'] && typeof result['message'] === 'string') {
        return result['message'];
      }
      // If no message, return null (don't show large chart data)
      return null;
    }

    return null;
  }

  /**
   * Handle expansion panel opened - lazy load details if not already loaded
   */
  onPanelOpened(entry: CommandHistoryItem): void {
    // If details already loaded or currently loading, skip
    if (entry.detailsLoaded || entry.detailsLoading) {
      return;
    }

    // Mark as loading
    const currentHistory = this.terminalService.userHistory();
    const index = currentHistory.findIndex((h) => h.id === entry.id);
    if (index !== -1) {
      const updatedHistory = [...currentHistory];
      updatedHistory[index] = { ...updatedHistory[index], detailsLoading: true };
      this.terminalService.userHistory.set(updatedHistory);
    }

    // Load full details
    this.subscriptions.add(
      this.terminalService.loadHistoryItemDetail(entry.id).subscribe({
        next: () => {
          // Details are automatically updated in the signal by the service
        },
        error: (error) => {
          console.error('Failed to load history item details:', error);
          // Clear loading state on error
          const current = this.terminalService.userHistory();
          const idx = current.findIndex((h) => h.id === entry.id);
          if (idx !== -1) {
            const updated = [...current];
            updated[idx] = { ...updated[idx], detailsLoading: false };
            this.terminalService.userHistory.set(updated);
          }
        },
      }),
    );
  }

  /**
   * Load more history items
   */
  loadMoreHistory(): void {
    this.terminalService.loadMoreHistoryForTab(!this.showDuplicates());
  }

  /**
   * Check if there are more history items to load
   */
  get hasMoreHistory(): boolean {
    return this.terminalService.hasMoreHistory;
  }

  /**
   * Get total count of history items
   */
  get historyTotalCount(): number {
    return this.terminalService.historyTotalCount();
  }
}
