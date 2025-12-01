// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { OAuthAuthService } from './core/services/auth.service';
import { MessageService } from './message.service';
import { of } from 'rxjs';

describe('AuthService (Deprecated - OAuth Wrapper)', () => {
  let service: AuthService;
  let mockOAuthService: jasmine.SpyObj<OAuthAuthService>;

  beforeEach(() => {
    const oauthSpy = jasmine.createSpyObj('OAuthAuthService', [
      'logout',
      'getAccessToken',
      'getTokenObservable',
      'isAuthenticated',
    ]);

    // Set up default signal for isLoggedIn
    Object.defineProperty(oauthSpy, 'isLoggedIn', {
      get: jasmine.createSpy('isLoggedIn').and.returnValue(() => false),
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: OAuthAuthService, useValue: oauthSpy },
        { provide: MessageService, useValue: jasmine.createSpyObj('MessageService', ['addMessage', 'clearMessages']) },
      ],
    });

    service = TestBed.inject(AuthService);
    mockOAuthService = TestBed.inject(OAuthAuthService) as jasmine.SpyObj<OAuthAuthService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should delegate logout to OAuth service', () => {
    service.logout();
    expect(mockOAuthService.logout).toHaveBeenCalled();
  });

  it('should delegate getToken to OAuth service', () => {
    const token = 'test-token';
    mockOAuthService.getAccessToken.and.returnValue(token);
    expect(service.getToken()).toBe(token);
  });

  it('should delegate getTokenObservable to OAuth service', (done) => {
    const token = 'test-token';
    mockOAuthService.getTokenObservable.and.returnValue(of(token));

    service.getTokenObservable().subscribe((result) => {
      expect(result).toBe(token);
      expect(mockOAuthService.getTokenObservable).toHaveBeenCalled();
      done();
    });
  });

  it('should delegate isRefreshTokenExpired to OAuth isAuthenticated', () => {
    mockOAuthService.isAuthenticated.and.returnValue(false);
    expect(service.isRefreshTokenExpired()).toBe(true);

    mockOAuthService.isAuthenticated.and.returnValue(true);
    expect(service.isRefreshTokenExpired()).toBe(false);
  });
});
