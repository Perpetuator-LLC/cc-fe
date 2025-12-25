// Copyright (c) 2025 Perpetuator LLC
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  AfterViewChecked,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { TerminalService } from '../terminal.service';
import { HistoryEntry, TerminalConnectionState } from '../terminal.types';
import { ChartPanelComponent } from '../chart-panel/chart-panel.component';
import { DataTableComponent } from '../data-table/data-table.component';

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
    MatSnackBarModule,
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

  currentInput = '';
  private shouldScrollToBottom = false;
  private subscriptions = new Subscription();

  constructor(
    protected terminalService: TerminalService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    // Listen for errors and display them
    this.subscriptions.add(
      this.terminalService.onError.subscribe((error) => {
        console.error('Terminal error:', error);
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

    if (entry.result?.message) {
      text = entry.result.message;
    } else if (entry.result?.data) {
      text = JSON.stringify(entry.result.data, null, 2);
    }

    if (text) {
      this.copyToClipboard(text, 'Result copied');
    }
  }

  private copyToClipboard(text: string, successMessage: string): void {
    navigator.clipboard.writeText(text).then(
      () => {
        this.snackBar.open(successMessage, '', {
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      },
      (err) => {
        console.error('Failed to copy:', err);
        this.snackBar.open('Failed to copy', '', {
          duration: 2000,
        });
      },
    );
  }

  private scrollToBottom(): void {
    if (this.historyContainer?.nativeElement) {
      const el = this.historyContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
