// Copyright (c) 2026 Perpetuator LLC
import { PulseTimeAgoPipe } from './pulse-time-ago.pipe';

describe('PulseTimeAgoPipe', () => {
  const pipe = new PulseTimeAgoPipe();

  it('formats recent dates as relative time', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(pipe.transform(fiveMinutesAgo)).toBe('5m ago');
  });

  it('returns Never for missing dates', () => {
    expect(pipe.transform(null)).toBe('Never');
    expect(pipe.transform(undefined)).toBe('Never');
  });
});
