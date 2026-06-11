// Copyright (c) 2026 Perpetuator LLC
import { MethodCallPipe } from './method-call.pipe';

describe('MethodCallPipe', () => {
  const pipe = new MethodCallPipe();

  it('calls the named method on the value', () => {
    expect(pipe.transform('hello', 'toUpperCase')).toBe('HELLO');
    expect(pipe.transform('  padded  ', 'trim')).toBe('padded');
    expect(pipe.transform(1234567, 'toLocaleString')).toBe((1234567).toLocaleString());
  });

  it('forwards extra arguments to the method', () => {
    expect(pipe.transform('a-b-c', 'split', '-')).toEqual(['a', 'b', 'c']);
  });

  it('returns null and undefined unchanged', () => {
    expect(pipe.transform(null, 'toUpperCase')).toBeNull();
    expect(pipe.transform(undefined, 'toUpperCase')).toBeUndefined();
  });

  it('returns the value unchanged when the method does not exist', () => {
    expect(pipe.transform('hello', 'notAMethod')).toBe('hello');
  });
});
