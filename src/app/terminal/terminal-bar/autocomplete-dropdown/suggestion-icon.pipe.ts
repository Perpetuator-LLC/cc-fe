// Copyright (c) 2026 Perpetuator LLC
import { Pipe, PipeTransform } from '@angular/core';
import { AutocompleteSuggestion } from '../../terminal.types';

@Pipe({
  name: 'suggestionIcon',
  standalone: true,
  pure: true,
})
export class SuggestionIconPipe implements PipeTransform {
  transform(suggestion: AutocompleteSuggestion): string {
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
