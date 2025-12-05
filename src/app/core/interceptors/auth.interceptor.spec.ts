// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';
import { OAuthAuthService } from '../auth.service';
import { of } from 'rxjs';

describe('authInterceptor', () => {
  let mockAuthService: jasmine.SpyObj<OAuthAuthService>;
  let mockNext: jasmine.Spy<HttpHandlerFn>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('OAuthAuthService', ['getAccessToken']);
    mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(of({}));

    TestBed.configureTestingModule({
      providers: [{ provide: OAuthAuthService, useValue: mockAuthService }],
    });
  });

  it('should add Authorization header when token is available', () => {
    const token = 'test-token';
    mockAuthService.getAccessToken.and.returnValue(token);

    const req = new HttpRequest('GET', '/api/test');
    TestBed.runInInjectionContext(() => {
      authInterceptor(req, mockNext);
    });

    const interceptedReq = mockNext.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(interceptedReq.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('should not add Authorization header when token is not available', () => {
    mockAuthService.getAccessToken.and.returnValue(null);

    const req = new HttpRequest('GET', '/api/test');
    TestBed.runInInjectionContext(() => {
      authInterceptor(req, mockNext);
    });

    const interceptedReq = mockNext.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(interceptedReq.headers.has('Authorization')).toBe(false);
  });

  it('should skip adding token for OAuth token endpoint', () => {
    const token = 'test-token';
    mockAuthService.getAccessToken.and.returnValue(token);

    const req = new HttpRequest('POST', 'http://localhost:8000/o/token/', {});
    TestBed.runInInjectionContext(() => {
      authInterceptor(req, mockNext);
    });

    const interceptedReq = mockNext.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(interceptedReq.headers.has('Authorization')).toBe(false);
  });

  it('should skip adding token for OAuth authorize endpoint', () => {
    const token = 'test-token';
    mockAuthService.getAccessToken.and.returnValue(token);

    const req = new HttpRequest('GET', 'http://localhost:8000/o/authorize/');
    TestBed.runInInjectionContext(() => {
      authInterceptor(req, mockNext);
    });

    const interceptedReq = mockNext.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(interceptedReq.headers.has('Authorization')).toBe(false);
  });
});
