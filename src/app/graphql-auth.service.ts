// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Apollo } from 'apollo-angular';
import { MessageService } from './message.service';
import { AuthService } from './auth.service';
import { Token } from './types';
import {
  REGISTER_USER,
  LOGIN,
  VERIFY_EMAIL,
  RESEND_VERIFICATION,
  REQUEST_PASSWORD_RESET,
  RESET_PASSWORD,
  ME,
  RegisterResponse,
  LoginResponse,
  VerifyEmailResponse,
  ResendVerificationResponse,
  RequestPasswordResetResponse,
  ResetPasswordResponse,
  MeResponse,
} from './auth/auth.graphql';

/**
 * GraphQL-based authentication service.
 * This service handles all GraphQL authentication mutations and queries.
 * It uses AuthService for token management to avoid circular dependencies.
 */
@Injectable({
  providedIn: 'root',
})
export class GraphqlAuthService {
  constructor(
    private apollo: Apollo,
    private messageService: MessageService,
    private authService: AuthService,
  ) {}

  forgot(email: string): Observable<boolean> {
    this.messageService.clearMessages();
    return this.apollo
      .mutate<{ requestPasswordReset: RequestPasswordResetResponse }>({
        mutation: REQUEST_PASSWORD_RESET,
        variables: { email },
        context: {
          headers: {
            Authorization: '', // No auth needed
          },
        },
      })
      .pipe(
        map((result) => {
          const response = result.data?.requestPasswordReset;
          if (response?.success) {
            this.messageService.addMessage({
              type: 'info',
              text: response.message || 'Password reset email sent',
              dismissible: true,
            });
            return true;
          }
          return false;
        }),
        catchError((error) => {
          console.error('Password reset error:', error);
          this.messageService.addMessage({
            type: 'error',
            text: error.message || 'Password reset request failed',
            dismissible: true,
          });
          return of(false);
        }),
      );
  }

  login(email: string, password: string): Observable<Token | null> {
    this.messageService.clearMessages();

    return this.apollo
      .mutate<{ login: LoginResponse }>({
        mutation: LOGIN,
        variables: { username: email, password },
        context: {
          headers: {
            Authorization: '', // No auth needed
          },
        },
      })
      .pipe(
        map((result) => {
          const response = result.data?.login;
          if (response?.success && response.tokens) {
            this.authService.setSession(response.tokens);
            return response.tokens;
          } else {
            this.messageService.addMessage({
              type: 'error',
              text: response?.message || 'Login failed',
              dismissible: true,
            });
            return null;
          }
        }),
        catchError((error) => {
          console.error('Login error:', error);
          this.messageService.addMessage({
            type: 'error',
            text: error.message || 'Login failed',
            dismissible: true,
          });
          return of(null);
        }),
      );
  }

  resend(email: string): Observable<boolean> {
    this.messageService.clearMessages();
    return this.apollo
      .mutate<{ resendVerificationEmail: ResendVerificationResponse }>({
        mutation: RESEND_VERIFICATION,
        variables: { email },
        context: {
          headers: {
            Authorization: '', // No auth needed
          },
        },
      })
      .pipe(
        map((result) => {
          const response = result.data?.resendVerificationEmail;
          if (response?.success) {
            this.messageService.addMessage({
              type: 'success',
              text: response.message || 'Verification email sent',
              dismissible: true,
            });
            return true;
          }
          return false;
        }),
        catchError((error) => {
          console.error('Resend verification error:', error);
          this.messageService.addMessage({
            type: 'error',
            text: error.message || 'Failed to resend verification email',
            dismissible: true,
          });
          return of(false);
        }),
      );
  }

  verify(token: string): Observable<Token | null> {
    this.messageService.clearMessages();
    return this.apollo
      .mutate<{ verifyEmail: VerifyEmailResponse }>({
        mutation: VERIFY_EMAIL,
        variables: { token },
        context: {
          headers: {
            Authorization: '', // No auth needed
          },
        },
      })
      .pipe(
        map((result) => {
          const response = result.data?.verifyEmail;
          if (response?.success && response.tokens) {
            this.authService.setSession(response.tokens);
            return response.tokens;
          } else {
            this.messageService.addMessage({
              type: 'error',
              text: response?.message || 'Email verification failed',
              dismissible: true,
            });
            return null;
          }
        }),
        catchError((error) => {
          console.error('Verification error:', error);
          this.messageService.addMessage({
            type: 'error',
            text: error.message || 'Email verification failed',
            dismissible: true,
          });
          return of(null);
        }),
      );
  }

  register(email: string, password: string, acceptTerms = true): Observable<Token | null> {
    this.messageService.clearMessages();
    const username = 'User' + Math.floor(Math.random() * 1000000);

    return this.apollo
      .mutate<{ register: RegisterResponse }>({
        mutation: REGISTER_USER,
        variables: {
          username,
          email,
          password1: password,
          password2: password,
          acceptTermsOfService: acceptTerms,
          acceptPrivacyPolicy: acceptTerms,
        },
        context: {
          headers: {
            Authorization: '', // No auth needed
          },
        },
      })
      .pipe(
        map((result) => {
          const response = result.data?.register;
          if (response?.success) {
            if (response.tokens) {
              // Email verification NOT required - user can log in immediately
              this.authService.setSession(response.tokens);
              return response.tokens;
            } else {
              // Email verification required - show message
              this.messageService.addMessage({
                type: 'info',
                text: response.message || 'Please check your email to verify your account.',
                dismissible: true,
              });
              return null;
            }
          } else {
            this.messageService.addMessage({
              type: 'error',
              text: response?.message || 'Registration failed',
              dismissible: true,
            });
            return null;
          }
        }),
        catchError((error) => {
          console.error('Registration error:', error);
          this.messageService.addMessage({
            type: 'error',
            text: error.message || 'Registration failed',
            dismissible: true,
          });
          return of(null);
        }),
      );
  }

  resetPassword(token: string, password1: string, password2: string): Observable<boolean> {
    this.messageService.clearMessages();
    return this.apollo
      .mutate<{ resetPassword: ResetPasswordResponse }>({
        mutation: RESET_PASSWORD,
        variables: { token, password1, password2 },
        context: {
          headers: {
            Authorization: '', // No auth needed
          },
        },
      })
      .pipe(
        map((result) => {
          const response = result.data?.resetPassword;
          if (response?.success) {
            this.messageService.addMessage({
              type: 'success',
              text: response.message || 'Password reset successfully!',
              dismissible: true,
            });
            return true;
          } else {
            this.messageService.addMessage({
              type: 'error',
              text: response?.message || 'Password reset failed',
              dismissible: true,
            });
            return false;
          }
        }),
        catchError((error) => {
          console.error('Password reset error:', error);
          this.messageService.addMessage({
            type: 'error',
            text: error.message || 'Password reset failed',
            dismissible: true,
          });
          return of(false);
        }),
      );
  }

  me(): Observable<MeResponse | null> {
    return this.apollo
      .query<{ me: MeResponse }>({
        query: ME,
      })
      .pipe(
        map((result) => result.data?.me || null),
        catchError((error) => {
          console.error('Failed to get current user:', error);
          return of(null);
        }),
      );
  }
}
