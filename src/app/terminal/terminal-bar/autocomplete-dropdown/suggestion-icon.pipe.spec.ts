// Copyright (c) 2026 Perpetuator LLC
import { AutocompleteSuggestion, AutocompleteSuggestionType } from '../../terminal.types';
import { SuggestionIconPipe } from './suggestion-icon.pipe';

function makeSuggestion(type: AutocompleteSuggestionType, assetType?: string): AutocompleteSuggestion {
  return { fqn: 'x', display: 'x', type, assetType } as AutocompleteSuggestion;
}

describe('SuggestionIconPipe', () => {
  const pipe = new SuggestionIconPipe();

  it('maps each suggestion type to its icon', () => {
    const expected: [AutocompleteSuggestionType, string][] = [
      ['command', 'terminal'],
      ['alias', 'label'],
      ['symbol', 'trending_up'],
      ['stock', 'trending_up'],
      ['crypto', 'currency_bitcoin'],
      ['index', 'show_chart'],
      ['forex', 'currency_exchange'],
      ['recent', 'schedule'],
      ['parameter', 'settings'],
      ['example', 'lightbulb'],
      ['history', 'history'],
      ['history_ai', 'smart_toy'],
      ['natural_language', 'chat'],
    ];
    for (const [type, icon] of expected) {
      expect(pipe.transform(makeSuggestion(type)))
        .withContext(type)
        .toBe(icon);
    }
  });

  it('uses the analytics icon for ETF symbols', () => {
    expect(pipe.transform(makeSuggestion('symbol', 'ETF'))).toBe('analytics');
    expect(pipe.transform(makeSuggestion('stock', 'ETF'))).toBe('analytics');
  });

  it('falls back to chevron_right for unknown types', () => {
    expect(pipe.transform(makeSuggestion('something_new' as AutocompleteSuggestionType))).toBe('chevron_right');
  });
});
