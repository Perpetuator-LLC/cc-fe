// src/app/services/base.service.ts
import { Apollo } from 'apollo-angular';
import { catchError, map } from 'rxjs/operators';
import { handleApolloError } from './utils/error-handler';
import { Observable } from 'rxjs';
// import { DocumentNode } from 'graphql/language';
// import { TypedDocumentNode } from '@apollo/client';
// import { EmptyObject } from 'apollo-angular/types';

export abstract class BaseService {
  constructor(protected apollo: Apollo) {}

  protected query<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    variables: any,
  ): Observable<T> {
    return this.apollo.query<T>({ query, variables }).pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map((result: any) => {
        if (result.errors) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          throw new Error(result.errors.map((e: any) => e.message).join(', '));
        }
        return result.data;
      }),
      catchError(handleApolloError),
    );
  }

  protected mutate<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutation: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    variables: any = {},
  ): Observable<T> {
    return this.apollo.mutate<T>({ mutation, variables }).pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map((result: any) => {
        if (result.errors) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          throw new Error(result.errors.map((e: any) => e.message).join(', '));
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
