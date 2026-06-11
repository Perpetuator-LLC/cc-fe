// Copyright (c) 2026 Perpetuator LLC
import { PulseSourceTypeLabelPipe } from './pulse-source-type-label.pipe';

describe('PulseSourceTypeLabelPipe', () => {
  const pipe = new PulseSourceTypeLabelPipe();

  it('maps known source types to labels', () => {
    expect(pipe.transform('rss_feed')).toBe('RSS Feed');
    expect(pipe.transform('search_term')).toBe('Search Term');
    expect(pipe.transform('watchlist')).toBe('Watchlist');
    expect(pipe.transform('company')).toBe('Company');
  });

  it('returns the raw type when unknown', () => {
    expect(pipe.transform('mystery_source')).toBe('mystery_source');
  });
});
