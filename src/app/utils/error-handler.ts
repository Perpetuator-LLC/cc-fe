// Copyright (c) 2025-2026 Perpetuator LLC
import type { Apollo } from 'apollo-angular';

interface ApolloErrorParams {
  message: string;
  networkError?: {
    statusCode?: number;
    status?: number;
    result?: unknown;
  };
  graphQLErrors: {
    message: string;
    path: string[];
  }[];
  cause: {
    error: {
      errors: { message: string }[];
    };
    result: {
      errors: { message: string }[];
    };
  };
}

export function mapQueryResult<T>(result: Apollo.QueryResult<T>): T {
  // Apollo v4 uses 'error' (singular) instead of 'errors' (array)
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.data === undefined) {
    throw new Error('No data field was returned');
  }
  return result.data as T;
}

export function mapMutationResult<T>(result: Apollo.MutateResult<T>): T {
  // Apollo v4 uses 'error' (singular) for mutations too
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.data === null || result.data === undefined) {
    throw new Error('No data field was returned');
  }
  return result.data as T;
}

/**
 * Safely extract a field from Apollo query result data.
 * In Apollo v4, result.data can be undefined during loading states.
 * This utility provides a type-safe way to access data fields.
 */
export function extractData<T, K extends keyof T>(result: Apollo.QueryResult<T>, key: K): T[K] | undefined {
  return result.data?.[key];
}

/**
 * Extract data field, throwing if not present.
 * Use this when you expect data to always be present (e.g., after filtering loading states).
 */
export function requireData<T>(result: Apollo.QueryResult<T>): T {
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.data === undefined) {
    throw new Error('No data in query result');
  }
  return result.data as T;
}

export function handleApolloError(data: ApolloErrorParams) {
  // Check for HTTP 413 Payload Too Large error
  if (data.networkError) {
    const statusCode = data.networkError.statusCode || data.networkError.status;
    if (statusCode === 413) {
      // back-end nginx configuration limits to 1MB
      return new Error('File size exceeds the maximum limit. Please upload a smaller file.');
    }
  }

  if (data.graphQLErrors && data.graphQLErrors.length > 0) {
    const errors = data.graphQLErrors.map((e) => e.message).join(' ');
    const cause = data.graphQLErrors.map((e) => e.path.join('.')).join(' ');
    return new Error(errors, { cause });
  } else if (data.cause?.error?.errors) {
    const errors = data.cause.error.errors.map((e: { message: string }) => e.message).join(' ');
    return new Error(errors);
  } else if (data.cause?.result?.errors) {
    const errors = data.cause.result.errors.map((e: { message: string }) => e.message).join(' ');
    return new Error(errors);
  } else if (data.message) {
    return new Error(data.message);
  } else {
    return new Error('Unknown error');
  }
}
