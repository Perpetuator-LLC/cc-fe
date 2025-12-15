// Copyright (c) 2025 Perpetuator LLC
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ErrorHandlerService } from './error-handler.service';
import { getCommonTestProviders } from '../testing/test-helpers';
import { TokenStorageService } from '../auth/token-storage.service';
import { AuthService } from '../auth/auth.service';
import { MessageService } from '../message.service';
import { EMPTY } from 'rxjs';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let mockTokenStorage: jasmine.SpyObj<TokenStorageService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockRouter: jasmine.SpyObj<Router>;

  // Helper to create proper GraphQL error format
  function createAuthError(message: string) {
    return {
      message,
      graphQLErrors: [{ message, path: ['query'] }],
    };
  }

  beforeEach(() => {
    mockTokenStorage = jasmine.createSpyObj('TokenStorageService', ['getRefreshToken']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['logout']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['warning']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ...getCommonTestProviders(),
        provideRouter([]),
        { provide: TokenStorageService, useValue: mockTokenStorage },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: Router, useValue: mockRouter },
      ],
    });
    service = TestBed.inject(ErrorHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('handleError with auth errors', () => {
    it('should defer to Apollo refresh when refresh token is available', () => {
      mockTokenStorage.getRefreshToken.and.returnValue('valid-refresh-token');

      const error = createAuthError('Authentication credentials invalid or missing');

      let errorThrown = false;
      service.handleError(error).subscribe({
        error: () => {
          errorThrown = true;
        },
      });

      // Should NOT logout when refresh token is available
      expect(mockAuthService.logout).not.toHaveBeenCalled();
      expect(mockMessageService.warning).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(errorThrown).toBe(true);
    });

    it('should logout and show toast when no refresh token available', () => {
      mockTokenStorage.getRefreshToken.and.returnValue(null);

      const error = createAuthError('Authentication credentials invalid or missing');

      const result = service.handleError(error);

      expect(result).toBe(EMPTY);
      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(mockMessageService.warning).toHaveBeenCalledWith('Your session has expired. Please log in again.');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should only show one toast for multiple simultaneous auth errors', fakeAsync(() => {
      mockTokenStorage.getRefreshToken.and.returnValue(null);

      const error = createAuthError('Authentication credentials invalid or missing');

      // Simulate multiple simultaneous auth errors
      service.handleError(error);
      service.handleError(error);
      service.handleError(error);

      // Should only call these once
      expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
      expect(mockMessageService.warning).toHaveBeenCalledTimes(1);

      // Reset after debounce window
      tick(2100);
    }));

    it('should handle "Token is invalid or expired" error', () => {
      mockTokenStorage.getRefreshToken.and.returnValue(null);

      const error = createAuthError('Token is invalid or expired');

      const result = service.handleError(error);

      expect(result).toBe(EMPTY);
      expect(mockAuthService.logout).toHaveBeenCalled();
    });

    it('should handle "Given token not valid for any token type" error', () => {
      mockTokenStorage.getRefreshToken.and.returnValue(null);

      const error = createAuthError('Given token not valid for any token type');

      const result = service.handleError(error);

      expect(result).toBe(EMPTY);
      expect(mockAuthService.logout).toHaveBeenCalled();
    });
  });

  describe('handleError with non-auth errors', () => {
    it('should pass through non-auth errors', () => {
      const error = {
        message: 'Network error',
        graphQLErrors: [{ message: 'Network error', path: ['query'] }],
      };

      let thrownError: Error | undefined;
      service.handleError(error).subscribe({
        error: (err) => {
          thrownError = err;
        },
      });

      expect(thrownError).toBeDefined();
      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });
  });
});
