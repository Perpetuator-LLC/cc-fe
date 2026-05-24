// Copyright (c) 2025-2026 Perpetuator LLC
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { marked } from 'marked';
import { TerminalService } from '../terminal.service';
import {
  HistoryEntry,
  AutocompleteSuggestion,
  TerminalHints,
  ChartControls,
  CommandResult,
  ChartResultData,
} from '../terminal.types';
import { ChartPanelComponent } from '../chart-panel/chart-panel.component';
import { DataTableComponent } from '../data-table/data-table.component';

@Component({
  selector: 'app-terminal-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    ChartPanelComponent,
    DataTableComponent,
  ],
  templateUrl: './terminal-modal.component.html',
  styleUrl: './terminal-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalModalComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('commandInput') commandInput!: ElementRef<HTMLInputElement>;
  @ViewChild('historyContainer') historyContainer!: ElementRef<HTMLDivElement>;

  private dialogRef = inject(MatDialogRef<TerminalModalComponent>);
  private sanitizer = inject(DomSanitizer);
  protected terminalService = inject(TerminalService);

  currentCommand = '';
  /** Trim cache so the template can read `commandTrimmed` instead of calling `currentCommand.trim()`. */
  commandTrimmed = '';
  /** Suggestions enriched with pre-computed icon and metaItems (collapses 4 `@if` blocks into 1 `@for`). */
  suggestions: (AutocompleteSuggestion & { icon: string; metaItems: { text: string; cls: string }[] })[] = [];
  selectedSuggestionIndex = -1;
  showSuggestions = false;
  hints: TerminalHints = {
    quickExamples: ['STOCK:NASDAQ:AAPL COMMAND:CHART', 'COMMAND:HELP', 'STOCK:NASDAQ:MSFT COMMAND:DES'],
    placeholderText: 'Type a command or ask a question...',
    emptyStateMessage: 'Try: AAPL CHART, HELP, or ask anything',
    dashboardHint: '',
    chartSuggestion: 'STOCK:NASDAQ:AAPL COMMAND:CHART',
  };
  private subscriptions = new Subscription();
  private historyIndex = -1;
  private inputSubject = new Subject<string>();
  private blurTimeout: ReturnType<typeof setTimeout> | null = null;

  get history(): HistoryEntry[] {
    return this.terminalService.history();
  }

  get isProcessing(): boolean {
    const hist = this.history;
    return hist.length > 0 && (hist[hist.length - 1].isLoading ?? false);
  }

  /** True when the autocomplete dropdown should be visible. Pre-computed so the
   *  template can use a single `[hidden]` binding instead of an `@if` block. */
  get autocompleteVisible(): boolean {
    return this.showSuggestions && this.suggestions.length > 0;
  }

  /**
   * Enriched history list for the template — each entry carries pre-computed
   * `isFetching`, `hasChart`, `hasTable`, `chartControls`, `messageHtml`.
   * Recomputed whenever the terminal-service history signal changes.
   */
  readonly historyDisplay = computed(() => {
    return this.terminalService.history().map((entry) => ({
      entry,
      isFetching: this.isFetching(entry),
      hasChart: this.hasChart(entry),
      hasTable: this.hasTable(entry),
      chartControls: this.getChartControls(entry.result),
      messageHtml: entry.result?.message ? this.markdownToHtml(entry.result.message) : null,
    }));
  });

  /** Pre-rendered empty-state HTML for the hints message. */
  emptyStateHtml: SafeHtml = '';

  /**
   * Build the meta-item list for a suggestion (description, exchange, category, AI badge).
   * Returned in render order so the template can iterate with a single `@for`.
   */
  private getSuggestionMetaItems(suggestion: AutocompleteSuggestion): { text: string; cls: string }[] {
    const items: { text: string; cls: string }[] = [];
    if (suggestion.description) items.push({ text: suggestion.description, cls: 'suggestion-desc' });
    if (suggestion.exchange) items.push({ text: suggestion.exchange, cls: 'suggestion-exchange' });
    if (suggestion.category) items.push({ text: suggestion.category, cls: 'suggestion-category' });
    if (suggestion.isAiInterpreted) items.push({ text: 'AI', cls: 'ai-badge' });
    return items;
  }

  /**
   * Get the icon name for a suggestion type
   */
  getSuggestionIcon(suggestion: AutocompleteSuggestion): string {
    switch (suggestion.type) {
      case 'command':
        return 'terminal';
      case 'alias':
        return 'label';
      case 'symbol':
        return suggestion.assetType === 'ETF' ? 'analytics' : 'trending_up';
      case 'recent':
        return 'schedule';
      case 'parameter':
        return 'settings';
      case 'example':
        return 'lightbulb';
      case 'history':
        return 'history';
      case 'history_ai':
        return 'smart_toy';
      case 'natural_language':
        return 'chat';
      default:
        return 'chevron_right';
    }
  }

  /**
   * Convert markdown text to safe HTML for rendering.
   */
  markdownToHtml(markdown: string): SafeHtml {
    const html = marked.parse(markdown, { async: false }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  ngOnInit(): void {
    // Load terminal hints from backend
    this.subscriptions.add(
      this.terminalService.loadTerminalHints().subscribe((hints) => {
        this.hints = hints;
        this.emptyStateHtml = this.markdownToHtml(hints.emptyStateMessage);
      }),
    );

    // Seed emptyStateHtml from the default hints object so the template has
    // something to render even before the backend response arrives.
    this.emptyStateHtml = this.markdownToHtml(this.hints.emptyStateMessage);

    // Load user command history for up/down arrow navigation
    this.subscriptions.add(this.terminalService.loadCommandHistory(100).subscribe());

    // Subscribe to command results to auto-scroll and refocus
    this.subscriptions.add(
      this.terminalService.onCommandResult.subscribe(() => {
        setTimeout(() => {
          this.scrollToBottom();
          this.focusInput();
        }, 100);
      }),
    );

    // Debounced autocomplete
    this.subscriptions.add(
      this.inputSubject.pipe(debounceTime(100), distinctUntilChanged()).subscribe((input) => {
        this.updateSuggestions(input);
      }),
    );
  }

  ngAfterViewInit(): void {
    // Focus the input when modal opens
    setTimeout(() => {
      this.commandInput?.nativeElement?.focus();
    }, 100);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onSubmit(): void {
    const command = this.currentCommand.trim();
    if (!command || this.isProcessing) return;

    this.terminalService.execute(command);
    this.currentCommand = '';
    this.commandTrimmed = '';
    this.historyIndex = -1;
    this.clearSuggestions();
    setTimeout(() => {
      this.scrollToBottom();
      this.focusInput();
    }, 100);
  }

  onKeyDown(event: KeyboardEvent): void {
    // Handle autocomplete navigation
    if (this.showSuggestions && this.suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedSuggestionIndex = Math.min(this.selectedSuggestionIndex + 1, this.suggestions.length - 1);
        return;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (this.selectedSuggestionIndex > 0) {
          this.selectedSuggestionIndex--;
        } else {
          // Close suggestions and go to history navigation
          this.clearSuggestions();
        }
        return;
      } else if (event.key === 'Tab') {
        event.preventDefault();
        if (this.selectedSuggestionIndex >= 0) {
          this.selectSuggestion(this.suggestions[this.selectedSuggestionIndex]);
        } else if (this.suggestions.length > 0) {
          this.selectSuggestion(this.suggestions[0]);
        }
        return;
      } else if (event.key === 'Enter') {
        if (this.selectedSuggestionIndex >= 0) {
          event.preventDefault();
          this.selectSuggestion(this.suggestions[this.selectedSuggestionIndex]);
          return;
        }
        // Otherwise fall through to submit
        this.clearSuggestions();
        this.onSubmit();
        return;
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.clearSuggestions();
        return;
      }
    }

    // History navigation (when no suggestions shown)
    if (event.key === 'Escape') {
      this.dialogRef.close();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      // If no suggestions visible, show suggestions (which include history)
      if (!this.showSuggestions) {
        this.updateSuggestions(this.currentCommand);
      } else {
        this.navigateHistory(-1);
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.navigateHistory(1);
    } else if (event.key === 'Enter') {
      this.onSubmit();
    }
  }

  onInputChange(): void {
    this.commandTrimmed = this.currentCommand.trim();
    this.inputSubject.next(this.currentCommand);
    this.historyIndex = -1; // Reset history navigation when typing
  }

  onInputFocus(): void {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
    // Show suggestions on focus - this includes history when input is empty
    this.updateSuggestions(this.currentCommand);
  }

  onInputBlur(): void {
    // Delay hiding suggestions to allow click events to fire
    this.blurTimeout = setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  selectSuggestion(suggestion: AutocompleteSuggestion): void {
    this.currentCommand = suggestion.insert || suggestion.fqn || suggestion.text || suggestion.display || '';
    this.commandTrimmed = this.currentCommand.trim();
    this.clearSuggestions();
    this.focusInput();
  }

  private updateSuggestions(input: string): void {
    // Use async backend API for suggestions
    this.subscriptions.add(
      this.terminalService.fetchAutocompleteSuggestions(input, 10).subscribe({
        next: (suggestions) => {
          this.suggestions = suggestions.map((s) => ({
            ...s,
            icon: this.getSuggestionIcon(s),
            metaItems: this.getSuggestionMetaItems(s),
          }));
          this.selectedSuggestionIndex = -1;
          this.showSuggestions = suggestions.length > 0;
        },
        error: () => {
          // Fallback to local suggestions on error
          this.suggestions = this.terminalService.getAutocompleteSuggestions(input, 10).map((s) => ({
            ...s,
            icon: this.getSuggestionIcon(s),
            metaItems: this.getSuggestionMetaItems(s),
          }));
          this.selectedSuggestionIndex = -1;
          this.showSuggestions = this.suggestions.length > 0;
        },
      }),
    );
  }

  private clearSuggestions(): void {
    this.suggestions = [];
    this.selectedSuggestionIndex = -1;
    this.showSuggestions = false;
  }

  private navigateHistory(direction: number): void {
    const commands = this.terminalService.commandHistory();
    if (commands.length === 0) return;

    // direction: -1 = up arrow (go to previous/older command)
    //            +1 = down arrow (go to next/newer command)
    // historyIndex starts at commands.length (past the end = current input)
    // Up arrow decrements, down arrow increments

    if (this.historyIndex === -1) {
      // First navigation - start from the end
      this.historyIndex = commands.length;
    }

    this.historyIndex += direction;

    if (this.historyIndex < 0) {
      // At the oldest command, stay there
      this.historyIndex = 0;
    } else if (this.historyIndex >= commands.length) {
      // Past the newest command - back to empty input
      this.historyIndex = commands.length;
      this.currentCommand = '';
    } else {
      this.currentCommand = commands[this.historyIndex];
    }
  }

  clearHistory(): void {
    this.terminalService.clearHistory();
  }

  close(): void {
    this.dialogRef.close();
  }

  /**
   * Re-run a command from history
   */
  rerunCommand(command: string): void {
    if (this.isProcessing) return;
    this.terminalService.execute(command);
    setTimeout(() => {
      this.scrollToBottom();
      this.focusInput();
    }, 100);
  }

  /**
   * Copy command to clipboard
   */
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
  }

  /**
   * Copy result (message + data if available) to clipboard
   */
  copyResultToClipboard(entry: HistoryEntry): void {
    let text = entry.result?.message || '';
    if (entry.result?.data) {
      const data = entry.result.data as { type?: string; rows?: unknown[][]; headers?: string[] };
      if (data.type === 'table' && data.headers && data.rows) {
        // Format table as markdown
        text += '\n\n| ' + data.headers.join(' | ') + ' |\n';
        text += '| ' + data.headers.map(() => '---').join(' | ') + ' |\n';
        data.rows.forEach((row) => {
          text += '| ' + row.join(' | ') + ' |\n';
        });
      } else {
        text += '\n\n' + JSON.stringify(entry.result.data, null, 2);
      }
    }
    navigator.clipboard.writeText(text);
  }

  private scrollToBottom(): void {
    if (this.historyContainer?.nativeElement) {
      const container = this.historyContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  private focusInput(): void {
    this.commandInput?.nativeElement?.focus();
  }

  /**
   * Check if a history entry is in "fetching" state
   */
  isFetching(entry: HistoryEntry): boolean {
    if (entry.result?.data && typeof entry.result.data === 'object') {
      const data = entry.result.data as { status?: string };
      return data.status === 'fetching';
    }
    return false;
  }

  /**
   * Check if the result has chart options
   */
  hasChart(entry: HistoryEntry): boolean {
    return !!entry.result?.chartOptions;
  }

  /**
   * Check if the result has table data
   */
  hasTable(entry: HistoryEntry): boolean {
    if (!entry.result?.data) return false;
    const data = entry.result.data as { type?: string };
    return data.type === 'table';
  }

  /**
   * Extract chartControls from a CommandResult.
   * Chart controls may be in data.chartControls or metadata.chartControls
   */
  getChartControls(result: CommandResult | undefined): ChartControls | undefined {
    if (!result) return undefined;

    // Try data.chartControls first (for chart responses)
    if (result.data && typeof result.data === 'object') {
      const data = result.data as ChartResultData;
      if (data.chartControls) {
        return data.chartControls;
      }
    }

    // Fall back to metadata.chartControls
    if (result.metadata?.['chartControls']) {
      return result.metadata['chartControls'] as ChartControls;
    }

    return undefined;
  }

  /**
   * Handle chart control changes - execute new command with updated period/interval
   */
  onChartCommand(command: string): void {
    this.currentCommand = command;
    this.onSubmit();
  }
}
