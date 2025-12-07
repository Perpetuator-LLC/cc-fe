// Copyright (c) 2025 Perpetuator LLC
// REFERENCE IMPLEMENTATION - GraphQL-based AuthService
// This file shows the complete migrated version
// Replace src/app/auth.service.ts with this content

import { Injectable, signal, WritableSignal } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { JWT, Token } from './types';
import { decodeJWT } from './jwt';
import { MessageService } from './message.service';
import { Apollo } from 'apollo-angular';
import {
  REGISTER_USER,
  LOGIN,
  VERIFY_EMAIL,
  RESEND_VERIFICATION,
  REQUEST_PASSWORD_RESET,
  RESET_PASSWORD,
  REFRESH_TOKEN,
  ME,
  RegisterResponse,
  LoginResponse,
  VerifyEmailResponse,
  ResendVerificationResponse,
  RequestPasswordResetResponse,
  ResetPasswordResponse,
  RefreshTokenResponse,
  MeResponse,
} from './auth/auth.graphql';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(this.getToken());
  private loggedInSignal: WritableSignal<boolean> = signal(!this.isRefreshTokenExpired());

  constructor(
    private apollo: Apollo,
    private messageService: MessageService,
  ) {}

  forgot(email: string): Observable<boolean> {
    this.messageService.clearMessages();
    return this.apollo
      .mutate<{ requestPasswordReset: RequestPasswordResetResponse }>({
        mutation: REQUEST_PASSWORD_RESET,
        variables: { email },
        context: {
          headers: {
            Authorization: '', // No auth needed for password reset request
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
            Authorization: '', // No auth needed for login
          },
        },
      })
      .pipe(
        map((result) => {
          const response = result.data?.login;
          if (response?.success && response.tokens) {
            this.setSession(response.tokens);
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
            Authorization: '', // No auth needed for resend
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
            Authorization: '', // No auth needed for verification
          },
        },
      })
      .pipe(
        map((result) => {
          const response = result.data?.verifyEmail;
          if (response?.success && response.tokens) {
            this.setSession(response.tokens);
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
            Authorization: '', // No auth needed for registration
          },
        },
      })
      .pipe(
        map((result) => {
          const response = result.data?.register;
          if (response?.success) {
            if (response.tokens) {
              // Email verification NOT required - user can log in immediately
              this.setSession(response.tokens);
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
            Authorization: '', // No auth needed for password reset
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

  refreshToken(): Observable<Token | null> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken || this.isRefreshTokenExpired()) {
      this.logout();
      return of(null);
    }

    return this.apollo
      .mutate<{ refreshToken: RefreshTokenResponse }>({
        mutation: REFRESH_TOKEN,
        variables: { refresh: refreshToken },
        context: {
          headers: {
            Authorization: '', // No access token needed for refresh
          },
        },
      })
      .pipe(
        map((result) => {
          const response = result.data?.refreshToken;
          if (response?.success && response.tokens) {
            this.updateSession(response.tokens);
            return response.tokens;
          }
          this.logout();
          return null;
        }),
        catchError((error) => {
          console.debug('Logging out, due to error refreshing token:', error);
          this.logout();
          return of(null);
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

  setSession(authResult: Token) {
    const accessToken = authResult.access;
    const refreshToken = authResult.refresh;

    const decodedAccessToken: JWT | null = decodeJWT(accessToken);
    if (decodedAccessToken === null || decodedAccessToken.exp === undefined) {
      console.error('Failed to decode access token');
      return;
    }
    const accessExpiresAt = decodedAccessToken.exp * 1000;

    const decodedRefreshToken: JWT | null = decodeJWT(refreshToken);
    if (decodedRefreshToken === null || decodedRefreshToken.exp === undefined) {
      console.error('Failed to decode refresh token');
      return;
    }
    const refreshExpiresAt = decodedRefreshToken.exp * 1000;

    localStorage.setItem('id_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('expires_at', JSON.stringify(accessExpiresAt));
    localStorage.setItem('refresh_expires_at', JSON.stringify(refreshExpiresAt));

    this.loggedInSignal.set(!this.isRefreshTokenExpired());
    this.tokenSubject.next(accessToken);
  }

  private updateSession(authResult: Token) {
    const accessToken = authResult.access;
    const decodedAccessToken: JWT | null = decodeJWT(accessToken);
    if (decodedAccessToken === null || decodedAccessToken.exp === undefined) {
      console.error('Failed to decode access token');
      return;
    }
    const accessExpiresAt = decodedAccessToken.exp * 1000;

    localStorage.setItem('id_token', accessToken);
    localStorage.setItem('expires_at', JSON.stringify(accessExpiresAt));

    this.loggedInSignal.set(!this.isRefreshTokenExpired());
    this.tokenSubject.next(accessToken);
  }

  logout() {
    localStorage.removeItem('id_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
    localStorage.removeItem('refresh_expires_at');
    this.loggedInSignal.set(false);
    this.tokenSubject.next(null);
  }

  get isLoggedIn(): WritableSignal<boolean> {
    return this.loggedInSignal;
  }

  public getToken(): string | null {
    return localStorage.getItem('id_token');
  }

  public getTokenObservable(): Observable<string | null> {
    const token = this.getToken();
    if (this.isRefreshTokenExpired()) {
      this.logout();
      return of(null);
    } else if (token && !this.isTokenExpired()) {
      return of(token);
    }
    return this.refreshToken().pipe(switchMap(() => of(this.getToken())));
  }

  private isTokenExpired(): boolean {
    const expiration = localStorage.getItem('expires_at');
    if (expiration === null || expiration === undefined) {
      return true;
    }
    try {
      return new Date().getTime() >= JSON.parse(expiration);
    } catch (e) {
      console.error('Failed to parse expiration, invalid JSON:', e);
      this.logout();
    }
    return false;
  }

  public isRefreshTokenExpired(): boolean {
    const refreshExpiration = localStorage.getItem('refresh_expires_at');
    if (refreshExpiration === null || refreshExpiration === undefined) {
      return true;
    }
    try {
      return new Date().getTime() >= JSON.parse(refreshExpiration);
    } catch (e) {
      console.error('Failed to parse refresh expiration, invalid JSON:', e);
      this.logout();
    }
    return true;
  }
}
