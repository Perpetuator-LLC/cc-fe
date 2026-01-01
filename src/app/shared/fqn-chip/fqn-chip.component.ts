// Copyright (c) 2025 Perpetuator LLC
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Represents a Fully Qualified Name (FQN) token
 */
export interface FqnToken {
  fqn: string; // Full FQN: "stock:NASDAQ:AAPL" or "command:CHART"
  display: string; // Display text: "AAPL" or "CHART"
  type: FqnTokenType;
}

export type FqnTokenType = 'stock' | 'command' | 'crypto' | 'index' | 'forex' | 'parameter' | 'unknown';

/**
 * Utility functions for parsing and working with FQN tokens
 */
export class FqnUtils {
  /**
   * Parse an FQN string into its components
   * Examples:
   *   "stock:NASDAQ:AAPL" -> { prefix: "stock", exchange: "NASDAQ", symbol: "AAPL" }
   *   "command:CHART" -> { prefix: "command", name: "CHART" }
   */
  static parse(fqn: string): { prefix: string; parts: string[] } {
    const parts = fqn.split(':');
    return {
      prefix: parts[0] || '',
      parts: parts.slice(1),
    };
  }

  /**
   * Get the type from an FQN string
   */
  static getType(fqn: string): FqnTokenType {
    if (fqn.startsWith('stock:')) return 'stock';
    if (fqn.startsWith('command:')) return 'command';
    if (fqn.startsWith('crypto:')) return 'crypto';
    if (fqn.startsWith('index:')) return 'index';
    if (fqn.startsWith('forex:')) return 'forex';
    if (fqn.startsWith('-')) return 'parameter';
    return 'unknown';
  }

  /**
   * Get the display text from an FQN string
   */
  static getDisplay(fqn: string): string {
    const parts = fqn.split(':');
    // Return the last part (symbol or command name)
    return parts[parts.length - 1] || fqn;
  }

  /**
   * Create an FqnToken from an FQN string
   */
  static toToken(fqn: string): FqnToken {
    return {
      fqn,
      display: FqnUtils.getDisplay(fqn),
      type: FqnUtils.getType(fqn),
    };
  }

  /**
   * Parse a full command string into tokens
   * Example: "stock:NASDAQ:AAPL command:CHART -period 1Y" -> [FqnToken, FqnToken, FqnToken]
   */
  static parseCommand(command: string): FqnToken[] {
    const tokens: FqnToken[] = [];
    const parts = command.trim().split(/\s+/);

    for (const part of parts) {
      if (part.includes(':') || part.startsWith('-')) {
        tokens.push(FqnUtils.toToken(part));
      } else {
        // Raw text - treat as unknown
        tokens.push({ fqn: part, display: part, type: 'unknown' });
      }
    }

    return tokens;
  }
}

/**
 * A reusable component for displaying FQN tokens as colored chips
 * Used across terminal bar, watchlist, history, etc.
 */
@Component({
  selector: 'app-fqn-chip',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  templateUrl: './fqn-chip.component.html',
  styleUrl: './fqn-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FqnChipComponent {
  @Input({ required: true }) fqn!: string;
  @Input() display?: string;
  @Input() type?: FqnTokenType;
  @Input() removable = false;

  @Output() removed = new EventEmitter<string>();
  @Output() clicked = new EventEmitter<string>();

  get computedDisplay(): string {
    return this.display || FqnUtils.getDisplay(this.fqn);
  }

  get computedType(): FqnTokenType {
    return this.type || FqnUtils.getType(this.fqn);
  }

  onClick(): void {
    if (!this.removable) {
      this.clicked.emit(this.fqn);
    }
  }

  onRemove(event: Event): void {
    event.stopPropagation();
    this.removed.emit(this.fqn);
  }
}
