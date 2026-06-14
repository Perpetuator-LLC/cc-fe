// Copyright (c) 2026 Perpetuator LLC
import { StartsWithPipe } from './starts-with.pipe';

describe('StartsWithPipe', () => {
  const pipe = new StartsWithPipe();

  it('checks string prefixes', () => {
    expect(pipe.transform('hello world', 'hello')).toBeTrue();
    expect(pipe.transform('hello world', 'world')).toBeFalse();
  });

  it('returns false for null or undefined values', () => {
    expect(pipe.transform(null, 'a')).toBeFalse();
    expect(pipe.transform(undefined, 'a')).toBeFalse();
  });
});
