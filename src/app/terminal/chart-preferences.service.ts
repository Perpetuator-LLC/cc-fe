// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, signal } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, of, catchError, map, tap } from 'rxjs';

/**
 * Chart preferences that can be persisted per-user.
 * Synced with backend ChartPreference model.
 */
export interface ChartPreferences {
  showExtendedHours: boolean;
  adjustForDividends: boolean;
  showRawData: boolean;
  showCorporateActions: boolean;
  defaultInterval: string;
  lockToRight: boolean;
  useExchangeTime: boolean; // true = Exchange Time (ET), false = Local Time
}

/**
 * Default chart preferences used when no saved preferences exist.
 */
export const DEFAULT_CHART_PREFERENCES: ChartPreferences = {
  showExtendedHours: false,
  adjustForDividends: false,
  showRawData: false,
  showCorporateActions: true,
  defaultInterval: 'daily',
  lockToRight: true,
  useExchangeTime: true,
};

const GET_CHART_PREFERENCES = gql`
  query GetChartPreferences {
    chartPreferences {
      showExtendedHours
      adjustForDividends
      showRawData
      showCorporateActions
      defaultInterval
      lockToRight
      useExchangeTime
    }
  }
`;

const UPDATE_CHART_PREFERENCES = gql`
  mutation UpdateChartPreferences(
    $showExtendedHours: Boolean
    $adjustForDividends: Boolean
    $showRawData: Boolean
    $showCorporateActions: Boolean
    $defaultInterval: String
    $lockToRight: Boolean
    $useExchangeTime: Boolean
  ) {
    updateChartPreferences(
      showExtendedHours: $showExtendedHours
      adjustForDividends: $adjustForDividends
      showRawData: $showRawData
      showCorporateActions: $showCorporateActions
      defaultInterval: $defaultInterval
      lockToRight: $lockToRight
      useExchangeTime: $useExchangeTime
    ) {
      success
      message
      preferences {
        showExtendedHours
        adjustForDividends
        showRawData
        showCorporateActions
        defaultInterval
        lockToRight
        useExchangeTime
      }
    }
  }
`;

interface ChartPreferencesQueryResult {
  chartPreferences: ChartPreferences;
}

interface UpdateChartPreferencesResult {
  updateChartPreferences: {
    success: boolean;
    message: string;
    preferences: ChartPreferences;
  };
}

const STORAGE_KEY = 'cc_chart_settings';

/**
 * Service for managing user chart preferences.
 * Syncs with backend API and falls back to localStorage.
 */
@Injectable({
  providedIn: 'root',
})
export class ChartPreferencesService {
  // Current preferences (reactive) - initialized from localStorage for instant availability
  readonly preferences = signal<ChartPreferences>(this.loadFromLocalStorageSync());

  // Loading state
  readonly loading = signal(false);

  // Whether preferences have been loaded from backend
  private loaded = false;

  constructor(private apollo: Apollo) {
    // Log initial preferences
    console.log('[ChartPreferencesService] Initialized with:', this.preferences());
  }

  /**
   * Load preferences from localStorage synchronously.
   * Used for immediate initialization before backend is available.
   */
  private loadFromLocalStorageSync(): ChartPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new fields
        return { ...DEFAULT_CHART_PREFERENCES, ...parsed };
      }
    } catch (e) {
      console.warn('[ChartPreferencesService] Failed to load from localStorage:', e);
    }
    return DEFAULT_CHART_PREFERENCES;
  }

  /**
   * Load chart preferences from backend.
   * Falls back to localStorage if backend fails.
   * Returns observable of preferences.
   */
  loadPreferences(): Observable<ChartPreferences> {
    if (this.loaded) {
      return of(this.preferences());
    }

    this.loading.set(true);

    return this.apollo
      .query<ChartPreferencesQueryResult>({
        query: GET_CHART_PREFERENCES,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => result.data.chartPreferences),
        tap((prefs) => {
          console.log('[ChartPreferencesService] Loaded from backend:', prefs);
          this.preferences.set(prefs);
          this.loaded = true;
          this.loading.set(false);
          // Also save to localStorage as backup
          this.saveToLocalStorage(prefs);
        }),
        catchError((error) => {
          console.warn('[ChartPreferencesService] Backend failed, using localStorage:', error);
          const prefs = this.loadFromLocalStorage();
          this.preferences.set(prefs);
          this.loaded = true;
          this.loading.set(false);
          return of(prefs);
        }),
      );
  }

  /**
   * Update a single preference.
   * Saves to backend and localStorage.
   */
  updatePreference<K extends keyof ChartPreferences>(key: K, value: ChartPreferences[K]): Observable<ChartPreferences> {
    // Update local state immediately
    const updated = { ...this.preferences(), [key]: value };
    this.preferences.set(updated);

    // Save to localStorage immediately (fast feedback)
    this.saveToLocalStorage(updated);

    // Sync to backend
    return this.apollo
      .mutate<UpdateChartPreferencesResult>({
        mutation: UPDATE_CHART_PREFERENCES,
        variables: { [key]: value },
      })
      .pipe(
        map((result) => {
          if (result.data?.updateChartPreferences.success) {
            const prefs = result.data.updateChartPreferences.preferences;
            this.preferences.set(prefs);
            console.log('[ChartPreferencesService] Updated preference:', key, '=', value);
            return prefs;
          }
          return updated;
        }),
        catchError((error) => {
          console.warn('[ChartPreferencesService] Failed to sync to backend:', error);
          return of(updated);
        }),
      );
  }

  /**
   * Update multiple preferences at once.
   */
  updatePreferences(updates: Partial<ChartPreferences>): Observable<ChartPreferences> {
    // Update local state immediately
    const updated = { ...this.preferences(), ...updates };
    this.preferences.set(updated);

    // Save to localStorage immediately
    this.saveToLocalStorage(updated);

    // Sync to backend
    return this.apollo
      .mutate<UpdateChartPreferencesResult>({
        mutation: UPDATE_CHART_PREFERENCES,
        variables: updates,
      })
      .pipe(
        map((result) => {
          if (result.data?.updateChartPreferences.success) {
            const prefs = result.data.updateChartPreferences.preferences;
            this.preferences.set(prefs);
            console.log('[ChartPreferencesService] Updated preferences:', updates);
            return prefs;
          }
          return updated;
        }),
        catchError((error) => {
          console.warn('[ChartPreferencesService] Failed to sync to backend:', error);
          return of(updated);
        }),
      );
  }

  /**
   * Get a single preference value.
   */
  getPreference<K extends keyof ChartPreferences>(key: K): ChartPreferences[K] {
    return this.preferences()[key];
  }

  /**
   * Load preferences from localStorage (fallback).
   */
  private loadFromLocalStorage(): ChartPreferences {
    return this.loadFromLocalStorageSync();
  }

  /**
   * Save preferences to localStorage (backup).
   */
  private saveToLocalStorage(prefs: ChartPreferences): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('[ChartPreferencesService] Failed to save to localStorage:', e);
    }
  }

  /**
   * Reset preferences to defaults.
   */
  resetToDefaults(): Observable<ChartPreferences> {
    return this.updatePreferences(DEFAULT_CHART_PREFERENCES);
  }
}
