import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { catchError, map, Observable, throwError } from 'rxjs';
import gql from 'graphql-tag';

export interface UserSettingsResult {
  key: string;
  value: string;
}

export interface UserSettingsData {
  success: boolean;
  message: string;
  results: UserSettingsResult[];
}

export interface UserSettingsResponse {
  errors?: [{ message: string }];
  data?: {
    getUserSettings: UserSettingsData;
  };
}

export interface UpdateUserSettingData {
  success: boolean;
  message: string;
}

export interface UpdateUserSettingResponse {
  errors?: [{ message: string }];
  data?: {
    updateUserSetting: UpdateUserSettingData;
  };
}

export interface UserDetails {
  id: string;
  email: string;
  username: string;
}

export interface UserDetailsResponse {
  data?: {
    getUserDetails: UserDetails;
  };
}

export interface UpdateUserDetailsResponse {
  data?: {
    updateUserDetails: UpdateUserSettingData;
  };
}

export interface ChangePasswordData {
  success: boolean;
  message: string;
}

export interface ChangePasswordResponse {
  errors?: [{ message: string }];
  data?: {
    updateUserSetting: UpdateUserSettingData;
  };
}

@Injectable({
  providedIn: 'root',
})
export class UserSettingService {
  constructor(private apollo: Apollo) {}

  getUserSettings(keys: string[]): Observable<UserSettingsData> {
    const GET_USER_SETTINGS = gql`
      query GetUserSettings {
        getUserSettings(keys: ["${keys}"]) {
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
      .query<UserSettingsResponse>({
        query: GET_USER_SETTINGS,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result: any) => {
            return result.data?.getUserSettings || { success: false, message: 'No data available', results: [] };
          },
        ),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(`GraphQL Error: ${error.message}`));
        }),
      );
  }

  updateUserSetting(key: string, value: string): Observable<UpdateUserSettingData> {
    const UPDATE_USER_SETTING = gql`
      mutation UpdateUserSetting($key: String!, $value: String!) {
        updateUserSetting(key: $key, value: $value) {
          success
          message
        }
      }
    `;

    return this.apollo
      .mutate<UpdateUserSettingResponse>({
        mutation: UPDATE_USER_SETTING,
        variables: { key, value },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result: any) => result.data?.updateUserSetting || { success: false, message: 'Failed to update setting' },
        ),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(`GraphQL Mutation Error: ${error.message}`));
        }),
      );
  }

  changePassword(password: string): Observable<ChangePasswordData> {
    const CHANGE_PASSWORD = gql`
      mutation ChangePassword($password: String!) {
        changePassword(password: $password) {
          success
          message
        }
      }
    `;

    return this.apollo
      .mutate<ChangePasswordResponse>({
        mutation: CHANGE_PASSWORD,
        variables: { password },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result: any) => result.data?.changePassword || { success: false, message: 'Failed to update password' },
        ),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(`GraphQL Mutation Error: ${error.message}`));
        }),
      );
  }

  getUserDetails(): Observable<UserDetails> {
    const GET_USER_DETAILS = gql`
      query GetUserDetails {
        getUserDetails {
          id
          email
          username
        }
      }
    `;

    return this.apollo
      .query<UserDetailsResponse>({
        query: GET_USER_DETAILS,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result: any) => result.data?.getUserDetails || { id: '', email: '', username: '' },
        ),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(`GraphQL Error: ${error.message}`));
        }),
      );
  }

  updateUserDetails(username: string, email: string): Observable<UpdateUserSettingData> {
    const UPDATE_USER_DETAILS = gql`
      mutation UpdateUserDetails($username: String!, $email: String!) {
        updateUserDetails(username: $username, email: $email) {
          success
          message
        }
      }
    `;

    return this.apollo
      .mutate<UpdateUserDetailsResponse>({
        mutation: UPDATE_USER_DETAILS,
        variables: { username, email },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result: any) => result.data?.updateUserDetails || { success: false, message: 'Failed to update details' },
        ),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(`GraphQL Mutation Error: ${error.message}`));
        }),
      );
  }
}
