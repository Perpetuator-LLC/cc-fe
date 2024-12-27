import { Injectable, signal, WritableSignal, OnDestroy } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, Observable, Subscription } from 'rxjs';
import gql from 'graphql-tag';
import { BaseResponse, BaseService, CommonResponse } from './base.service';

export interface UserDetails {
  id: string;
  email: string;
  username: string;
  permissions: string[];
}

export interface UserSetting {
  key: string;
  value: string;
}

export interface StatusAndMessageData {
  success: boolean;
  message: string;
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

  updateUserSetting(key: string, value: string) {
    const UPDATE_USER_SETTING = gql`
      mutation UpdateUserSetting($key: String!, $value: String!) {
        updateUserSetting(key: $key, value: $value) {
          success
          message
        }
      }
    `;

    interface Response {
      updateUserSetting: BaseResponse;
    }

    return this.mutate<Response>({
      mutation: UPDATE_USER_SETTING,
      variables: { key, value },
    }).pipe(
      map((data) => {
        if (!data.updateUserSetting.success) {
          throw new Error(data.updateUserSetting.message);
        }
        return data.updateUserSetting;
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

    interface Response {
      changePassword: BaseResponse;
    }

    return this.mutate<Response>({
      mutation: CHANGE_PASSWORD,
      variables: { password },
    }).pipe(
      map((data) => {
        if (!data.changePassword.success) {
          throw new Error(data.changePassword.message);
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

  loadUserEmailChangePending() {
    const GQL = gql`
      query GetEmailChangePending {
        getEmailChangePending {
          newEmail
        }
      }
    `;

    interface Response {
      getEmailChangePending: {
        newEmail: string;
      };
    }

    return this.query<Response>({
      query: GQL,
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.getEmailChangePending) {
          return null;
        }
        return data.getEmailChangePending;
      }),
    );
  }

  cancelEmailChange() {
    const CANCEL_EMAIL_CHANGE = gql`
      mutation CancelEmailChange {
        cancelEmailChange {
          success
          message
        }
      }
    `;

    interface Response {
      cancelEmailChange: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: CANCEL_EMAIL_CHANGE,
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.cancelEmailChange.success) {
          throw new Error(data.cancelEmailChange.message);
        }
        return data.cancelEmailChange;
      }),
    );
  }

  resendEmailChange() {
    const RESEND_EMAIL_CHANGE = gql`
      mutation ResendEmailChange {
        resendEmailChange {
          success
          message
        }
      }
    `;

    interface Response {
      resendEmailChange: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: RESEND_EMAIL_CHANGE,
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.resendEmailChange.success) {
          throw new Error(data.resendEmailChange.message);
        }
        return data.resendEmailChange;
      }),
    );
  }

  clearUserDetails(): void {
    this.userDetailsSignal.set(null);
  }

  updateUser(username: string, email: string) {
    const UPDATE_USER_DETAILS = gql`
      mutation UpdateUser($username: String!, $email: String!) {
        updateUser(username: $username, email: $email) {
          success
          message
        }
      }
    `;

    interface Response {
      updateUser: StatusAndMessageData;
    }

    return this.mutate<Response>({
      mutation: UPDATE_USER_DETAILS,
      variables: { username, email },
    }).pipe(
      map((data) => {
        if (!data.updateUser.success) {
          throw new Error(data.updateUser.message);
        }
        return data.updateUser;
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
