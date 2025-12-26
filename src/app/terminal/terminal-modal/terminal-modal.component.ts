// Copyright (c) 2025 Perpetuator LLC
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { TerminalService } from '../terminal.service';
import { HistoryEntry } from '../terminal.types';
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
  protected terminalService = inject(TerminalService);

  currentCommand = '';
  private subscriptions = new Subscription();
  private historyIndex = -1;

  get history(): HistoryEntry[] {
    return this.terminalService.history();
  }

  get isProcessing(): boolean {
    const hist = this.history;
    return hist.length > 0 && (hist[hist.length - 1].isLoading ?? false);
  }

  ngOnInit(): void {
    // Subscribe to command results to auto-scroll
    this.subscriptions.add(
      this.terminalService.onCommandResult.subscribe(() => {
        setTimeout(() => this.scrollToBottom(), 100);
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
    this.historyIndex = -1;
    setTimeout(() => this.scrollToBottom(), 100);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.dialogRef.close();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.navigateHistory(-1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.navigateHistory(1);
    }
  }

  private navigateHistory(direction: number): void {
    const commands = this.terminalService.commandHistory();
    if (commands.length === 0) return;

    this.historyIndex += direction;
    if (this.historyIndex < 0) {
      this.historyIndex = -1;
      this.currentCommand = '';
    } else if (this.historyIndex >= commands.length) {
      this.historyIndex = commands.length - 1;
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

  private scrollToBottom(): void {
    if (this.historyContainer?.nativeElement) {
      const container = this.historyContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
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
}
