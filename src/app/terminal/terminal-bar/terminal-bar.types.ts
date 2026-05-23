// Copyright (c) 2025-2026 Perpetuator LLC
import { CommandHistoryItem } from '../terminal.types';
import { FqnToken } from '../../shared/fqn-chip/fqn-chip.component';

/**
 * History entry with match highlighting info.
 * Extracted from terminal-bar.component.ts so child components can use it
 * without creating a circular import.
 */
export interface MatchedHistoryEntry {
  item: CommandHistoryItem;
  tokens: FqnToken[];
  matchedText?: string;
  matchStart?: number;
  matchEnd?: number;
  // Pre-computed parts to avoid substring() calls in template
  beforeMatch?: string;
  matchText?: string;
  afterMatch?: string;
}

/**
 * Represents a completed FQN token displayed as a chip.
 */
export interface FqnChip {
  fqn: string; // Full FQN: "STOCK:NASDAQ:AAPL" or "COMMAND:CHART"
  display: string; // Display text: "AAPL" or "CHART"
  type: 'stock' | 'command' | 'crypto' | 'index' | 'forex' | 'parameter';
}
