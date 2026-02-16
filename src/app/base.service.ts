// Copyright (c) 2025-2026 Perpetuator LLC
import { catchError, map } from 'rxjs/operators';
import { mapMutationResult, mapQueryResult } from './utils/error-handler';
import { Observable } from 'rxjs';
import { Apollo, QueryRef } from 'apollo-angular';
import { ApolloClient } from '@apollo/client/core';
import { inject, Injectable } from '@angular/core';
import { ErrorHandlerService } from './utils/error-handler.service';

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
  protected readonly apollo = inject(Apollo);
  protected readonly errorHandler = inject(ErrorHandlerService);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected query<T>(options: ApolloClient.QueryOptions<T, any>): Observable<T> {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected mutate<T>(options: ApolloClient.MutateOptions<T, any>): Observable<T> {
    return this.apollo.mutate<T>(options).pipe(
      map(mapMutationResult),
      catchError((error) => this.errorHandler.handleError(error)),
    );
  }
}
