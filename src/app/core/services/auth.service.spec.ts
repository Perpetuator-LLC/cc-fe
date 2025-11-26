// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { OAuthService } from 'angular-oauth2-oidc';
import { of } from 'rxjs';
import { OAuthAuthService } from './auth.service';

describe('OAuthAuthService', () => {
  let service: OAuthAuthService;
  let oauthServiceSpy: jasmine.SpyObj<OAuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const oauthSpy = jasmine.createSpyObj('OAuthService', [
      'configure',
      'loadDiscoveryDocumentAndTryLogin',
      'hasValidAccessToken',
      'initCodeFlow',
      'logOut',
      'getAccessToken',
      'refreshToken',
      'loadUserProfile',
    ]);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    // Setup default return values
    oauthSpy.loadDiscoveryDocumentAndTryLogin.and.returnValue(Promise.resolve(true));
    oauthSpy.hasValidAccessToken.and.returnValue(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    oauthSpy.events = of({ type: 'token_received' }) as any;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        OAuthAuthService,
        { provide: OAuthService, useValue: oauthSpy },
        { provide: Router, useValue: routerSpyObj },
      ],
    });

    service = TestBed.inject(OAuthAuthService);
    oauthServiceSpy = TestBed.inject(OAuthService) as jasmine.SpyObj<OAuthService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('OAuth Configuration', () => {
    it('should configure OAuth service on initialization', () => {
      expect(oauthServiceSpy.configure).toHaveBeenCalled();
    });

    it('should load discovery document and try login', () => {
      expect(oauthServiceSpy.loadDiscoveryDocumentAndTryLogin).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should initiate OAuth code flow', () => {
      service.login();
      expect(oauthServiceSpy.initCodeFlow).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should call OAuth logout and navigate to home', () => {
      service.logout();
      expect(oauthServiceSpy.logOut).toHaveBeenCalled();
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
      oauthServiceSpy.hasValidAccessToken.and.returnValue(true);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false when OAuth service does not have valid access token', () => {
      oauthServiceSpy.hasValidAccessToken.and.returnValue(false);
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('should return access token from OAuth service', () => {
      const token = 'test-access-token';
      oauthServiceSpy.getAccessToken.and.returnValue(token);
      expect(service.getAccessToken()).toBe(token);
    });

    it('should return null if no token available', () => {
      oauthServiceSpy.getAccessToken.and.returnValue('');
      expect(service.getAccessToken()).toBe('');
    });
  });

  describe('getTokenObservable', () => {
    it('should return current token if valid', (done) => {
      const token = 'valid-token';
      oauthServiceSpy.getAccessToken.and.returnValue(token);
      oauthServiceSpy.hasValidAccessToken.and.returnValue(true);

      service.getTokenObservable().subscribe((result) => {
        expect(result).toBe(token);
        done();
      });
    });

    it('should refresh token if current token is invalid', (done) => {
      const newToken = 'refreshed-token';
      oauthServiceSpy.hasValidAccessToken.and.returnValue(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      oauthServiceSpy.refreshToken.and.returnValue(Promise.resolve({} as any));
      oauthServiceSpy.getAccessToken.and.returnValue(newToken);

      service.getTokenObservable().subscribe((result) => {
        expect(result).toBe(newToken);
        expect(oauthServiceSpy.refreshToken).toHaveBeenCalled();
        done();
      });
    });

    it('should logout and return null if refresh fails', (done) => {
      oauthServiceSpy.hasValidAccessToken.and.returnValue(false);
      oauthServiceSpy.refreshToken.and.returnValue(Promise.reject('refresh failed'));

      service.getTokenObservable().subscribe((result) => {
        expect(result).toBeNull();
        expect(oauthServiceSpy.logOut).toHaveBeenCalled();
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
