// Copyright (c) 2025 Perpetuator LLC
import { ApolloQueryResult } from '@apollo/client/core';
import { MutationResult } from 'apollo-angular';

interface ApolloErrorParams {
  message: string;
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

export function mapQueryResult<T>(result: ApolloQueryResult<T>): T {
  if (result.errors) {
    throw new Error(result.errors.map((e) => e.message).join(', '));
  }
  return result.data;
}

export function mapMutationResult<T>(result: MutationResult<T>): T {
  if (result.errors) {
    throw new Error(result.errors.map((e) => e.message).join(', '));
  }
  if (result.data === null || result.data === undefined) {
    throw new Error('No data field was returned');
  }
  return result.data;
}

export function handleApolloError(data: ApolloErrorParams) {
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
