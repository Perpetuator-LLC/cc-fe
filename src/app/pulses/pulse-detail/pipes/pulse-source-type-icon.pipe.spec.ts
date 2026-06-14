// Copyright (c) 2026 Perpetuator LLC
import { PulseSourceTypeIconPipe } from './pulse-source-type-icon.pipe';

describe('PulseSourceTypeIconPipe', () => {
  const pipe = new PulseSourceTypeIconPipe();

  it('maps known source types to icons', () => {
    expect(pipe.transform('rss_feed')).toBe('rss_feed');
    expect(pipe.transform('search_term')).toBe('search');
    expect(pipe.transform('watchlist')).toBe('list');
    expect(pipe.transform('company')).toBe('business');
  });

  it('falls back to the source icon', () => {
    expect(pipe.transform('unknown')).toBe('source');
  });
});
