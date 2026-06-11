// Copyright (c) 2026 Perpetuator LLC
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { UserService, UserSetting } from '../user/user.service';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let userServiceMock: {
    userSettings: jasmine.Spy;
    updateUserSetting: jasmine.Spy;
  };

  beforeEach(() => {
    localStorage.removeItem('theme');
    userServiceMock = {
      userSettings: jasmine.createSpy('userSettings').and.returnValue(of([] as UserSetting[])),
      updateUserSetting: jasmine.createSpy('updateUserSetting').and.returnValue(of({ success: true })),
    };
  });

  afterEach(() => {
    localStorage.removeItem('theme');
    document.body.classList.remove('light', 'dark');
  });

  function createService(loggedIn: boolean): ThemeService {
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: userServiceMock },
        { provide: AuthService, useValue: { isLoggedIn: signal(loggedIn) } },
      ],
    });
    return TestBed.inject(ThemeService);
  }

  describe('logged out', () => {
    it('defaults to dark and applies the body class', () => {
      const service = createService(false);
      expect(service.theme()).toBe('dark');
      expect(document.body.classList.contains('dark')).toBeTrue();
      expect(userServiceMock.updateUserSetting).not.toHaveBeenCalled();
      expect(userServiceMock.userSettings).not.toHaveBeenCalled();
    });

    it('restores a stored light preference', () => {
      localStorage.setItem('theme', 'light');
      const service = createService(false);
      expect(service.theme()).toBe('light');
      expect(document.body.classList.contains('light')).toBeTrue();
    });

    it('setTheme(light) persists to localStorage; dark clears it', () => {
      const service = createService(false);
      service.setTheme('light');
      expect(localStorage.getItem('theme')).toBe('light');
      expect(document.body.classList.contains('light')).toBeTrue();
      expect(document.body.classList.contains('dark')).toBeFalse();

      service.setTheme('dark');
      expect(localStorage.getItem('theme')).toBeNull();
      expect(document.body.classList.contains('dark')).toBeTrue();
    });
  });

  describe('logged in', () => {
    it('persists theme changes to user settings', () => {
      const service = createService(true);
      userServiceMock.updateUserSetting.calls.reset();
      service.setTheme('light');
      expect(userServiceMock.updateUserSetting).toHaveBeenCalledWith('theme', 'light');
    });

    it('applies a valid stored user setting on load', () => {
      userServiceMock.userSettings.and.returnValue(of([{ key: 'theme', value: 'LIGHT' }] as UserSetting[]));
      const service = createService(true);
      expect(service.theme()).toBe('light');
      expect(document.body.classList.contains('light')).toBeTrue();
    });

    it('falls back to localStorage when no setting is stored', () => {
      userServiceMock.userSettings.and.returnValue(of([] as UserSetting[]));
      localStorage.setItem('theme', 'light');
      const service = createService(true);
      expect(service.theme()).toBe('light');
    });

    it('rejects an invalid stored setting and falls back', () => {
      const error = spyOn(console, 'error');
      userServiceMock.userSettings.and.returnValue(of([{ key: 'theme', value: 'BLUE' }] as UserSetting[]));
      const service = createService(true);
      expect(error).toHaveBeenCalledWith('Invalid theme setting:', 'blue');
      expect(service.theme()).toBe('dark');
    });

    it('falls back to localStorage when loading settings errors', () => {
      userServiceMock.userSettings.and.returnValue(throwError(() => new Error('offline')));
      const service = createService(true);
      expect(service.theme()).toBe('dark');
    });

    it('logs an error when persisting the preference fails', () => {
      const error = spyOn(console, 'error');
      userServiceMock.updateUserSetting.and.returnValue(throwError(() => new Error('save failed')));
      createService(true);
      expect(error).toHaveBeenCalledWith('Failed to update user theme preference:', jasmine.any(Error));
    });
  });

  it('allows replacing the theme signal and unsubscribes on destroy', () => {
    const service = createService(false);
    const replacement = signal<'light' | 'dark'>('light');
    service.theme = replacement;
    expect(service.theme()).toBe('light');
    expect(() => service.ngOnDestroy()).not.toThrow();
  });
});
