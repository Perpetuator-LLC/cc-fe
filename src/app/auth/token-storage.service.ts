// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';

/**
 * Token Storage Service
 *
 * Handles OAuth2 token storage in localStorage.
 *
 * Architecture:
 * - Tokens (access_token, refresh_token) stored in localStorage
 * - Frontend sends tokens via Authorization: Bearer header
 * - Session detection based on token presence and expiration
 *
 * Security considerations:
 * - localStorage is vulnerable to XSS, but Angular has built-in XSS protection
 * - Tokens are validated server-side on every request
 * - This is industry standard for SPAs with cross-origin APIs
 */

export interface StoredTokenData {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  tokenType: string | null;
  scope: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  // Storage keys
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly EXPIRES_AT_KEY = 'expires_at';
  private readonly TOKEN_TYPE_KEY = 'token_type';
  private readonly SCOPE_KEY = 'scope';

  /**
   * Store tokens in localStorage
   * Tokens come from OAuth2/GraphQL response body
   */
  storeTokens(data: Partial<StoredTokenData>): void {
    if (data.accessToken) {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, data.accessToken);
    }
    if (data.refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken);
    }
    if (data.expiresAt) {
      localStorage.setItem(this.EXPIRES_AT_KEY, data.expiresAt.toString());
    }
    if (data.tokenType) {
      localStorage.setItem(this.TOKEN_TYPE_KEY, data.tokenType);
    }
    if (data.scope) {
      localStorage.setItem(this.SCOPE_KEY, data.scope);
    }
  }

  /**
   * Get the access token from localStorage
   */
  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Get the refresh token from localStorage
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Get token expiration time
   */
  getExpiresAt(): number | null {
    const expiresAt = localStorage.getItem(this.EXPIRES_AT_KEY);
    return expiresAt ? parseInt(expiresAt, 10) : null;
  }

  /**
   * Check if the access token is expired
   */
  isAccessTokenExpired(): boolean {
    const expiresAt = this.getExpiresAt();
    if (!expiresAt) {
      return true;
    }
    // Add 30 second buffer to account for clock skew
    return Date.now() >= expiresAt - 30000;
  }

  /**
   * Check if a session exists
   * Checks if we have a valid, non-expired token in localStorage
   */
  hasSession(): boolean {
    const token = this.getAccessToken();
    return !!token && !this.isAccessTokenExpired();
  }

  /**
   * Clear all stored tokens
   */
  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.EXPIRES_AT_KEY);
    localStorage.removeItem(this.TOKEN_TYPE_KEY);
    localStorage.removeItem(this.SCOPE_KEY);
  }

  /**
   * Get all stored token data
   */
  getStoredTokenData(): StoredTokenData {
    return {
      accessToken: this.getAccessToken(),
      refreshToken: this.getRefreshToken(),
      expiresAt: this.getExpiresAt(),
      tokenType: localStorage.getItem(this.TOKEN_TYPE_KEY),
      scope: localStorage.getItem(this.SCOPE_KEY),
    };
  }
}
