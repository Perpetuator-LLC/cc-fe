// Copyright (c) 2025 Perpetuator LLC
import { Injectable, signal, WritableSignal, OnDestroy } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, Observable, Subscription } from 'rxjs';
import gql from 'graphql-tag';
import { BaseResponse, BaseService, CommonResponse } from './base.service';
import { ErrorHandlerService } from './error-handler.service';

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

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  BOTH = 'BOTH',
}

export interface EmailPreferences {
  lowBalanceAlerts: boolean;
  newsletter: boolean;
  policyUpdates: boolean;
  marketingEmails: boolean;
}

export interface SmsPreferences {
  phoneNumber: string | null;
  isVerified: boolean;
  lowBalanceSms: boolean;
  criticalAlertsSms: boolean;
}

export interface UserPreferences {
  email: EmailPreferences;
  sms: SmsPreferences;
}

@Injectable({
  providedIn: 'root',
})
export class UserService extends BaseService implements OnDestroy {
  private subscriptions = new Subscription();
  private userDetailsSignal: WritableSignal<UserDetails | null> = signal(null);
  private emailChangePending: { newEmail: string } | null = null;

  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
  ) {
    super(apollo, errorHandler);
  }

  userSettings(keys: string[]): Observable<UserSetting[]> {
    const GET_USER_SETTINGS = gql`
      query GetUserSettings {
        userSettings(keys: ["${keys}"]) {
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
      userSettings: CommonResponse<UserSetting[]>;
    }

    return this.query<Response>({
      query: GET_USER_SETTINGS,
      variables: { keys },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        const response = data?.userSettings;
        if (!response) {
          return [];
        }
        if (!response || !response.success) {
          throw new Error(response?.message);
        }
        return data.userSettings.results;
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
      changePassword: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: CHANGE_PASSWORD,
      variables: { password },
    }).pipe(
      map((data) => {
        if (!data.changePassword.success) {
          throw new Error(data.changePassword.message);
        }
        // Note: With OAuth2, user should re-login after password change
        // No tokens are returned from this mutation
        return null;
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
        user {
          id
          email
          username
          permissions
        }
      }
    `;

    interface Response {
      user: UserDetails;
    }

    const observable = this.query<Response>({
      query: GET_USER_DETAILS,
      fetchPolicy: 'network-only',
    }).pipe(map((data) => data?.user || null));
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
        emailChangePending {
          newEmail
        }
      }
    `;

    interface Response {
      emailChangePending: {
        newEmail: string;
      };
    }

    return this.query<Response>({
      query: GQL,
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.emailChangePending) {
          return null;
        }
        return data.emailChangePending;
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

  getUserPreferences(): Observable<UserPreferences> {
    const GET_PREFERENCES = gql`
      query GetUserPreferences {
        myEmailPreferences {
          lowBalanceAlerts
          newsletter
          policyUpdates
          marketingEmails
        }
        mySmsPreferences {
          phoneNumber
          isVerified
          lowBalanceSms
          criticalAlertsSms
        }
      }
    `;

    interface Response {
      myEmailPreferences: EmailPreferences;
      mySmsPreferences: SmsPreferences;
    }

    return this.query<Response>({
      query: GET_PREFERENCES,
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return {
          email: data.myEmailPreferences,
          sms: data.mySmsPreferences,
        };
      }),
    );
  }

  updateEmailPreferences(
    lowBalanceAlerts?: boolean,
    newsletter?: boolean,
    marketingEmails?: boolean,
  ): Observable<BaseResponse> {
    const UPDATE_EMAIL_PREFERENCES = gql`
      mutation UpdateEmailPreferences(
        $lowBalanceAlerts: Boolean
        $newsletter: Boolean
        $marketingEmails: Boolean
        $policyUpdates: Boolean
      ) {
        updateEmailPreferences(
          lowBalanceAlerts: $lowBalanceAlerts
          newsletter: $newsletter
          marketingEmails: $marketingEmails
          policyUpdates: $policyUpdates
        ) {
          success
          message
        }
      }
    `;

    interface Response {
      updateEmailPreferences: BaseResponse;
    }

    return this.mutate<Response>({
      mutation: UPDATE_EMAIL_PREFERENCES,
      variables: { lowBalanceAlerts, newsletter, marketingEmails },
    }).pipe(
      map((data) => {
        if (!data.updateEmailPreferences.success) {
          throw new Error(data.updateEmailPreferences.message);
        }
        return data.updateEmailPreferences;
      }),
    );
  }

  updateSmsPreferences(phoneNumber?: string, lowBalanceSms?: boolean): Observable<BaseResponse> {
    const UPDATE_SMS_PREFERENCES = gql`
      mutation UpdateSmsPreferences($phoneNumber: String, $lowBalanceSms: Boolean, $criticalAlertsSms: Boolean) {
        updateSmsPreferences(
          phoneNumber: $phoneNumber
          lowBalanceSms: $lowBalanceSms
          criticalAlertsSms: $criticalAlertsSms
        ) {
          success
          message
        }
      }
    `;

    interface Response {
      updateSmsPreferences: BaseResponse;
    }

    return this.mutate<Response>({
      mutation: UPDATE_SMS_PREFERENCES,
      variables: { phoneNumber, lowBalanceSms },
    }).pipe(
      map((data) => {
        if (!data.updateSmsPreferences.success) {
          throw new Error(data.updateSmsPreferences.message);
        }
        return data.updateSmsPreferences;
      }),
    );
  }

  subscribeToNewsletter(email: string): Observable<BaseResponse> {
    const SUBSCRIBE_NEWSLETTER = gql`
      mutation SubscribeToNewsletter($email: String!, $source: String) {
        subscribeToNewsletter(email: $email, source: $source) {
          success
          message
        }
      }
    `;

    interface Response {
      subscribeToNewsletter: BaseResponse;
    }

    return this.mutate<Response>({
      mutation: SUBSCRIBE_NEWSLETTER,
      variables: { email, source: 'user_profile' },
    }).pipe(
      map((data) => {
        if (!data.subscribeToNewsletter.success) {
          throw new Error(data.subscribeToNewsletter.message);
        }
        return data.subscribeToNewsletter;
      }),
    );
  }

  unsubscribeFromNewsletter(email: string): Observable<BaseResponse> {
    const UNSUBSCRIBE_NEWSLETTER = gql`
      mutation UnsubscribeFromNewsletter($email: String!) {
        unsubscribeFromNewsletter(email: $email) {
          success
          message
        }
      }
    `;

    interface Response {
      unsubscribeFromNewsletter: BaseResponse;
    }

    return this.mutate<Response>({
      mutation: UNSUBSCRIBE_NEWSLETTER,
      variables: { email },
    }).pipe(
      map((data) => {
        if (!data.unsubscribeFromNewsletter.success) {
          throw new Error(data.unsubscribeFromNewsletter.message);
        }
        return data.unsubscribeFromNewsletter;
      }),
    );
  }
}
