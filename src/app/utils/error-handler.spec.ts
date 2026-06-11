// Copyright (c) 2026 Perpetuator LLC
import type { Apollo } from 'apollo-angular';
import { extractData, handleApolloError, mapMutationResult, mapQueryResult, requireData } from './error-handler';

type ErrorParams = Parameters<typeof handleApolloError>[0];

interface Data {
  foo: string;
}

describe('mapQueryResult', () => {
  it('returns data when present', () => {
    const result = { data: { foo: 'bar' } } as Apollo.QueryResult<Data>;
    expect(mapQueryResult(result)).toEqual({ foo: 'bar' });
  });

  it('throws the error message when error is set', () => {
    const result = { error: { message: 'boom' } } as Apollo.QueryResult<Data>;
    expect(() => mapQueryResult(result)).toThrowError('boom');
  });

  it('throws when no data field was returned', () => {
    const result = {} as Apollo.QueryResult<Data>;
    expect(() => mapQueryResult(result)).toThrowError('No data field was returned');
  });
});

describe('mapMutationResult', () => {
  it('returns data when present', () => {
    const result = { data: { foo: 'bar' } } as Apollo.MutateResult<Data>;
    expect(mapMutationResult(result)).toEqual({ foo: 'bar' });
  });

  it('throws the error message when error is set', () => {
    const result = { error: { message: 'mutation failed' } } as Apollo.MutateResult<Data>;
    expect(() => mapMutationResult(result)).toThrowError('mutation failed');
  });

  it('throws when data is null or undefined', () => {
    expect(() => mapMutationResult({ data: null } as unknown as Apollo.MutateResult<Data>)).toThrowError(
      'No data field was returned',
    );
    expect(() => mapMutationResult({} as Apollo.MutateResult<Data>)).toThrowError('No data field was returned');
  });
});

describe('extractData', () => {
  it('returns the requested field when data is present', () => {
    const result = { data: { foo: 'bar' } } as Apollo.QueryResult<Data>;
    expect(extractData(result, 'foo')).toBe('bar');
  });

  it('returns undefined when data is missing', () => {
    const result = {} as Apollo.QueryResult<Data>;
    expect(extractData(result, 'foo')).toBeUndefined();
  });
});

describe('requireData', () => {
  it('returns data when present', () => {
    const result = { data: { foo: 'bar' } } as Apollo.QueryResult<Data>;
    expect(requireData(result)).toEqual({ foo: 'bar' });
  });

  it('throws the error message when error is set', () => {
    const result = { error: { message: 'nope' } } as Apollo.QueryResult<Data>;
    expect(() => requireData(result)).toThrowError('nope');
  });

  it('throws when data is missing', () => {
    const result = {} as Apollo.QueryResult<Data>;
    expect(() => requireData(result)).toThrowError('No data in query result');
  });
});

describe('handleApolloError', () => {
  it('maps HTTP 413 (statusCode) to a friendly file-size message', () => {
    const err = handleApolloError({ message: 'x', networkError: { statusCode: 413 } } as ErrorParams);
    expect(err.message).toContain('File size exceeds the maximum limit');
  });

  it('maps HTTP 413 (status fallback) to a friendly file-size message', () => {
    const err = handleApolloError({ message: 'x', networkError: { status: 413 } } as ErrorParams);
    expect(err.message).toContain('File size exceeds the maximum limit');
  });

  it('joins graphQLErrors messages and paths', () => {
    const err = handleApolloError({
      message: 'outer',
      graphQLErrors: [
        { message: 'first', path: ['a', 'b'] },
        { message: 'second', path: ['c'] },
      ],
    } as ErrorParams);
    expect(err.message).toBe('first second');
    expect(err.cause).toBe('a.b c');
  });

  it('ignores non-413 network errors and falls through to graphQLErrors', () => {
    const err = handleApolloError({
      message: 'outer',
      networkError: { statusCode: 500 },
      graphQLErrors: [{ message: 'server says no', path: ['q'] }],
    } as ErrorParams);
    expect(err.message).toBe('server says no');
  });

  it('extracts messages from cause.error.errors', () => {
    const err = handleApolloError({
      message: 'outer',
      cause: { error: { errors: [{ message: 'cause-a' }, { message: 'cause-b' }] } },
    } as ErrorParams);
    expect(err.message).toBe('cause-a cause-b');
  });

  it('extracts messages from cause.result.errors', () => {
    const err = handleApolloError({
      message: 'outer',
      cause: { result: { errors: [{ message: 'result-err' }] } },
    } as ErrorParams);
    expect(err.message).toBe('result-err');
  });

  it('falls back to the top-level message', () => {
    const err = handleApolloError({ message: 'plain failure' } as ErrorParams);
    expect(err.message).toBe('plain failure');
  });

  it('returns Unknown error when nothing usable is present', () => {
    const err = handleApolloError({} as ErrorParams);
    expect(err.message).toBe('Unknown error');
  });
});
