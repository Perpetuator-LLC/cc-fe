// Copyright (c) 2025 Perpetuator LLC
import { Injectable, signal, WritableSignal } from '@angular/core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

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

@Injectable({
  providedIn: 'root',
})
export class OAuthAuthService {
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$: Observable<UserProfile | null> = this.currentUserSubject.asObservable();
  private loggedInSignal: WritableSignal<boolean> = signal(false);
  private initialized = false;

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
  ) {
    // Don't initialize in constructor to avoid circular dependency
    // Will be initialized on first use
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

    // Check if we have stored tokens from OAuth2 password grant
    // OAuthService reads from sessionStorage by default
    const storedToken = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
    const expiresAt = sessionStorage.getItem('expires_at') || localStorage.getItem('expires_at');

    if (storedToken && expiresAt) {
      const isExpired = Date.now() >= parseInt(expiresAt);
      if (!isExpired) {
        // Restore to sessionStorage if it was in localStorage
        if (!sessionStorage.getItem('access_token')) {
          sessionStorage.setItem('access_token', storedToken);
          sessionStorage.setItem('expires_at', expiresAt);
          const refreshToken = localStorage.getItem('refresh_token');
          const tokenType = localStorage.getItem('token_type');
          const scope = localStorage.getItem('scope');
          if (refreshToken) sessionStorage.setItem('refresh_token', refreshToken);
          if (tokenType) sessionStorage.setItem('token_type', tokenType);
          if (scope) sessionStorage.setItem('granted_scopes', scope);
        }

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
        }),
        map(() => true),
        catchError((error) => {
          console.error('OAuth2 password grant login failed:', error);

          // Extract error message from OAuth2 response
          let errorMessage = 'Login failed. Please check your credentials.';
          if (error.error?.error_description) {
            errorMessage = error.error.error_description;
          } else if (error.error?.error) {
            errorMessage = error.error.error;
          } else if (error.message) {
            errorMessage = error.message;
          }

          // Return observable that throws error so graphql-auth.service can catch it
          return throwError(() => new Error(errorMessage));
        }),
      );
  }

  /**
   * Store OAuth2 tokens properly using OAuthService methods
   */
  private storeOAuthTokens(response: OAuth2TokenResponse): void {
    const expiresAt = Date.now() + response.expires_in * 1000;

    // Store in sessionStorage using keys that OAuthService expects
    // The library reads from sessionStorage by default
    sessionStorage.setItem('access_token', response.access_token);
    sessionStorage.setItem('refresh_token', response.refresh_token);
    sessionStorage.setItem('expires_at', expiresAt.toString());
    sessionStorage.setItem('token_type', response.token_type);
    sessionStorage.setItem('granted_scopes', response.scope);

    // Also store in localStorage for persistence across tabs
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    localStorage.setItem('expires_at', expiresAt.toString());
    localStorage.setItem('token_type', response.token_type);
    localStorage.setItem('scope', response.scope);

    // Force the OAuthService to recognize the token by triggering an event
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

    // Clear OAuth tokens from sessionStorage (where OAuthService reads from)
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('expires_at');
    sessionStorage.removeItem('token_type');
    sessionStorage.removeItem('granted_scopes');

    // Also clear from localStorage
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

    // Fallback: Check if we have a valid token in storage
    const token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
    if (token) {
      const expiresAt = sessionStorage.getItem('expires_at') || localStorage.getItem('expires_at');
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

    // Fallback: If OAuth service doesn't return token, get it directly from storage
    // This handles the case where angular-oauth2-oidc doesn't recognize password grant tokens
    if (!token) {
      const sessionToken = sessionStorage.getItem('access_token');
      const localToken = localStorage.getItem('access_token');
      token = sessionToken || localToken;

      if (token) {
        // Verify token hasn't expired
        const sessionExpires = sessionStorage.getItem('expires_at');
        const localExpires = localStorage.getItem('expires_at');
        const expiresAt = sessionExpires || localExpires;

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
    // Don't try to refresh - there's nothing to refresh
    if (!token) {
      return of(null);
    }

    // Token exists but is expired - try to refresh
    return from(this.oauthService.refreshToken()).pipe(
      map(() => this.getAccessToken()),
      catchError(() => {
        // Refresh failed - clear session
        this.logout();
        return of(null);
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
