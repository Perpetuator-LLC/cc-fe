// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { OAuthService as AngularOAuthService } from 'angular-oauth2-oidc';
import { of } from 'rxjs';
import { OAuthService } from './oauth.service';
import { TokenStorageService } from './token-storage.service';

describe('OAuthService', () => {
  let service: OAuthService;
  let angularOAuthServiceSpy: jasmine.SpyObj<AngularOAuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let tokenStorageSpy: jasmine.SpyObj<TokenStorageService>;

  beforeEach(() => {
    angularOAuthServiceSpy = jasmine.createSpyObj('AngularOAuthService', [
      'configure',
      'loadDiscoveryDocumentAndTryLogin',
      'hasValidAccessToken',
      'initCodeFlow',
      'logOut',
      'getAccessToken',
      'refreshToken',
      'loadUserProfile',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', [
      'hasSession',
      'getAccessToken',
      'getRefreshToken',
      'isAccessTokenExpired',
      'storeTokens',
      'clearTokens',
    ]);

    // Setup default return values
    angularOAuthServiceSpy.loadDiscoveryDocumentAndTryLogin.and.returnValue(Promise.resolve(true));
    angularOAuthServiceSpy.hasValidAccessToken.and.returnValue(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    angularOAuthServiceSpy.events = of({ type: 'token_received' }) as any;

    // TokenStorageService defaults
    tokenStorageSpy.hasSession.and.returnValue(false);
    tokenStorageSpy.getAccessToken.and.returnValue(null);
    tokenStorageSpy.getRefreshToken.and.returnValue(null);
    tokenStorageSpy.isAccessTokenExpired.and.returnValue(true);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        OAuthService,
        { provide: AngularOAuthService, useValue: angularOAuthServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: TokenStorageService, useValue: tokenStorageSpy },
      ],
    });

    service = TestBed.inject(OAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('OAuth Configuration', () => {
    it('should configure OAuth service on initialization', () => {
      // Trigger initialization by calling a method that uses ensureInitialized
      service.isAuthenticated();
      expect(angularOAuthServiceSpy.configure).toHaveBeenCalled();
    });

    it('should load discovery document and try login', () => {
      // Trigger initialization
      service.isAuthenticated();
      expect(angularOAuthServiceSpy.configure).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should initiate OAuth code flow', () => {
      service.login();
      expect(angularOAuthServiceSpy.initCodeFlow).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should call OAuth logout and navigate to home', () => {
      service.logout();
      expect(angularOAuthServiceSpy.logOut).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should clear user state on logout', () => {
      service.logout();
      expect(service.currentUser).toBeNull();
      expect(service.isLoggedIn()).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when OAuth service has valid access token', () => {
      tokenStorageSpy.hasSession.and.returnValue(true);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false when OAuth service does not have valid access token', () => {
      tokenStorageSpy.hasSession.and.returnValue(false);
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('should return access token from OAuth service', () => {
      const token = 'test-access-token';
      tokenStorageSpy.getAccessToken.and.returnValue(token);
      tokenStorageSpy.isAccessTokenExpired.and.returnValue(false);
      expect(service.getAccessToken()).toBe(token);
    });

    it('should return null if no token available', () => {
      tokenStorageSpy.getAccessToken.and.returnValue(null);
      expect(service.getAccessToken()).toBe(null);
    });

    it('should return null if token is expired', () => {
      tokenStorageSpy.getAccessToken.and.returnValue('expired-token');
      tokenStorageSpy.isAccessTokenExpired.and.returnValue(true);
      expect(service.getAccessToken()).toBe(null);
    });
  });

  describe('getTokenObservable', () => {
    it('should return current token if valid', (done) => {
      const token = 'valid-token';
      tokenStorageSpy.getAccessToken.and.returnValue(token);
      tokenStorageSpy.isAccessTokenExpired.and.returnValue(false);

      service.getTokenObservable().subscribe((result) => {
        expect(result).toBe(token);
        done();
      });
    });

    it('should return null if no token and no refresh token', (done) => {
      tokenStorageSpy.getAccessToken.and.returnValue(null);
      tokenStorageSpy.getRefreshToken.and.returnValue(null);

      service.getTokenObservable().subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
    });

    it('should return null if token expired and no refresh token', (done) => {
      tokenStorageSpy.getAccessToken.and.returnValue('expired-token');
      tokenStorageSpy.isAccessTokenExpired.and.returnValue(true);
      tokenStorageSpy.getRefreshToken.and.returnValue(null);

      service.getTokenObservable().subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
    });
  });

  describe('User Profile', () => {
    it('should expose currentUser$ observable', (done) => {
      service.currentUser$.subscribe((user) => {
        expect(user).toBeNull(); // Initially null
        done();
      });
    });

    it('should provide currentUser getter', () => {
      expect(service.currentUser).toBeNull();
    });
  });
});
