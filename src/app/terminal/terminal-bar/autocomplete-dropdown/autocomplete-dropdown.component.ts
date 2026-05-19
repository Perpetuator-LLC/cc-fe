// Copyright (c) 2026 Perpetuator LLC
import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AutocompleteSuggestion } from '../../terminal.types';

@Component({
  selector: 'app-terminal-autocomplete',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './autocomplete-dropdown.component.html',
  styleUrl: './autocomplete-dropdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalAutocompleteComponent {
  @Input({ required: true }) suggestions: AutocompleteSuggestion[] = [];
  @Input({ required: true }) selectedIndex = -1;

  @Output() selectSuggestion = new EventEmitter<AutocompleteSuggestion>();
  @Output() hoverIndex = new EventEmitter<number>();

  getSuggestionIcon(suggestion: AutocompleteSuggestion): string {
    switch (suggestion.type) {
      case 'command':
        return 'terminal';
      case 'alias':
        return 'label';
      case 'symbol':
      case 'stock':
        return suggestion.assetType === 'ETF' ? 'analytics' : 'trending_up';
      case 'crypto':
        return 'currency_bitcoin';
      case 'index':
        return 'show_chart';
      case 'forex':
        return 'currency_exchange';
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
}
