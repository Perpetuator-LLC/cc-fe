// Copyright (c) 2025 Perpetuator LLC
import { catchError, map } from 'rxjs/operators';
import { mapMutationResult, mapQueryResult } from './utils/error-handler';
import { Observable } from 'rxjs';
import { Apollo, QueryRef } from 'apollo-angular';
import { FetchResult, MutationOptions, QueryOptions } from '@apollo/client';
import { Injectable } from '@angular/core';
import { ErrorHandlerService } from './error-handler.service';

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

@Injectable({
  providedIn: 'root',
})
export abstract class BaseService {
  protected constructor(
    protected apollo: Apollo,
    protected errorHandler: ErrorHandlerService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected query<T>(options: QueryOptions<any, T>): Observable<T> {
    return this.apollo.query<T>(options).pipe(
      map(mapQueryResult),
      catchError((error) => this.errorHandler.handleError(error)),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected watchQuery<T>(options: any): QueryRef<T> {
    return this.apollo.watchQuery<T>({
      ...options,
      fetchPolicy: 'network-only',
    });
  }

  protected mutate<T>(options: MutationOptions<T>): Observable<T> {
    return this.apollo.mutate<T>(options).pipe(
      map(mapMutationResult),
      catchError((error) => this.errorHandler.handleError(error)),
    );
  }
}
