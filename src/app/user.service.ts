import { Injectable, signal, WritableSignal } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { catchError, map, Observable, of, throwError } from 'rxjs';
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

export interface StatusAndMessageData {
  success: boolean;
  message: string;
}

export interface UpdateUserSettingResponse {
  errors?: [{ message: string }];
  data?: {
    updateUserSetting: StatusAndMessageData;
  };
}

export interface CancelEmailChangeResponse {
  errors?: [{ message: string }];
  data?: {
    cancelEmailChange: StatusAndMessageData;
  };
}

export interface ResendEmailChangeResponse {
  errors?: [{ message: string }];
  data?: {
    resendEmailChange: StatusAndMessageData;
  };
}

export interface UserDetails {
  id: string;
  email: string;
  username: string;
}

export interface UserDetailsResponse {
  errors?: [{ message: string }];
  data?: {
    getUserDetails: UserDetails;
  };
}

export interface UpdateUserDetailsResponse {
  data?: {
    updateUserDetails: StatusAndMessageData;
  };
}

export interface ChangePasswordData {
  success: boolean;
  message: string;
}

export interface ChangePasswordResponse {
  errors?: [{ message: string }];
  data?: {
    updateUserSetting: StatusAndMessageData;
  };
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private userDetailsSignal: WritableSignal<{ username: string; email: string } | null> = signal(null);
  private emailChangePending: { newEmail: string } | null = null;

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

  updateUserSetting(key: string, value: string): Observable<StatusAndMessageData> {
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

  get userDetails(): WritableSignal<{ username: string; email: string } | null> {
    return this.userDetailsSignal;
  }

  get emailChangePendingDetails(): { newEmail: string } | null {
    return this.emailChangePending;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loadUserDetails(callback?: any): void {
    const GET_USER_DETAILS = gql`
      query GetUserDetails {
        getUserDetails {
          id
          email
          username
        }
      }
    `;

    this.apollo
      .query<{ getUserDetails: { username: string; email: string } }>({
        query: GET_USER_DETAILS,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data?.getUserDetails || null),
        catchError((error) => {
          console.error('Failed to load user details:', error);
          return of(null);
        }),
      )
      .subscribe({
        next: (userDetails) => {
          console.log('userDetails', userDetails);
          this.userDetailsSignal.set(userDetails);
          if (callback) callback(userDetails);
        },
        error: (err) => {
          console.error('Failed to load user details:', err);
        },
      });
  }

  loadUserEmailChangePending(): Observable<{ newEmail: string } | null> {
    const GQL = gql`
      query GetEmailChangePending {
        getEmailChangePending {
          newEmail
        }
      }
    `;

    return this.apollo
      .query<{ getEmailChangePending: { newEmail: string } }>({
        query: GQL,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data?.getEmailChangePending || null),
        catchError((error) => {
          console.error('Failed to load email change pending:', error);
          return of(null);
        }),
      );
    // .subscribe({
    //   next: (emailChangePendingDetails) => {
    //     console.log('emailChangePendingDetails', emailChangePendingDetails);
    //     this.emailChangePending = emailChangePendingDetails;
    //   },
    //   error: (err) => {
    //     console.error('Failed to load email change pending:', err);
    //   },
    // });
  }

  cancelEmailChange(): Observable<null> {
    const CANCEL_EMAIL_CHANGE = gql`
      mutation CancelEmailChange {
        cancelEmailChange {
          success
          message
        }
      }
    `;

    return this.apollo
      .mutate<CancelEmailChangeResponse>({
        mutation: CANCEL_EMAIL_CHANGE,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result: any) =>
            result.data?.resendEmailChange || { success: false, message: 'Failed to resend email change' },
        ),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(`GraphQL Mutation Error: ${error.message}`));
        }),
      );
  }

  resendEmailChange(): Observable<null> {
    const RESEND_EMAIL_CHANGE = gql`
      mutation ResendEmailChange {
        resendEmailChange {
          success
          message
        }
      }
    `;

    return this.apollo
      .mutate<ResendEmailChangeResponse>({
        mutation: RESEND_EMAIL_CHANGE,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result: any) =>
            result.data?.resendEmailChange || { success: false, message: 'Failed to resend email change' },
        ),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(`GraphQL Mutation Error: ${error.message}`));
        }),
      );
  }

  clearUserDetails(): void {
    this.userDetailsSignal.set(null);
  }

  updateUserDetails(username: string, email: string): Observable<StatusAndMessageData> {
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
          if (error.cause?.error?.errors) {
            throw new Error(error.cause.error.errors.map((e: { message: string }) => e.message).join(', '));
          }
          return throwError(() => new Error(`GraphQL Mutation Error: ${error.message}`));
        }),
      );
  }
}
