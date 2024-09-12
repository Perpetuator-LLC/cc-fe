import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { catchError, map, Observable, throwError } from 'rxjs';
import gql from 'graphql-tag';

export interface UserPreferencesResult {
  key: string;
  value: string;
}

export interface UserPreferencesData {
  success: boolean;
  message: string;
  results: UserPreferencesResult[];
}

export interface UserPreferencesResponse {
  errors?: [{ message: string }];
  data?: {
    getUserPreferences: UserPreferencesData;
  };
}

export interface UpdateUserPreferenceData {
  success: boolean;
  message: string;
}

export interface UpdateUserPreferenceResponse {
  errors?: [{ message: string }];
  data?: {
    updateUserPreference: UpdateUserPreferenceData;
  };
}

@Injectable({
  providedIn: 'root',
})
export class UserPreferenceService {
  constructor(private apollo: Apollo) {}

  getUserPreferences(keys: string[]): Observable<UserPreferencesData> {
    const GET_USER_PREFERENCES = gql`
      query GetUserPreferences {
        getUserPreferences(keys: ["${keys}"]) {
          success
          message
          results {
            key
            value
          }
        }
      }
    `;

    return this.apollo
      .query<UserPreferencesResponse>({
        query: GET_USER_PREFERENCES,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result: any) => {
            return result.data?.getUserPreferences || { success: false, message: 'No data available', results: [] };
          },
        ),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(`GraphQL Error: ${error.message}`));
        }),
      );
  }

  updateUserPreference(key: string, value: string): Observable<UpdateUserPreferenceData> {
    const UPDATE_USER_PREFERENCE = gql`
      mutation UpdateUserPreference($key: String!, $value: String!) {
        updateUserPreference(key: $key, value: $value) {
          success
          message
        }
      }
    `;

    return this.apollo
      .mutate<UpdateUserPreferenceResponse>({
        mutation: UPDATE_USER_PREFERENCE,
        variables: { key, value },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result: any) =>
            result.data?.updateUserPreference || { success: false, message: 'Failed to update preference' },
        ),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(`GraphQL Mutation Error: ${error.message}`));
        }),
      );
  }
}
