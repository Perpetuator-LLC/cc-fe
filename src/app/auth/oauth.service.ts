// Copyright (c) 2025 Perpetuator LLC
import { Injectable, signal, WritableSignal, Injector } from '@angular/core';
import { AuthConfig, OAuthService as AngularOAuthService } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { TraceService } from '../traces/trace.service';
import { TokenStorageService } from './token-storage.service';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  isVerified: boolean;
}

export interface OAuth2TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface OAuth2ErrorResponse {
  error: string; // e.g., "invalid_grant"
  error_description?: string; // User-friendly message
  error_uri?: string;
}

/**
 * OAuth2 Authentication Service
 *
 * Architecture (per AUTH_COOKIE_CROSS_DOMAIN.md):
 * - Tokens are returned in response body (NOT in HTTP-only cookies)
 * - Tokens are stored in localStorage via TokenStorageService
 * - Frontend sends Authorization: Bearer <token> header
 * - Backend sets `logged_in` cookie for cross-subdomain session detection
 * - `withCredentials: true` ensures cookies are sent/received
 */
@Injectable({
  providedIn: 'root',
})
export class OAuthService {
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$: Observable<UserProfile | null> = this.currentUserSubject.asObservable();
  private loggedInSignal: WritableSignal<boolean> = signal(false);
  private initialized = false;
  private traceService?: TraceService; // Lazy-loaded to avoid circular dependency with Apollo

  private authConfig: AuthConfig = {
    issuer: environment.OAUTH_ISSUER,
    loginUrl: `${environment.OAUTH_ISSUER}/o/authorize/`,
    tokenEndpoint: `${environment.OAUTH_ISSUER}/o/token/`,
    userinfoEndpoint: `${environment.OAUTH_ISSUER}/o/userinfo/`,

    clientId: environment.OAUTH_CLIENT_ID,

    redirectUri: `${environment.SITE_URL}/auth/callback`,

    responseType: 'code',
    scope: environment.OAUTH_SCOPES,

    requireHttps: environment.production,
    showDebugInformation: !environment.production,

    skipIssuerCheck: true,
    oidc: false,
  };

  constructor(
    private angularOAuthService: AngularOAuthService,
    private router: Router,
    private http: HttpClient,
    private injector: Injector,
    private tokenStorage: TokenStorageService,
  ) {
    // Will be initialized on first use
  }

  private getTraceService(): TraceService | null {
    try {
      // Lazy injection to avoid circular dependency with Apollo
      if (!this.traceService) {
        this.traceService = this.injector.get(TraceService);
      }
      return this.traceService;
    } catch (error) {
      // TraceService not available yet (during Apollo initialization)
      console.warn('[OAuthService] TraceService not available:', error);
      return null;
    }
  }

  private ensureInitialized(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.configureOAuth();
  }

  private configureOAuth(): void {
    // Just configure OAuth, don't load discovery document yet to avoid HTTP requests
    this.angularOAuthService.configure(this.authConfig);

    // Subscribe to OAuth events
    this.angularOAuthService.events.subscribe((event) => {
      if (event.type === 'token_received') {
        this.loggedInSignal.set(true);
      } else if (event.type === 'logout' || event.type === 'session_terminated') {
        this.loggedInSignal.set(false);
        this.currentUserSubject.next(null);
      }
    });

    // Check if we have a valid session
    if (this.tokenStorage.hasSession()) {
      this.loggedInSignal.set(true);
    }
  }

  /**
   * OAuth2 Password Grant login
   * Uses username/password to get OAuth2 tokens directly
   * Tokens are returned in response body and stored in localStorage
   * Backend also sets `logged_in` cookie for cross-subdomain detection
   */
  loginWithPassword(username: string, password: string): Observable<boolean> {
    this.ensureInitialized();

    const body = new URLSearchParams({
      grant_type: 'password',
      username: username,
      password: password,
      client_id: environment.OAUTH_CLIENT_ID,
      scope: environment.OAUTH_SCOPES,
    });

    return this.http
      .post<OAuth2TokenResponse>(`${environment.OAUTH_ISSUER}/o/token/`, body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        withCredentials: true, // Receive logged_in cookie from backend
      })
      .pipe(
        tap((response) => {
          // Store tokens in localStorage
          this.storeOAuthTokens(response);
          this.loggedInSignal.set(true);

          // Trigger token_received event for OAuth library
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.angularOAuthService as any).eventsSubject.next({
            type: 'token_received',
          });

          // Track successful login (if TraceService is available)
          const traceService = this.getTraceService();
          if (traceService) {
            traceService.trackAuthSuccess(username).subscribe({
              error: (err) => console.error('[OAuthService] Failed to track auth success:', err),
            });
          }
        }),
        map(() => true),
        catchError((error) => {
          console.error('OAuth2 password grant login failed:', error);
          const errorMessage = this.extractOAuthErrorMessage(error);

          // Track failed login (if TraceService is available)
          const traceService = this.getTraceService();
          if (traceService) {
            traceService.trackAuthFailure(username, errorMessage).subscribe({
              error: (err) => console.error('[OAuthService] Failed to track auth failure:', err),
            });
          }

          return throwError(() => new Error(errorMessage));
        }),
      );
  }

  /**
   * Store OAuth2 tokens in localStorage
   */
  private storeOAuthTokens(response: OAuth2TokenResponse): void {
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
   * Extract user-friendly error message from OAuth2 error response
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractOAuthErrorMessage(error: any): string {
    // Check if error response has OAuth2 error format
    if (error.error && typeof error.error === 'object') {
      const oauthError = error.error as OAuth2ErrorResponse;

      // Use error_description if available (most user-friendly)
      if (oauthError.error_description) {
        return oauthError.error_description;
      }

      // Fall back to error code with friendly message
      if (oauthError.error) {
        return this.getOAuthErrorMessage(oauthError.error);
      }
    }

    // Handle network errors
    if (error.status === 0) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }

    // Fallback for unexpected errors
    return 'Login failed. Please check your credentials and try again.';
  }

  /**
   * Get user-friendly error message for OAuth2 error codes
   */
  private getOAuthErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      invalid_grant: 'Invalid email or password.',
      invalid_client: 'Invalid application configuration.',
      invalid_request: 'Invalid login request.',
      unauthorized_client: 'This application is not authorized.',
      unsupported_grant_type: 'Unsupported authentication method.',
      access_denied: 'Access denied.',
    };
    return errorMessages[errorCode] || 'An authentication error occurred.';
  }

  /**
   * Initiate OAuth Authorization Code Flow (for social login, etc.)
   */
  login(): void {
    this.ensureInitialized();
    this.angularOAuthService.initCodeFlow();
  }

  /**
   * Logout - clear tokens from localStorage
   * Backend clears `logged_in` cookie via the logout endpoint
   */
  logout(): void {
    this.ensureInitialized();

    // Clear tokens from localStorage
    this.tokenStorage.clearTokens();

    this.angularOAuthService.logOut();
    this.loggedInSignal.set(false);
    this.currentUserSubject.next(null);
    this.router.navigate(['/']);
  }

  get isLoggedIn(): WritableSignal<boolean> {
    this.ensureInitialized();
    return this.loggedInSignal;
  }

  /**
   * Check if user is authenticated
   * Checks both localStorage token and backend-set cookie
   */
  isAuthenticated(): boolean {
    this.ensureInitialized();
    return this.tokenStorage.hasSession();
  }

  /**
   * Get access token from localStorage
   * Returns the token for Authorization header
   */
  getAccessToken(): string | null {
    const token = this.tokenStorage.getAccessToken();

    // Check if token is expired
    if (token && this.tokenStorage.isAccessTokenExpired()) {
      // Token expired - could trigger refresh here
      // For now, return null to indicate need for re-auth
      return null;
    }

    return token;
  }

  /**
   * Get token observable for Apollo and other consumers
   * Returns the access token or attempts refresh
   */
  getTokenObservable(): Observable<string | null> {
    this.ensureInitialized();

    const token = this.getAccessToken();

    // If we have a valid token, return it
    if (token) {
      return of(token);
    }

    // Check if we can refresh
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return of(null);
    }

    // Attempt to refresh the token
    return this.refreshAccessToken(refreshToken).pipe(
      map(() => this.tokenStorage.getAccessToken()),
      catchError((error) => {
        console.error('Token refresh failed:', error);
        this.logout();
        return of(null);
      }),
    );
  }

  /**
   * Refresh access token using OAuth2 refresh token grant
   */
  private refreshAccessToken(refreshToken: string): Observable<void> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: environment.OAUTH_CLIENT_ID,
    });

    return this.http
      .post<OAuth2TokenResponse>(`${environment.OAUTH_ISSUER}/o/token/`, body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        withCredentials: true, // Receive updated logged_in cookie
      })
      .pipe(
        tap((response) => {
          this.storeOAuthTokens(response);
        }),
        map(() => void 0),
        catchError((error) => {
          console.error('Refresh token request failed:', error);
          return throwError(() => new Error('Token refresh failed'));
        }),
      );
  }

  private loadUserProfile(): void {
    from(this.angularOAuthService.loadUserProfile())
      .pipe(
        map((profile) => profile as UserProfile),
        tap((profile: UserProfile) => {
          this.currentUserSubject.next(profile);
        }),
        catchError((error) => {
          console.error('Failed to load user profile:', error);
          return of(null);
        }),
      )
      .subscribe();
  }

  get currentUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }
}
