// Copyright (c) 2026 Perpetuator LLC
import { inject, Injectable } from '@angular/core';
import { Observable, of, map, tap, catchError } from 'rxjs';
import { UserService, UserSetting } from '../../user/user.service';

/**
 * User Settings Schema
 *
 * This interface defines ALL valid user setting keys and their types.
 * The backend stores these as key-value string pairs, but we enforce
 * types on the frontend for consistency.
 *
 * Settings are persisted server-side and sync across devices.
 * For anonymous/logged-out users, settings fallback to localStorage.
 */
export interface UserSettingsSchema {
  // Theme preference
  theme: 'light' | 'dark';

  // Default voice for TTS/recordings
  defaultVoice: string; // Voice UUID

  // Last selected entities (for smart defaults in dropdowns)
  lastBlogUuid: string;
  lastPodcastUuid: string;
  lastPulseConfigUuid: string;
  lastSocialAccountUuid: string;
  lastTeamUuid: string;

  // Terminal preferences
  terminalFontSize: string; // e.g., '14'
  terminalShowLineNumbers: 'true' | 'false';

  // Chart preferences
  chartDefaultPeriod: string; // e.g., '1Y', '6M', '1M'
  chartDefaultInterval: string; // e.g., 'daily', '1h', '30min'
  chartShowExtendedHours: 'true' | 'false';
  chartShowVolume: 'true' | 'false';

  // Notification preferences (used in addition to email/sms prefs)
  notifyOnJobComplete: 'true' | 'false';
  notifyOnEpisodePublished: 'true' | 'false';
}

/**
 * Valid setting keys (for type safety)
 */
export type UserSettingKey = keyof UserSettingsSchema;

/**
 * All valid setting keys as an array (useful for validation)
 */
export const USER_SETTING_KEYS: UserSettingKey[] = [
  'theme',
  'defaultVoice',
  'lastBlogUuid',
  'lastPodcastUuid',
  'lastPulseConfigUuid',
  'lastSocialAccountUuid',
  'lastTeamUuid',
  'terminalFontSize',
  'terminalShowLineNumbers',
  'chartDefaultPeriod',
  'chartDefaultInterval',
  'chartShowExtendedHours',
  'chartShowVolume',
  'notifyOnJobComplete',
  'notifyOnEpisodePublished',
];

/**
 * Local storage prefix for fallback storage
 */
const LOCAL_STORAGE_PREFIX = 'cc_user_setting_';

/**
 * In-memory cache for settings (to avoid repeated API calls)
 */
const settingsCache = new Map<string, string>();

/**
 * UserSettingsService
 *
 * Centralized service for managing user preferences/settings.
 * - Persists to backend when user is logged in
 * - Falls back to localStorage for anonymous users
 * - Provides type-safe getters/setters
 * - Caches settings in memory for quick access
 *
 * Usage:
 *   // Get a setting (returns Observable)
 *   this.userSettingsService.get('lastBlogUuid').subscribe(uuid => ...);
 *
 *   // Set a setting (auto-persists)
 *   this.userSettingsService.set('lastBlogUuid', blogUuid);
 *
 *   // Get with default value
 *   this.userSettingsService.getOrDefault('theme', 'dark').subscribe(theme => ...);
 */
@Injectable({
  providedIn: 'root',
})
export class UserSettingsService {
  private readonly userService = inject(UserService);

  /**
   * Get a user setting value
   * Returns null if not set
   */
  get<K extends UserSettingKey>(key: K): Observable<UserSettingsSchema[K] | null> {
    // Check cache first
    if (settingsCache.has(key)) {
      return of(settingsCache.get(key) as UserSettingsSchema[K]);
    }

    // Try to load from server
    return this.userService.userSettings([key]).pipe(
      map((settings: UserSetting[]) => {
        const setting = settings.find((s: UserSetting) => s.key === key);
        if (setting?.value) {
          settingsCache.set(key, setting.value);
          return setting.value as UserSettingsSchema[K];
        }
        // Fallback to localStorage
        return this.getFromLocalStorage(key);
      }),
      catchError(() => {
        // Server unavailable, use localStorage
        return of(this.getFromLocalStorage(key));
      }),
    );
  }

  /**
   * Get a setting with a default value if not set
   */
  getOrDefault<K extends UserSettingKey>(
    key: K,
    defaultValue: UserSettingsSchema[K],
  ): Observable<UserSettingsSchema[K]> {
    return this.get(key).pipe(map((value) => value ?? defaultValue));
  }

  /**
   * Set a user setting value
   * Persists to server and updates local cache
   */
  set<K extends UserSettingKey>(key: K, value: UserSettingsSchema[K]): Observable<boolean> {
    const stringValue = String(value);

    // Update cache immediately for responsive UI
    settingsCache.set(key, stringValue);

    // Also save to localStorage as backup
    this.saveToLocalStorage(key, stringValue);

    // Persist to server
    return this.userService.updateUserSetting(key, stringValue).pipe(
      map(() => true),
      catchError(() => {
        // Server save failed, but localStorage backup exists
        console.warn(`Failed to persist setting '${key}' to server, using localStorage`);
        return of(true);
      }),
    );
  }

  /**
   * Set a setting without waiting for server response
   * Useful for "fire and forget" updates like last-selected tracking
   */
  setAsync<K extends UserSettingKey>(key: K, value: UserSettingsSchema[K]): void {
    this.set(key, value).subscribe({
      error: () => {
        // Silent failure - setting is cached locally
      },
    });
  }

  /**
   * Clear a specific setting
   */
  clear(key: UserSettingKey): Observable<boolean> {
    settingsCache.delete(key);
    this.removeFromLocalStorage(key);

    return this.userService.updateUserSetting(key, '').pipe(
      map(() => true),
      catchError(() => of(true)),
    );
  }

  /**
   * Clear the in-memory cache (useful on logout)
   */
  clearCache(): void {
    settingsCache.clear();
  }

  /**
   * Preload multiple settings into cache
   * Useful on app init to reduce API calls
   */
  preload(keys: UserSettingKey[]): Observable<void> {
    return this.userService.userSettings(keys).pipe(
      tap((settings: UserSetting[]) => {
        settings.forEach((s: UserSetting) => {
          if (s.value) {
            settingsCache.set(s.key, s.value);
          }
        });
      }),
      map(() => void 0),
      catchError(() => of(void 0)),
    );
  }

  // =========================================================================
  // Convenience methods for common settings
  // =========================================================================

  /**
   * Get the last selected blog UUID
   */
  getLastBlogUuid(): Observable<string | null> {
    return this.get('lastBlogUuid');
  }

  /**
   * Set the last selected blog UUID (fire and forget)
   */
  setLastBlogUuid(uuid: string): void {
    this.setAsync('lastBlogUuid', uuid);
  }

  /**
   * Get the last selected podcast UUID
   */
  getLastPodcastUuid(): Observable<string | null> {
    return this.get('lastPodcastUuid');
  }

  /**
   * Set the last selected podcast UUID (fire and forget)
   */
  setLastPodcastUuid(uuid: string): void {
    this.setAsync('lastPodcastUuid', uuid);
  }

  /**
   * Get the last selected pulse config UUID
   */
  getLastPulseConfigUuid(): Observable<string | null> {
    return this.get('lastPulseConfigUuid');
  }

  /**
   * Set the last selected pulse config UUID (fire and forget)
   */
  setLastPulseConfigUuid(uuid: string): void {
    this.setAsync('lastPulseConfigUuid', uuid);
  }

  /**
   * Get the last selected social account UUID
   */
  getLastSocialAccountUuid(): Observable<string | null> {
    return this.get('lastSocialAccountUuid');
  }

  /**
   * Set the last selected social account UUID (fire and forget)
   */
  setLastSocialAccountUuid(uuid: string): void {
    this.setAsync('lastSocialAccountUuid', uuid);
  }

  /**
   * Get the last selected team UUID
   */
  getLastTeamUuid(): Observable<string | null> {
    return this.get('lastTeamUuid');
  }

  /**
   * Set the last selected team UUID (fire and forget)
   */
  setLastTeamUuid(uuid: string): void {
    this.setAsync('lastTeamUuid', uuid);
  }

  // =========================================================================
  // LocalStorage helpers (fallback for logged-out users)
  // =========================================================================

  private getFromLocalStorage<K extends UserSettingKey>(key: K): UserSettingsSchema[K] | null {
    try {
      const value = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
      return value as UserSettingsSchema[K] | null;
    } catch {
      return null;
    }
  }

  private saveToLocalStorage(key: string, value: string): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_PREFIX + key, value);
    } catch {
      // localStorage full or unavailable
    }
  }

  private removeFromLocalStorage(key: string): void {
    try {
      localStorage.removeItem(LOCAL_STORAGE_PREFIX + key);
    } catch {
      // Ignore
    }
  }
}
