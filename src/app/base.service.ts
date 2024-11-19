import { catchError, map } from 'rxjs/operators';
import { handleApolloError } from './utils/error-handler';
import { Observable } from 'rxjs';
import { GraphQLFormattedError } from 'graphql/error';
import { Apollo } from 'apollo-angular';
import { FetchResult, MutationOptions, QueryOptions } from '@apollo/client';
import { ApolloQueryResult } from '@apollo/client/core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MutationResult<TData = any> = FetchResult<TData> & {
  loading?: boolean;
};

export interface BaseResponse {
  success: boolean;
  message: string;
}

export interface CommonResponse<T> extends BaseResponse {
  results: T;
}

export abstract class BaseService {
  protected constructor(protected apollo: Apollo) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected query<T>(options: QueryOptions<any, T>): Observable<T> {
    return this.apollo.query<T>(options).pipe(
      map((result: ApolloQueryResult<T>) => {
        if (result.errors) {
          throw new Error(result.errors.map((e) => e.message).join(', '));
        }
        return result.data;
      }),
      catchError(handleApolloError),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected watchQuery<T>(options: QueryOptions<any, T>): Observable<T> {
    return this.apollo.watchQuery<T>(options).valueChanges.pipe(
      map((result: ApolloQueryResult<T>) => {
        if (result.errors) {
          throw new Error(result.errors.map((e) => e.message).join(', '));
        }
        return result.data;
      }),
      catchError(handleApolloError),
    );
  }

  protected mutate<T>(options: MutationOptions<T>): Observable<T> {
    return this.apollo.mutate<T>(options).pipe(
      map((result: MutationResult<T>) => {
        if (result.errors) {
          throw new Error(result.errors.map((e: GraphQLFormattedError) => e.message).join(', '));
        }
        if (result.data === null || result.data === undefined) {
          throw new Error('No data returned from the mutation');
        }
        return result.data;
      }),
      catchError(handleApolloError),
    );
  }
}
