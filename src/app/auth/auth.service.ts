// Copyright (c) 2025 Perpetuator LLC
import { Injectable, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { MessageService } from '../message.service';
import { OAuthService } from './oauth.service';

// NOTE: This service is a facade that delegates to OAuthService for backward compatibility
// It also provides legacy HTTP endpoints for password reset and email verification
// WARNING: Do not inject services that might create circular dependencies (like PolicyService)

export interface RegisterResponse {
  detail?: string;
}

export const AuthUrls = {
  forgot: environment.API_URL + '/auth/password/reset/',
  resend: environment.API_URL + '/auth/registration/resend-email/',
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private oauthService: OAuthService,
  ) {}

  // Delegate all auth operations to OAuth service
  logout() {
    // Don't clear policy cache here - PolicyService will listen to auth changes
    this.oauthService.logout();
  }

  get isLoggedIn(): WritableSignal<boolean> {
    return this.oauthService.isLoggedIn;
  }

  public getToken(): string | null {
    return this.oauthService.getAccessToken();
  }

  public getTokenObservable(): Observable<string | null> {
    return this.oauthService.getTokenObservable();
  }

  public isRefreshTokenExpired(): boolean {
    return !this.oauthService.isAuthenticated();
  }

  // Legacy HTTP endpoints - kept for forgot password and resend verification
  forgot(email: string): Observable<RegisterResponse | null> {
    this.messageService.clearMessages();
    return this.http.post<RegisterResponse>(AuthUrls.forgot, { email }).pipe(
      tap((response) => {
        this.messageService.addMessage({
          type: 'info',
          text: response.detail ? response.detail : 'Password reset email sent',
          dismissible: true,
        });
      }),
      catchError((error) => {
        console.error('Password reset error:', error);
        Object.keys(error.error).forEach((key) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Password reset error (${key}): ${error.error[key]}`,
            dismissible: true,
          });
        });
        return of(null);
      }),
    );
  }

  resend(email: string): Observable<null> {
    this.messageService.clearMessages();
    return this.http.post<null>(AuthUrls.resend, { email }).pipe(
      tap((response: null) => {
        console.debug('Resend verification response:', response);
      }),
      catchError((error) => {
        console.error('Resend verification error:', error);
        Object.keys(error.error).forEach((key) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Resend verification error (${key}): ${error.error[key]}`,
            dismissible: true,
          });
        });
        return of(null);
      }),
    );
  }
}
