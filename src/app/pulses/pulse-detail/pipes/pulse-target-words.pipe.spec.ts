// Copyright (c) 2026 Perpetuator LLC
import { PulseTargetWordsPipe } from './pulse-target-words.pipe';

describe('PulseTargetWordsPipe', () => {
  const pipe = new PulseTargetWordsPipe();

  it('multiplies minutes by words per minute', () => {
    expect(pipe.transform(5, 160)).toBe(800);
  });

  it('defaults words per minute to 150', () => {
    expect(pipe.transform(5, null)).toBe(750);
    expect(pipe.transform(5, undefined)).toBe(750);
  });

  it('returns 0 when minutes are missing', () => {
    expect(pipe.transform(null, 160)).toBe(0);
    expect(pipe.transform(undefined, undefined)).toBe(0);
  });
});
