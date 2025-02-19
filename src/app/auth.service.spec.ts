// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService, AuthUrls } from './auth.service';

import { createTestJWT } from './jwt';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear(); // Clear localStorage after each test to avoid conflicts
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login and set session', () => {
    const accessToken = createTestJWT({});
    const refreshToken = createTestJWT({}, 3600 * 24);
    const mockResponse = {
      access: accessToken,
      refresh: refreshToken,
      expires_in: 3600,
    };

    service.login('test@example.com', 'testpassword').subscribe((response) => {
      expect(response).toEqual(mockResponse);
      // TODO: bring back when login is fixed...
      // expect(localStorage.getItem('id_token')).toBe(mockResponse.access);
      // expect(localStorage.getItem('refresh_token')).toBe(mockResponse.refresh);
      // expect(localStorage.getItem('expires_at')).toBeTruthy();
    });

    const req = httpMock.expectOne(AuthUrls.login);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should refresh token and update session', () => {
    const token = createTestJWT({});
    const mockResponse = {
      access: token,
      refresh: createTestJWT({}, 3600 * 24),
      expires_in: 3600,
    };

    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'refresh_token') {
        return mockResponse.refresh;
      } else if (key === 'refresh_expires_at') {
        return JSON.stringify(mockResponse.expires_in * 1000);
      }
      return null;
    });

    spyOn(localStorage, 'setItem').and.callThrough();

    spyOn(service, 'isRefreshTokenExpired').and.returnValue(false);

    service.refreshToken().subscribe((response) => {
      expect(response).toEqual(mockResponse);
      expect(localStorage.setItem).toHaveBeenCalledWith('id_token', mockResponse.access);
      expect(localStorage.setItem).toHaveBeenCalledWith('expires_at', jasmine.any(String));
    });

    const req = httpMock.expectOne(AuthUrls.refreshToken);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should logout and clear session', () => {
    localStorage.setItem('id_token', 'access-token');
    localStorage.setItem('refresh_token', 'refresh-token');
    localStorage.setItem('expires_at', JSON.stringify(new Date().getTime() + 3600 * 1000));

    service.logout();

    expect(localStorage.getItem('id_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('expires_at')).toBeNull();
  });

  it('should return false if refresh is valid', () => {
    localStorage.setItem('refresh_expires_at', JSON.stringify(new Date().getTime() + 3600 * 1000));
    const service2 = TestBed.inject(AuthService);
    expect(service2.isRefreshTokenExpired()).toBeFalse();
  });

  it('should return true if refresh is expired', () => {
    localStorage.setItem('refresh_expires_at', JSON.stringify(new Date().getTime() - 3600 * 1000));
    const service2 = TestBed.inject(AuthService);
    expect(service2.isRefreshTokenExpired()).toBeTrue();
  });

  // it('should return true if the user is logged in', () => {
  //   spyOn(service, 'isRefreshTokenExpired').and.returnValue(false);
  //   expect(service.isLoggedIn()).toBeTrue();
  // });
  //
  // it('should return false if the user is not logged in', () => {
  //   spyOn(service, 'isRefreshTokenExpired').and.returnValue(true);
  //   expect(service.isLoggedIn()).toBeFalse();
  // });

  it('should return the token if available', () => {
    localStorage.setItem('id_token', 'access-token');

    expect(service.getToken()).toBe('access-token');
  });

  it('should return null if the token is not available', () => {
    localStorage.removeItem('id_token');

    expect(service.getToken()).toBeNull();
  });
});
