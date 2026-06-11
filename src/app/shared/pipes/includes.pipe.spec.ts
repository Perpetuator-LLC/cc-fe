// Copyright (c) 2026 Perpetuator LLC
import { IncludesPipe } from './includes.pipe';

describe('IncludesPipe', () => {
  const pipe = new IncludesPipe();

  it('checks substring membership for strings', () => {
    expect(pipe.transform('hello world', 'world')).toBeTrue();
    expect(pipe.transform('hello world', 'mars')).toBeFalse();
  });

  it('checks element membership for arrays', () => {
    expect(pipe.transform(['a', 'b'], 'a')).toBeTrue();
    expect(pipe.transform([1, 2, 3], 4)).toBeFalse();
  });

  it('returns false for null or undefined values', () => {
    expect(pipe.transform(null, 'a')).toBeFalse();
    expect(pipe.transform(undefined, 'a')).toBeFalse();
  });
});
