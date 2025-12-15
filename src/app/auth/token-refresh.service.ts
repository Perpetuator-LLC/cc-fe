// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { TokenStorageService } from './token-storage.service';

interface OAuth2TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * Token Refresh Service
 *
 * Handles OAuth2 token refresh using the refresh_token grant.
 *
 * IMPORTANT: This service uses token rotation - the backend issues a NEW
 * refresh token with each refresh. Both the new access token AND refresh
 * token must be stored.
 */
@Injectable({
  providedIn: 'root',
})
export class TokenRefreshService {
  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService,
    private router: Router,
  ) {}

  /**
   * Refresh access token using OAuth2 refresh token grant
   *
   * @param refreshToken The current refresh token
   * @returns Observable<boolean> - true if refresh was successful
   */
  refreshToken(refreshToken: string): Observable<boolean> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: environment.OAUTH_CLIENT_ID,
    });

    // Use a minimal HTTP request that doesn't go through the auth interceptor
    // to avoid infinite loops
    return this.http
      .post<OAuth2TokenResponse>(`${environment.OAUTH_ISSUER}/o/token/`, body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          console.log('[TokenRefresh] Storing new tokens (access + refresh)');
          this.storeTokens(response);
        }),
        map(() => true),
        catchError((error) => {
          console.error('[TokenRefresh] Refresh failed:', error);

          // Handle specific OAuth2 errors
          if (error.error?.error === 'invalid_grant') {
            console.warn('[TokenRefresh] Refresh token is invalid or expired, logging out');
            this.handleLogout();
          }

          return of(false);
        }),
      );
  }

  /**
   * Store OAuth2 tokens in localStorage
   * CRITICAL: Must store BOTH access and refresh tokens (token rotation)
   */
  private storeTokens(response: OAuth2TokenResponse): void {
    const expiresAt = Date.now() + response.expires_in * 1000;

    // Store both tokens - refresh token rotates with each refresh!
    this.tokenStorage.storeTokens({
      accessToken: response.access_token,
      refreshToken: response.refresh_token, // NEW refresh token!
      expiresAt: expiresAt,
      tokenType: response.token_type,
      scope: response.scope,
    });

    console.log('[TokenRefresh] Tokens stored. Access expires at:', new Date(expiresAt).toISOString());
  }

  /**
   * Handle logout when refresh fails
   */
  private handleLogout(): void {
    this.tokenStorage.clearTokens();
    // Navigate to home - AuthGuard will redirect to login if needed
    this.router.navigate(['/']);
  }
}
