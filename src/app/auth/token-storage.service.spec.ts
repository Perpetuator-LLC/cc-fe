// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from './token-storage.service';

describe('TokenStorageService', () => {
  let service: TokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenStorageService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('storeTokens', () => {
    it('should store tokens in localStorage', () => {
      service.storeTokens({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
        scope: 'read write',
      });

      expect(localStorage.getItem('access_token')).toBe('test-access-token');
      expect(localStorage.getItem('refresh_token')).toBe('test-refresh-token');
      expect(localStorage.getItem('token_type')).toBe('Bearer');
      expect(localStorage.getItem('scope')).toBe('read write');
    });
  });

  describe('getAccessToken', () => {
    it('should return token from localStorage', () => {
      localStorage.setItem('access_token', 'test-access-token');
      expect(service.getAccessToken()).toBe('test-access-token');
    });

    it('should return null when no token exists', () => {
      expect(service.getAccessToken()).toBeNull();
    });
  });

  describe('getRefreshToken', () => {
    it('should return refresh token from localStorage', () => {
      localStorage.setItem('refresh_token', 'test-refresh-token');
      expect(service.getRefreshToken()).toBe('test-refresh-token');
    });
  });

  describe('isAccessTokenExpired', () => {
    it('should return true when no expiration is set', () => {
      expect(service.isAccessTokenExpired()).toBeTrue();
    });

    it('should return true when token is expired', () => {
      localStorage.setItem('expires_at', (Date.now() - 1000).toString());
      expect(service.isAccessTokenExpired()).toBeTrue();
    });

    it('should return false when token is not expired', () => {
      localStorage.setItem('expires_at', (Date.now() + 3600000).toString());
      expect(service.isAccessTokenExpired()).toBeFalse();
    });

    it('should return true when token expires within 30 second buffer', () => {
      localStorage.setItem('expires_at', (Date.now() + 15000).toString()); // 15 seconds
      expect(service.isAccessTokenExpired()).toBeTrue();
    });
  });

  describe('hasSession', () => {
    it('should return false when no token exists', () => {
      expect(service.hasSession()).toBeFalse();
    });

    it('should return true when valid token exists', () => {
      localStorage.setItem('access_token', 'test-token');
      localStorage.setItem('expires_at', (Date.now() + 3600000).toString());
      expect(service.hasSession()).toBeTrue();
    });

    it('should return false when token is expired', () => {
      localStorage.setItem('access_token', 'test-token');
      localStorage.setItem('expires_at', (Date.now() - 1000).toString());
      expect(service.hasSession()).toBeFalse();
    });
  });

  describe('clearTokens', () => {
    it('should clear all tokens from localStorage', () => {
      localStorage.setItem('access_token', 'test-token');
      localStorage.setItem('refresh_token', 'test-refresh');
      localStorage.setItem('expires_at', '123456');
      localStorage.setItem('token_type', 'Bearer');
      localStorage.setItem('scope', 'read');

      service.clearTokens();

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('expires_at')).toBeNull();
      expect(localStorage.getItem('token_type')).toBeNull();
      expect(localStorage.getItem('scope')).toBeNull();
    });
  });

  describe('getStoredTokenData', () => {
    it('should return all stored token data', () => {
      const expiresAt = Date.now() + 3600000;
      service.storeTokens({
        accessToken: 'test-access',
        refreshToken: 'test-refresh',
        expiresAt: expiresAt,
        tokenType: 'Bearer',
        scope: 'read write',
      });

      const data = service.getStoredTokenData();
      expect(data.accessToken).toBe('test-access');
      expect(data.refreshToken).toBe('test-refresh');
      expect(data.expiresAt).toBe(expiresAt);
      expect(data.tokenType).toBe('Bearer');
      expect(data.scope).toBe('read write');
    });
  });
});
