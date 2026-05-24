// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, Injector, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AppConfigService } from '../core/app-config.service';
import { TokenStorageService } from './token-storage.service';
import { TraceService } from '../traces/trace.service';

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
  private http = inject(HttpClient);
  private tokenStorage = inject(TokenStorageService);
  private router = inject(Router);
  private injector = inject(Injector);
  private appConfig = inject(AppConfigService);

  private traceService?: TraceService;

  private getTraceService(): TraceService | null {
    try {
      if (!this.traceService) {
        this.traceService = this.injector.get(TraceService);
      }
      return this.traceService;
    } catch {
      return null;
    }
  }

  /**
   * Refresh access token using OAuth2 refresh token grant
   *
   * @param refreshToken The current refresh token
   * @returns Observable<boolean> - true if refresh was successful
   */
  refreshToken(refreshToken: string): Observable<boolean> {
    const config = this.appConfig.config;
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.OAUTH_CLIENT_ID,
    });

    return this.http
      .post<OAuth2TokenResponse>(`${config.OAUTH_ISSUER}/o/token/`, body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          this.storeTokens(response);
          this.trackTokenRotation(response.expires_in);
        }),
        map(() => true),
        catchError((error) => {
          this.trackTokenRefreshFailure(error);

          // Handle specific OAuth2 errors
          if (error.error?.error === 'invalid_grant') {
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

    this.tokenStorage.storeTokens({
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt: expiresAt,
      tokenType: response.token_type,
      scope: response.scope,
    });
  }

  /**
   * Track successful token rotation in telemetry
   */
  private trackTokenRotation(expiresIn: number): void {
    const traceService = this.getTraceService();
    if (traceService) {
      traceService
        .recordTrace({
          kind: 'token_rotation',
          severity: 'INFO',
          message: 'Access token refreshed successfully',
          functionName: 'refreshToken',
          moduleName: 'TokenRefreshService',
          inputs: {
            expiresIn,
            timestamp: new Date().toISOString(),
          },
          tags: {
            event_type: 'token_refresh_success',
          },
        })
        .subscribe();
    }
  }

  /**
   * Track token refresh failure in telemetry
   */
  private trackTokenRefreshFailure(error: unknown): void {
    const traceService = this.getTraceService();
    if (traceService) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorCode = (error as any)?.error?.error || 'unknown';

      traceService
        .recordTrace({
          kind: 'auth_failure',
          severity: 'WARNING',
          message: 'Token refresh failed',
          functionName: 'refreshToken',
          moduleName: 'TokenRefreshService',
          exceptionMessage: errorMessage,
          inputs: {
            errorCode,
            timestamp: new Date().toISOString(),
          },
          tags: {
            event_type: 'token_refresh_failure',
            error_code: errorCode,
          },
        })
        .subscribe();
    }
  }

  /**
   * Handle logout when refresh fails
   */
  private handleLogout(): void {
    this.tokenStorage.clearTokens();
    this.router.navigate(['/']);
  }
}
