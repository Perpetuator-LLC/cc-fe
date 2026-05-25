// Copyright (c) 2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UserSettingsService } from './user-settings.service';
import { UserService, UserSetting } from '../../user/user.service';

const LS_PREFIX = 'cc_user_setting_';

describe('UserSettingsService', () => {
  let service: UserSettingsService;
  let userService: jasmine.SpyObj<UserService>;

  beforeEach(() => {
    localStorage.clear();
    userService = jasmine.createSpyObj<UserService>('UserService', ['userSettings', 'updateUserSetting']);
    userService.userSettings.and.returnValue(of([] as UserSetting[]));
    userService.updateUserSetting.and.returnValue(of({ success: true, message: 'ok' }));

    TestBed.configureTestingModule({
      providers: [UserSettingsService, { provide: UserService, useValue: userService }],
    });
    service = TestBed.inject(UserSettingsService);
    // The cache is module-level state; ensure each test starts clean.
    service.clearCache();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('get', () => {
    it('returns cached value without hitting the server', (done) => {
      // Prime the cache via set()
      service.set('theme', 'dark').subscribe(() => {
        userService.userSettings.calls.reset();
        service.get('theme').subscribe((val) => {
          expect(val).toBe('dark');
          expect(userService.userSettings).not.toHaveBeenCalled();
          done();
        });
      });
    });

    it('fetches from server when cache empty, caches the response', (done) => {
      userService.userSettings.and.returnValue(of([{ key: 'theme', value: 'light' }] as UserSetting[]));
      service.get('theme').subscribe((val) => {
        expect(val).toBe('light');
        // Second call hits cache
        service.get('theme').subscribe((v2) => {
          expect(v2).toBe('light');
          expect(userService.userSettings).toHaveBeenCalledTimes(1);
          done();
        });
      });
    });

    it('falls back to localStorage when server returns no matching setting', (done) => {
      localStorage.setItem(LS_PREFIX + 'lastBlogUuid', 'local-uuid');
      userService.userSettings.and.returnValue(of([] as UserSetting[]));
      service.get('lastBlogUuid').subscribe((val) => {
        expect(val).toBe('local-uuid');
        done();
      });
    });

    it('falls back to localStorage when server errors', (done) => {
      localStorage.setItem(LS_PREFIX + 'lastBlogUuid', 'local-uuid');
      userService.userSettings.and.returnValue(throwError(() => new Error('500')));
      service.get('lastBlogUuid').subscribe((val) => {
        expect(val).toBe('local-uuid');
        done();
      });
    });

    it('returns null when both server and localStorage are empty', (done) => {
      service.get('lastBlogUuid').subscribe((val) => {
        expect(val).toBeNull();
        done();
      });
    });
  });

  describe('getOrDefault', () => {
    it('returns the value when present', (done) => {
      userService.userSettings.and.returnValue(of([{ key: 'theme', value: 'dark' }] as UserSetting[]));
      service.getOrDefault('theme', 'light').subscribe((val) => {
        expect(val).toBe('dark');
        done();
      });
    });

    it('returns the default when value is null', (done) => {
      service.getOrDefault('theme', 'light').subscribe((val) => {
        expect(val).toBe('light');
        done();
      });
    });
  });

  describe('set', () => {
    it('updates cache + localStorage and persists to server', (done) => {
      service.set('theme', 'dark').subscribe((ok) => {
        expect(ok).toBeTrue();
        expect(localStorage.getItem(LS_PREFIX + 'theme')).toBe('dark');
        expect(userService.updateUserSetting).toHaveBeenCalledWith('theme', 'dark');
        done();
      });
    });

    it('still resolves true when server save fails (localStorage backup)', (done) => {
      userService.updateUserSetting.and.returnValue(throwError(() => new Error('500')));
      spyOn(console, 'warn');
      service.set('theme', 'dark').subscribe((ok) => {
        expect(ok).toBeTrue();
        expect(localStorage.getItem(LS_PREFIX + 'theme')).toBe('dark');
        done();
      });
    });
  });

  describe('setAsync', () => {
    it('fires and forgets even when server save fails', () => {
      userService.updateUserSetting.and.returnValue(throwError(() => new Error('500')));
      spyOn(console, 'warn');
      expect(() => service.setAsync('theme', 'dark')).not.toThrow();
      expect(userService.updateUserSetting).toHaveBeenCalled();
    });
  });

  describe('clear / clearCache', () => {
    it('clear removes the cached + localStorage entry and updates server with ""', (done) => {
      service.set('theme', 'dark').subscribe(() => {
        userService.updateUserSetting.calls.reset();
        service.clear('theme').subscribe((ok) => {
          expect(ok).toBeTrue();
          expect(localStorage.getItem(LS_PREFIX + 'theme')).toBeNull();
          expect(userService.updateUserSetting).toHaveBeenCalledWith('theme', '');
          done();
        });
      });
    });

    it('clear resolves true even when server fails', (done) => {
      userService.updateUserSetting.and.returnValue(throwError(() => new Error('x')));
      service.clear('theme').subscribe((ok) => {
        expect(ok).toBeTrue();
        done();
      });
    });

    it('clearCache wipes in-memory cache without touching localStorage', (done) => {
      service.set('theme', 'dark').subscribe(() => {
        service.clearCache();
        // Next get() will hit server (with cache empty)
        userService.userSettings.and.returnValue(of([] as UserSetting[]));
        service.get('theme').subscribe(() => {
          expect(userService.userSettings).toHaveBeenCalled();
          // localStorage still has the value
          expect(localStorage.getItem(LS_PREFIX + 'theme')).toBe('dark');
          done();
        });
      });
    });
  });

  describe('preload', () => {
    it('seeds cache with the returned settings', (done) => {
      userService.userSettings.and.returnValue(
        of([
          { key: 'theme', value: 'dark' },
          { key: 'lastBlogUuid', value: 'b1' },
          { key: 'lastPodcastUuid', value: '' },
        ] as UserSetting[]),
      );
      service.preload(['theme', 'lastBlogUuid', 'lastPodcastUuid']).subscribe(() => {
        userService.userSettings.calls.reset();
        service.get('theme').subscribe((v) => {
          expect(v).toBe('dark');
          expect(userService.userSettings).not.toHaveBeenCalled();
          done();
        });
      });
    });

    it('swallows errors silently', (done) => {
      userService.userSettings.and.returnValue(throwError(() => new Error('bad')));
      service.preload(['theme']).subscribe(() => done());
    });
  });

  describe('convenience getters/setters', () => {
    it('getLastBlogUuid / setLastBlogUuid round-trip via cache', (done) => {
      service.setLastBlogUuid('b1');
      // Cache is updated synchronously in set()
      service.getLastBlogUuid().subscribe((v) => {
        expect(v).toBe('b1');
        done();
      });
    });

    it('getLastPodcastUuid / setLastPodcastUuid round-trip', (done) => {
      service.setLastPodcastUuid('p1');
      service.getLastPodcastUuid().subscribe((v) => {
        expect(v).toBe('p1');
        done();
      });
    });

    it('getLastPulseConfigUuid / setLastPulseConfigUuid round-trip', (done) => {
      service.setLastPulseConfigUuid('pc1');
      service.getLastPulseConfigUuid().subscribe((v) => {
        expect(v).toBe('pc1');
        done();
      });
    });

    it('getLastSocialAccountUuid / setLastSocialAccountUuid round-trip', (done) => {
      service.setLastSocialAccountUuid('sa1');
      service.getLastSocialAccountUuid().subscribe((v) => {
        expect(v).toBe('sa1');
        done();
      });
    });

    it('getLastTeamUuid / setLastTeamUuid round-trip', (done) => {
      service.setLastTeamUuid('t1');
      service.getLastTeamUuid().subscribe((v) => {
        expect(v).toBe('t1');
        done();
      });
    });
  });

  describe('localStorage helpers tolerate exceptions', () => {
    it('getFromLocalStorage swallows access errors', (done) => {
      const origGet = localStorage.getItem.bind(localStorage);
      spyOn(Storage.prototype, 'getItem').and.throwError('denied');
      service.get('theme').subscribe((v) => {
        expect(v).toBeNull();
        (Storage.prototype.getItem as jasmine.Spy).and.callFake(origGet);
        done();
      });
    });

    it('saveToLocalStorage swallows write errors', () => {
      spyOn(Storage.prototype, 'setItem').and.throwError('quota');
      expect(() => service.set('theme', 'dark').subscribe()).not.toThrow();
    });

    it('removeFromLocalStorage swallows errors', (done) => {
      spyOn(Storage.prototype, 'removeItem').and.throwError('denied');
      service.clear('theme').subscribe(() => done());
    });
  });
});
