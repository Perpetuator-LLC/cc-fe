// Copyright (c) 2025-2026 Perpetuator LLC
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  AfterViewChecked,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { marked } from 'marked';
import { TerminalService } from '../terminal.service';
import {
  HistoryEntry,
  TerminalConnectionState,
  TerminalHints,
  ChartControls,
  CommandResult,
  ChartResultData,
} from '../terminal.types';
import { ChartPanelComponent } from '../chart-panel/chart-panel.component';
import { DataTableComponent } from '../data-table/data-table.component';
import { MessageService } from '../../message.service';

@Component({
  selector: 'app-terminal-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ChartPanelComponent,
    DataTableComponent,
  ],
  templateUrl: './terminal-input.component.html',
  styleUrl: './terminal-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalInputComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('inputElement') inputElement!: ElementRef<HTMLInputElement>;
  @ViewChild('historyContainer') historyContainer!: ElementRef<HTMLDivElement>;

  private sanitizer = inject(DomSanitizer);

  currentInput = '';
  hints: TerminalHints = {
    quickExamples: ['STOCK:NASDAQ:AAPL COMMAND:HP', 'COMMAND:HELP'],
    placeholderText: 'Enter command...',
    emptyStateMessage: 'Try: AAPL HP, HELP, or ask a question.',
    dashboardHint: '',
    chartSuggestion: 'STOCK:NASDAQ:AAPL COMMAND:CHART',
  };
  private shouldScrollToBottom = false;
  private subscriptions = new Subscription();

  constructor(
    protected terminalService: TerminalService,
    private messageService: MessageService,
  ) {}

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
      }),
    );

    // Listen for errors and display them via MessageService
    this.subscriptions.add(
      this.terminalService.onError.subscribe((error) => {
        this.messageService.error(`Terminal: ${error}`);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  get history(): HistoryEntry[] {
    return this.terminalService.history();
  }

  get connectionState(): TerminalConnectionState {
    return this.terminalService.connectionState();
  }

  get isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  get isLoading(): boolean {
    const history = this.history;
    return history.length > 0 && (history[history.length - 1].isLoading ?? false);
  }

  get isHistoryLoading(): boolean {
    return this.terminalService.historyLoading();
  }

  /**
   * Check if a history entry is in "fetching" state (waiting for data from backend job)
   */
  isFetching(entry: HistoryEntry): boolean {
    if (entry.result?.data && typeof entry.result.data === 'object') {
      const data = entry.result.data as { status?: string };
      return data.status === 'fetching';
    }
    return false;
  }

  /**
   * Get the fetching message for a history entry
   */
  getFetchingMessage(entry: HistoryEntry): string {
    return entry.result?.message || 'Fetching data from external source...';
  }

  executeCommand(): void {
    if (!this.currentInput.trim() || this.isLoading) {
      return;
    }

    try {
      this.terminalService.execute(this.currentInput);
      this.currentInput = '';
      this.shouldScrollToBottom = true;
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.currentInput = this.terminalService.navigateHistory(-1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.currentInput = this.terminalService.navigateHistory(1);
    } else if (event.key === 'Enter') {
      this.executeCommand();
    }
  }

  onInputChange(): void {
    this.terminalService.resetHistoryIndex();
  }

  clearHistory(): void {
    this.terminalService.clearHistory();
  }

  focusInput(): void {
    this.inputElement?.nativeElement?.focus();
  }

  getConnectionIcon(): string {
    switch (this.connectionState) {
      case 'connected':
        return 'cloud_done';
      case 'connecting':
        return 'cloud_sync';
      case 'reconnecting':
        return 'cloud_sync';
      case 'disconnected':
        return 'cloud_off';
      default:
        return 'cloud_off';
    }
  }

  getConnectionTooltip(): string {
    switch (this.connectionState) {
      case 'connected':
        return 'Connected to terminal';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown status';
    }
  }

  copyCommand(command: string, event: Event): void {
    event.stopPropagation();
    this.copyToClipboard(command, 'Command copied');
  }

  copyResult(entry: HistoryEntry, event: Event): void {
    event.stopPropagation();
    let text = '';

    if (entry.result?.data) {
      // Format data as markdown table if it's tabular
      text = this.formatDataForCopy(entry.result.data);
    } else if (entry.result?.message) {
      text = entry.result.message;
    }

    if (text) {
      this.copyToClipboard(text, 'Result copied');
    } else {
      this.messageService.info('No data to copy', 2000);
    }
  }

  /**
   * Format data for clipboard - converts to markdown table if possible
   */
  private formatDataForCopy(data: unknown): string {
    if (!data) return '';

    // If it's an array of objects, format as markdown table
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      return this.formatAsMarkdownTable(data as Record<string, unknown>[]);
    }

    // If it's a TableData structure with type: 'table'
    if (typeof data === 'object' && data !== null) {
      const tableData = data as {
        type?: string;
        title?: string;
        headers?: string[];
        rows?: unknown[][];
        columns?: { key: string; label: string }[];
      };

      // Handle TableData format: {type: 'table', headers: [...], rows: [...]}
      if (tableData.type === 'table' && tableData.headers && tableData.rows) {
        const title = tableData.title ? `# ${tableData.title}\n\n` : '';
        const header = '| ' + tableData.headers.join(' | ') + ' |';
        const separator = '| ' + tableData.headers.map(() => '---').join(' | ') + ' |';
        const rows = tableData.rows
          .map((row) => '| ' + (row as unknown[]).map((v) => String(v ?? '')).join(' | ') + ' |')
          .join('\n');
        return `${title}${header}\n${separator}\n${rows}`;
      }

      // Handle plain object as key-value table: {symbol: "AAPL", name: "Apple", ...}
      if (!tableData.type && !tableData.headers && !tableData.rows) {
        const entries = Object.entries(data as Record<string, unknown>);
        if (entries.length > 0) {
          const header = '| key | value |';
          const separator = '| --- | --- |';
          const rows = entries
            .map(([key, value]) => {
              const val = value === null || value === undefined ? '' : String(value);
              return `| ${key} | ${val} |`;
            })
            .join('\n');
          return `${header}\n${separator}\n${rows}`;
        }
      }
    }

    // Fallback to JSON
    return JSON.stringify(data, null, 2);
  }

  /**
   * Format array of objects as markdown table
   */
  private formatAsMarkdownTable(data: Record<string, unknown>[], headers?: string[]): string {
    if (!data || data.length === 0) return '';

    const keys = headers || Object.keys(data[0]);
    const header = '| ' + keys.join(' | ') + ' |';
    const separator = '| ' + keys.map(() => '---').join(' | ') + ' |';
    const rows = data
      .map((row) => {
        const values = keys.map((key) => {
          const val = row[key];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val);
        });
        return '| ' + values.join(' | ') + ' |';
      })
      .join('\n');

    return `${header}\n${separator}\n${rows}`;
  }

  private copyToClipboard(text: string, successMessage: string): void {
    navigator.clipboard.writeText(text).then(
      () => {
        this.messageService.success(successMessage, 2000);
      },
      (err) => {
        console.error('Failed to copy:', err);
        this.messageService.error('Failed to copy to clipboard');
      },
    );
  }

  private scrollToBottom(): void {
    if (this.historyContainer?.nativeElement) {
      const el = this.historyContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
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
    this.currentInput = command;
    this.executeCommand();
  }
}
