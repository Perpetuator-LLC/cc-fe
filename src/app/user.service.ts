import { Injectable, signal, WritableSignal, OnDestroy } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { catchError, map, Observable, of, Subscription, throwError } from 'rxjs';
import gql from 'graphql-tag';
import { BaseResponse, BaseService, CommonResponse } from './base.service';

export interface UserDetails {
  id: string;
  email: string;
  username: string;
  permissions: string[];
}

export interface UpdateUserDetailsResponse {
  data?: {
    updateUser: StatusAndMessageData;
  };
}

export interface UserSetting {
  key: string;
  value: string;
}

export interface StatusAndMessageData {
  success: boolean;
  message: string;
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
export class UserService extends BaseService implements OnDestroy {
  private subscriptions = new Subscription();
  private userDetailsSignal: WritableSignal<UserDetails | null> = signal(null);
  private emailChangePending: { newEmail: string } | null = null;

  constructor(protected override apollo: Apollo) {
    super(apollo);
  }

  getUserSettings(keys: string[]): Observable<UserSetting[]> {
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

    interface Response {
      getUserSettings: CommonResponse<UserSetting[]>;
    }

    return this.query<Response>({
      query: GET_USER_SETTINGS,
      variables: { keys },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        const response = data?.getUserSettings;
        if (!response) {
          return [];
        }
        if (!response || !response.success) {
          throw new Error(response?.message);
        }
        return data.getUserSettings.results;
      }),
    );
  }

  updateUserSetting(key: string, value: string): void {
    const UPDATE_USER_SETTING = gql`
      mutation UpdateUserSetting($key: String!, $value: String!) {
        updateUserSetting(key: $key, value: $value) {
          success
          message
        }
      }
    `;

    this.mutate<BaseResponse>({
      mutation: UPDATE_USER_SETTING,
      variables: { key, value },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.success) {
          throw new Error(data.message);
        }
      }),
    );
  }

  changePassword(password: string): Observable<null> {
    const CHANGE_PASSWORD = gql`
      mutation ChangePassword($password: String!) {
        changePassword(password: $password) {
          success
          message
        }
      }
    `;

    return this.mutate<BaseResponse>({
      mutation: CHANGE_PASSWORD,
      variables: { password },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.success) {
          throw new Error(data.message);
        }
        return null; // Success, null is returned. All errors were already handled and no new data to return.
      }),
    );
  }

  get userDetails(): WritableSignal<UserDetails | null> {
    return this.userDetailsSignal;
  }

  get emailChangePendingDetails(): { newEmail: string } | null {
    return this.emailChangePending;
  }

  loadUserDetails(): Observable<UserDetails> {
    const GET_USER_DETAILS = gql`
      query GetUserDetails {
        getUserDetails {
          id
          email
          username
          permissions
        }
      }
    `;

    interface Response {
      getUserDetails: UserDetails;
    }

    const observable = this.watchQuery<Response>({
      query: GET_USER_DETAILS,
      fetchPolicy: 'network-only',
    }).pipe(map((data) => data?.getUserDetails || null));
    observable.subscribe({
      next: (userDetails) => {
        this.userDetailsSignal.set(userDetails);
      },
      error: (err) => {
        console.error('Failed to load user details:', err);
      },
    });
    return observable;
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

  updateUser(username: string, email: string): Observable<StatusAndMessageData> {
    const UPDATE_USER_DETAILS = gql`
      mutation UpdateUser($username: String!, $email: String!) {
        updateUser(username: $username, email: $email) {
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
          (result: any) => result.data?.updateUser || { success: false, message: 'Failed to update details' },
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

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  deleteUser(confirm: string) {
    const DELETE_USER = gql`
      mutation DeleteUser($confirm: String!) {
        deleteUser(confirm: $confirm) {
          success
          message
        }
      }
    `;

    interface Response {
      deleteUser: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: DELETE_USER,
      variables: { confirm },
    }).pipe(
      map((data) => {
        if (!data.deleteUser.success) {
          throw new Error(data.deleteUser.message);
        }
        return data.deleteUser;
      }),
    );
  }
}
