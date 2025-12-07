// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Apollo } from 'apollo-angular';
import { MessageService } from '../message.service';
import { OAuthAuthService } from '../core/auth.service';
import {
  REGISTER_USER,
  RESEND_VERIFICATION,
  REQUEST_PASSWORD_RESET,
  RESET_PASSWORD,
  VERIFY_EMAIL,
  ME,
  RegisterResponse,
  ResendVerificationResponse,
  RequestPasswordResetResponse,
  ResetPasswordResponse,
  VerifyEmailResponse,
  MeResponse,
} from './auth.graphql';

/**
 * OAuth2-based authentication service.
 * This service handles authentication using OAuth2 password grant flow.
 */
@Injectable({
  providedIn: 'root',
})
export class GraphqlAuthService {
  constructor(
    private apollo: Apollo,
    private messageService: MessageService,
    private oauthService: OAuthAuthService,
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

  /**
   * Login using OAuth2 password grant flow
   */
  login(email: string, password: string): Observable<boolean> {
    this.messageService.clearMessages();

    return this.oauthService.loginWithPassword(email, password).pipe(
      catchError((error) => {
        console.error('Login error:', error);
        this.messageService.addMessage({
          type: 'error',
          text: error.message || 'Login failed',
          dismissible: true,
        });
        return of(false);
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

  /**
   * Verify email with token
   * After successful verification, auto-login using OAuth2
   */
  verify(token: string): Observable<boolean> {
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
        switchMap((result) => {
          const response = result.data?.verifyEmail;
          if (response?.success && response.user) {
            // Email verified successfully
            this.messageService.addMessage({
              type: 'success',
              text: response.message || 'Email verified successfully!',
              dismissible: true,
            });

            // Note: With OAuth2, we don't get tokens from GraphQL
            // The user should log in with their credentials
            return of(true);
          } else {
            this.messageService.addMessage({
              type: 'error',
              text: response?.message || 'Email verification failed',
              dismissible: true,
            });
            return of(false);
          }
        }),
        catchError((error) => {
          console.error('Verification error:', error);
          this.messageService.addMessage({
            type: 'error',
            text: error.message || 'Email verification failed',
            dismissible: true,
          });
          return of(false);
        }),
      );
  }

  /**
   * Register a new user
   * After successful registration, auto-login using OAuth2
   */
  register(email: string, password: string, acceptTerms = true): Observable<boolean> {
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
        switchMap((result) => {
          const response = result.data?.register;
          if (response?.success) {
            // If user accepted terms during registration, create localStorage cookie consent entry
            // This represents acceptance of Cookie Policy, Privacy Policy, and Terms of Service
            // PolicyGuardService will link this to their account on first login
            if (acceptTerms) {
              this.createInitialCookieConsent();
            }

            if (response.verificationEmailSent) {
              // Email verification required - show message
              this.messageService.addMessage({
                type: 'info',
                text: response.message || 'Please check your email to verify your account.',
                dismissible: true,
              });
              return of(true);
            } else {
              // No email verification required - auto-login with OAuth2
              return this.oauthService.loginWithPassword(email, password).pipe(
                map((success) => {
                  if (success) {
                    this.messageService.addMessage({
                      type: 'success',
                      text: 'Registration successful!',
                      dismissible: true,
                    });
                  }
                  return success;
                }),
              );
            }
          } else {
            this.messageService.addMessage({
              type: 'error',
              text: response?.message || 'Registration failed',
              dismissible: true,
            });
            return of(false);
          }
        }),
        catchError((error) => {
          console.error('Registration error:', error);
          this.messageService.addMessage({
            type: 'error',
            text: error.message || 'Registration failed',
            dismissible: true,
          });
          return of(false);
        }),
      );
  }

  /**
   * Create initial localStorage cookie consent entry for new registrations
   * When user accepts terms during registration, they are also accepting:
   * - Cookie Policy
   * - Privacy Policy
   * - Terms of Service
   * This localStorage entry will be synced to the backend by PolicyGuardService on first login
   */
  private createInitialCookieConsent(): void {
    // Use a temporary version that PolicyGuardService will update with the actual server version
    const initialConsent = {
      version: '1.0.0', // Placeholder - will be updated by PolicyGuardService
      accepted: true,
      date: new Date().toISOString(),
    };
    localStorage.setItem('cookie_consent', JSON.stringify(initialConsent));
    console.debug('[GraphqlAuthService] Created initial cookie consent in localStorage for new user');
  }

  /**
   * Get current user information
   */
  me(): Observable<MeResponse | null> {
    return this.apollo
      .query<{ me: MeResponse }>({
        query: ME,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data?.me || null),
        catchError((error) => {
          console.error('Failed to fetch user info:', error);
          return of(null);
        }),
      );
  }

  /**
   * Reset password
   */
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
              text: response.message || 'Password reset successful',
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
}
