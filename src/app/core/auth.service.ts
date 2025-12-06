// Copyright (c) 2025 Perpetuator LLC
import { Injectable, signal, WritableSignal, Injector } from '@angular/core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { TraceService } from '../traces/services/trace.service';

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

@Injectable({
  providedIn: 'root',
})
export class OAuthAuthService {
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
    private oauthService: OAuthService,
    private router: Router,
    private http: HttpClient,
    private injector: Injector,
  ) {
    // Don't initialize in constructor to avoid circular dependency
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
      console.warn('[OAuthAuthService] TraceService not available:', error);
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
    this.oauthService.configure(this.authConfig);

    // Subscribe to OAuth events
    this.oauthService.events.subscribe((event) => {
      if (event.type === 'token_received') {
        this.loggedInSignal.set(true);
        // Don't load user profile automatically - it will be loaded when needed
      } else if (event.type === 'logout' || event.type === 'session_terminated') {
        this.loggedInSignal.set(false);
        this.currentUserSubject.next(null);
      }
    });

    // Check if we have stored tokens from OAuth2 password grant in localStorage
    const storedToken = localStorage.getItem('access_token');
    const expiresAt = localStorage.getItem('expires_at');

    if (storedToken && expiresAt) {
      const isExpired = Date.now() >= parseInt(expiresAt);
      if (!isExpired) {
        this.loggedInSignal.set(true);
        // Don't load user profile yet - will be loaded when needed
      }
    }
  }

  /**
   * OAuth2 Password Grant login
   * Uses username/password to get OAuth2 tokens directly
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
      })
      .pipe(
        tap((response) => {
          // Store tokens using OAuth service
          this.storeOAuthTokens(response);
          this.loggedInSignal.set(true);
          // Don't load user profile here - it will be loaded when needed
          // This prevents blocking login if /o/userinfo/ has issues

          // Track successful login (if TraceService is available)
          const traceService = this.getTraceService();
          if (traceService) {
            traceService.trackAuthSuccess(username).subscribe({
              error: (err) => console.error('[OAuthAuthService] Failed to track auth success:', err),
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
              error: (err) => console.error('[OAuthAuthService] Failed to track auth failure:', err),
            });
          }

          return throwError(() => new Error(errorMessage));
        }),
      );
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

    return errorMessages[errorCode] || 'Authentication failed. Please try again.';
  }

  /**
   * Store OAuth2 tokens in localStorage
   */
  private storeOAuthTokens(response: OAuth2TokenResponse): void {
    const expiresAt = Date.now() + response.expires_in * 1000;

    // Store in localStorage for persistence across browser sessions and tabs
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    localStorage.setItem('expires_at', expiresAt.toString());
    localStorage.setItem('token_type', response.token_type);
    localStorage.setItem('scope', response.scope);

    // Trigger token_received event for OAuth library
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.oauthService as any).eventsSubject.next({
      type: 'token_received',
    });
  }

  /**
   * Initiate OAuth Authorization Code Flow (for social login, etc.)
   */
  login(): void {
    this.ensureInitialized();
    this.oauthService.initCodeFlow();
  }

  logout(): void {
    this.ensureInitialized();

    // Clear OAuth tokens from localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
    localStorage.removeItem('token_type');
    localStorage.removeItem('scope');

    this.oauthService.logOut();
    this.loggedInSignal.set(false);
    this.currentUserSubject.next(null);
    this.router.navigate(['/']);
  }

  get isLoggedIn(): WritableSignal<boolean> {
    this.ensureInitialized();
    return this.loggedInSignal;
  }

  isAuthenticated(): boolean {
    this.ensureInitialized();

    // Try OAuth service first
    if (this.oauthService.hasValidAccessToken()) {
      return true;
    }

    // Fallback: Check if we have a valid token in localStorage
    const token = localStorage.getItem('access_token');
    if (token) {
      const expiresAt = localStorage.getItem('expires_at');
      if (expiresAt) {
        return Date.now() < parseInt(expiresAt);
      }
    }

    return false;
  }

  getAccessToken(): string | null {
    this.ensureInitialized();

    // Try OAuth service first
    let token: string | null = this.oauthService.getAccessToken();

    // Fallback: If OAuth service doesn't return token, get it directly from localStorage
    // This handles the case where angular-oauth2-oidc doesn't recognize password grant tokens
    if (!token) {
      token = localStorage.getItem('access_token');

      if (token) {
        // Verify token hasn't expired
        const expiresAt = localStorage.getItem('expires_at');

        if (expiresAt && Date.now() >= parseInt(expiresAt)) {
          // Token expired, clear it
          this.logout();
          return null;
        }
      }
    }

    return token;
  }

  getTokenObservable(): Observable<string | null> {
    this.ensureInitialized();
    const token = this.getAccessToken();

    // If we have a valid token, return it
    if (token && this.isAuthenticated()) {
      return of(token);
    }

    // If no token at all (not logged in), return null immediately
    if (!token && !localStorage.getItem('refresh_token')) {
      return of(null);
    }

    // Token exists but is expired - try to refresh using OAuth2 refresh token
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      this.logout();
      return of(null);
    }

    // Use OAuth2 password grant refresh token flow
    return this.refreshAccessToken(refreshToken).pipe(
      map(() => this.getAccessToken()),
      catchError((error) => {
        console.error('Token refresh failed:', error);
        // Refresh failed - clear session
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
      })
      .pipe(
        tap((response) => {
          // Store new tokens
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
    from(this.oauthService.loadUserProfile())
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

// Export alias for backward compatibility
export { OAuthAuthService as AuthService };
