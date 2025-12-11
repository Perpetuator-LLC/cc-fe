// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { TokenStorageService } from '../token-storage.service';

describe('authInterceptor', () => {
  let mockNext: jasmine.Spy<HttpHandlerFn>;
  let mockTokenStorage: jasmine.SpyObj<TokenStorageService>;

  beforeEach(() => {
    mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(of({}));
    mockTokenStorage = jasmine.createSpyObj('TokenStorageService', ['getAccessToken', 'isAccessTokenExpired']);

    TestBed.configureTestingModule({
      providers: [{ provide: TokenStorageService, useValue: mockTokenStorage }],
    });

    // Default behavior
    mockTokenStorage.isAccessTokenExpired.and.returnValue(false);
  });

  it('should add Authorization header when token is available', () => {
    const token = 'test-token';
    mockTokenStorage.getAccessToken.and.returnValue(token);

    const req = new HttpRequest('GET', '/api/test');
    TestBed.runInInjectionContext(() => {
      authInterceptor(req, mockNext);
    });

    const interceptedReq = mockNext.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(interceptedReq.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(interceptedReq.withCredentials).toBe(true);
  });

  it('should not add Authorization header when token is not available', () => {
    mockTokenStorage.getAccessToken.and.returnValue(null);

    const req = new HttpRequest('GET', '/api/test');
    TestBed.runInInjectionContext(() => {
      authInterceptor(req, mockNext);
    });

    const interceptedReq = mockNext.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(interceptedReq.headers.has('Authorization')).toBe(false);
    expect(interceptedReq.withCredentials).toBe(true);
  });

  it('should not add Authorization header when token is expired', () => {
    mockTokenStorage.getAccessToken.and.returnValue('expired-token');
    mockTokenStorage.isAccessTokenExpired.and.returnValue(true);

    const req = new HttpRequest('GET', '/api/test');
    TestBed.runInInjectionContext(() => {
      authInterceptor(req, mockNext);
    });

    const interceptedReq = mockNext.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(interceptedReq.headers.has('Authorization')).toBe(false);
  });

  it('should skip adding token for OAuth token endpoint', () => {
    const token = 'test-token';
    mockTokenStorage.getAccessToken.and.returnValue(token);

    const req = new HttpRequest('POST', 'http://localhost:8000/o/token/', {});
    TestBed.runInInjectionContext(() => {
      authInterceptor(req, mockNext);
    });

    const interceptedReq = mockNext.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(interceptedReq.headers.has('Authorization')).toBe(false);
    expect(interceptedReq.withCredentials).toBe(true);
  });

  it('should skip adding token for OAuth authorize endpoint', () => {
    const token = 'test-token';
    mockTokenStorage.getAccessToken.and.returnValue(token);

    const req = new HttpRequest('GET', 'http://localhost:8000/o/authorize/');
    TestBed.runInInjectionContext(() => {
      authInterceptor(req, mockNext);
    });

    const interceptedReq = mockNext.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(interceptedReq.headers.has('Authorization')).toBe(false);
  });

  it('should always include withCredentials for cookies', () => {
    mockTokenStorage.getAccessToken.and.returnValue(null);

    const req = new HttpRequest('GET', '/api/test');
    TestBed.runInInjectionContext(() => {
      authInterceptor(req, mockNext);
    });

    const interceptedReq = mockNext.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(interceptedReq.withCredentials).toBe(true);
  });
});
