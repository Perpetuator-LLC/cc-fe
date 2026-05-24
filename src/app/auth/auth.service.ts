// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, WritableSignal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AppConfigService } from '../core/app-config.service';
import { MessageService } from '../message.service';
import { OAuthService } from './oauth.service';

// NOTE: This service is a facade that delegates to OAuthService for backward compatibility
// It also provides legacy HTTP endpoints for password reset and email verification
// WARNING: Do not inject services that might create circular dependencies (like PolicyService)

export interface RegisterResponse {
  detail?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private oauthService = inject(OAuthService);
  private appConfig = inject(AppConfigService);

  /** Lazily-resolved auth endpoint URLs — must be a getter because the
   *  AppConfig isn't available at module load time. */
  private get authUrls() {
    const apiUrl = this.appConfig.config.API_URL;
    return {
      forgot: apiUrl + '/auth/password/reset/',
      resend: apiUrl + '/auth/registration/resend-email/',
    };
  }

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
    return this.http.post<RegisterResponse>(this.authUrls.forgot, { email }).pipe(
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
    return this.http.post<null>(this.authUrls.resend, { email }).pipe(
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
