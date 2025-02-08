import { catchError, map } from 'rxjs/operators';
import { handleApolloError, mapMutationResult, mapQueryResult } from './utils/error-handler';
import { Observable } from 'rxjs';
import { Apollo, QueryRef } from 'apollo-angular';
import { FetchResult, MutationOptions, QueryOptions } from '@apollo/client';

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
    return this.apollo.query<T>(options).pipe(map(mapQueryResult), catchError(handleApolloError));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected watchQuery<T>(options: any): QueryRef<T> {
    return this.apollo.watchQuery<T>({
      ...options,
      fetchPolicy: 'network-only',
    });
  }

  protected mutate<T>(options: MutationOptions<T>): Observable<T> {
    return this.apollo.mutate<T>(options).pipe(map(mapMutationResult), catchError(handleApolloError));
  }
}
