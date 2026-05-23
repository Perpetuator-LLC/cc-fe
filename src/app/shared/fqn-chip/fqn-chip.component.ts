// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Represents a Fully Qualified Name (FQN) token
 */
export interface FqnToken {
  fqn: string; // Full FQN: "STOCK:NASDAQ:AAPL" or "COMMAND:CHART"
  display: string; // Display text: "AAPL" or "CHART"
  type: FqnTokenType;
}

export type FqnTokenType = 'stock' | 'command' | 'crypto' | 'index' | 'forex' | 'parameter' | 'value' | 'unknown';

/**
 * Utility functions for parsing and working with FQN tokens
 * FQN format uses UPPERCASE type prefixes: STOCK:, COMMAND:, CRYPTO:, INDEX:, FOREX:
 * Parsing is case-insensitive for flexibility
 */
export class FqnUtils {
  /**
   * Parse an FQN string into its components
   * Examples:
   *   "STOCK:NASDAQ:AAPL" -> { prefix: "STOCK", exchange: "NASDAQ", symbol: "AAPL" }
   *   "COMMAND:CHART" -> { prefix: "COMMAND", name: "CHART" }
   */
  static parse(fqn: string): { prefix: string; parts: string[] } {
    const parts = fqn.split(':');
    return {
      prefix: (parts[0] || '').toUpperCase(),
      parts: parts.slice(1),
    };
  }

  /**
   * Get the type from an FQN string (case-insensitive)
   */
  static getType(fqn: string): FqnTokenType {
    const upper = fqn.toUpperCase();
    if (upper.startsWith('STOCK:')) return 'stock';
    if (upper.startsWith('COMMAND:')) return 'command';
    if (upper.startsWith('CRYPTO:')) return 'crypto';
    if (upper.startsWith('INDEX:')) return 'index';
    if (upper.startsWith('FOREX:')) return 'forex';
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
   * Normalize an FQN to use uppercase prefixes
   * e.g., "stock:nasdaq:aapl" -> "STOCK:NASDAQ:AAPL"
   */
  static normalize(fqn: string): string {
    const parts = fqn.split(':');
    if (parts.length >= 2) {
      const prefix = parts[0].toUpperCase();
      if (['STOCK', 'COMMAND', 'CRYPTO', 'INDEX', 'FOREX'].includes(prefix)) {
        // Uppercase all parts for consistency
        return parts.map((p) => p.toUpperCase()).join(':');
      }
    }
    // Return as-is if not a known FQN format
    return fqn;
  }

  /**
   * Create an FqnToken from an FQN string
   */
  static toToken(fqn: string): FqnToken {
    const normalized = FqnUtils.normalize(fqn);
    return {
      fqn: normalized,
      display: FqnUtils.getDisplay(normalized),
      type: FqnUtils.getType(normalized),
    };
  }

  /**
   * Parse a full command string into tokens
   * Example: "STOCK:NASDAQ:AAPL COMMAND:CHART -period 1Y" -> [FqnToken, FqnToken, FqnToken]
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

  /** Pre-computed aria-label string to keep the template expression simple. */
  get ariaLabel(): string {
    return `Token: ${this.computedDisplay} (${this.fqn})`;
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
