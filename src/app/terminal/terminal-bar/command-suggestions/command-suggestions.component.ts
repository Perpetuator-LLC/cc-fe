// Copyright (c) 2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AutocompleteSuggestion } from '../../terminal.types';

/**
 * AutocompleteSuggestion enriched with pre-computed display fields so the
 * template doesn't need conditional logic.
 */
export interface DisplaySuggestion extends AutocompleteSuggestion {
  icon: string;
  /** Pre-computed primary text (symbol/name for symbol-likes, display otherwise). */
  primaryText: string;
  /** Optional secondary text shown beside the primary (e.g. "- Apple Inc."). */
  secondaryText: string;
  /** Combined desc/displaySecondary text; empty string when nothing to show. */
  descriptionText: string;
  /** Exchange (only when this suggestion type carries one). */
  exchangeText: string;
  /** Asset type (only when this suggestion type carries one). */
  assetTypeText: string;
}

@Component({
  selector: 'app-command-suggestions',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './command-suggestions.component.html',
  styleUrl: './command-suggestions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandSuggestionsComponent {
  @Input({ required: true }) suggestions: DisplaySuggestion[] = [];
  @Input({ required: true }) selectedSuggestionIndex = -1;

  @Output() suggestionSelected = new EventEmitter<AutocompleteSuggestion>();
  @Output() suggestionHovered = new EventEmitter<number>();

  selectSuggestion(suggestion: AutocompleteSuggestion): void {
    this.suggestionSelected.emit(suggestion);
  }

  setSelectedIndex(index: number): void {
    this.suggestionHovered.emit(index);
  }
}
