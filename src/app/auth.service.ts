// Copyright (c) 2025 Perpetuator LLC
import { Injectable, WritableSignal, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { MessageService } from './message.service';
import { OAuthAuthService } from './core/services/auth.service';

// NOTE: This service now delegates entirely to OAuth2
// WARNING: Do not include any GraphQL API calls here as this will create a circular dependency with graphql.provider.ts

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
    private oauthService: OAuthAuthService,
    private injector: Injector,
  ) {}

  // Delegate all auth operations to OAuth service
  logout() {
    // Clear policy cache on logout - get PolicyService lazily to avoid circular dependency
    try {
      // Dynamically get PolicyService to avoid circular dependency issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const policyServiceToken = this.injector.get('PolicyService' as any, null);
      if (policyServiceToken && policyServiceToken.clearActivePoliciesCache) {
        policyServiceToken.clearActivePoliciesCache();
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      // PolicyService might not be available yet, that's ok
    }
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
