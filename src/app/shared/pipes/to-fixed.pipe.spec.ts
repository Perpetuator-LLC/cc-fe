// Copyright (c) 2026 Perpetuator LLC
import { ToFixedPipe } from './to-fixed.pipe';

describe('ToFixedPipe', () => {
  const pipe = new ToFixedPipe();

  it('formats numbers with two decimals by default', () => {
    expect(pipe.transform(3.14159)).toBe('3.14');
    expect(pipe.transform(2)).toBe('2.00');
  });

  it('honors a custom digit count', () => {
    expect(pipe.transform(3.14159, 4)).toBe('3.1416');
    expect(pipe.transform(3.14159, 0)).toBe('3');
  });

  it('returns an empty string for null or undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
