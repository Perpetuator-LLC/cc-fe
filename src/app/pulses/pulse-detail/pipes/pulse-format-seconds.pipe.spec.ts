// Copyright (c) 2026 Perpetuator LLC
import { PulseFormatSecondsPipe } from './pulse-format-seconds.pipe';

describe('PulseFormatSecondsPipe', () => {
  const pipe = new PulseFormatSecondsPipe();

  it('formats seconds as M:SS', () => {
    expect(pipe.transform(65)).toBe('1:05');
    expect(pipe.transform(0)).toBe('0:00');
    expect(pipe.transform(null)).toBe('0:00');
  });
});
