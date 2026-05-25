// Copyright (c) 2025-2026 Perpetuator LLC
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of, throwError } from 'rxjs';
import { ChartPreferences, ChartPreferencesService, DEFAULT_CHART_PREFERENCES } from './chart-preferences.service';

const STORAGE_KEY = 'cc_chart_settings';

function backendResponse(prefs: ChartPreferences) {
  return {
    data: {
      updateChartPreferences: {
        success: true,
        message: 'ok',
        preferences: prefs,
      },
    },
  };
}

describe('ChartPreferencesService', () => {
  let apollo: jasmine.SpyObj<Apollo>;

  function makeService(): ChartPreferencesService {
    TestBed.resetTestingModule();
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query', 'mutate']);
    apollo.query.and.returnValue(of({ data: { chartPreferences: DEFAULT_CHART_PREFERENCES } } as any));
    apollo.mutate.and.returnValue(of(backendResponse(DEFAULT_CHART_PREFERENCES) as any));
    TestBed.configureTestingModule({
      providers: [ChartPreferencesService, { provide: Apollo, useValue: apollo }],
    });
    return TestBed.inject(ChartPreferencesService);
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initialization', () => {
    it('starts from defaults when localStorage is empty', () => {
      const service = makeService();
      expect(service.preferences()).toEqual(DEFAULT_CHART_PREFERENCES);
      expect(service.loading()).toBeFalse();
    });

    it('hydrates from localStorage when present, merging with defaults', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ showExtendedHours: true }));
      const service = makeService();
      const prefs = service.preferences();
      expect(prefs.showExtendedHours).toBeTrue();
      // Other fields fall back to defaults
      expect(prefs.defaultInterval).toBe(DEFAULT_CHART_PREFERENCES.defaultInterval);
    });

    it('swallows malformed localStorage data and returns defaults', () => {
      localStorage.setItem(STORAGE_KEY, 'not-json{');
      spyOn(console, 'warn');
      const service = makeService();
      expect(service.preferences()).toEqual(DEFAULT_CHART_PREFERENCES);
    });
  });

  describe('loadPreferences', () => {
    it('hits the backend, updates signal, persists to localStorage, and short-circuits on second call', (done) => {
      const service = makeService();
      // makeService() resets the apollo spy. Override AFTER construction.
      const fromBackend: ChartPreferences = { ...DEFAULT_CHART_PREFERENCES, defaultInterval: 'weekly' };
      apollo.query.and.returnValue(of({ data: { chartPreferences: fromBackend } } as any));
      service.loadPreferences().subscribe((prefs) => {
        expect(prefs.defaultInterval).toBe('weekly');
        expect(service.preferences().defaultInterval).toBe('weekly');
        expect(localStorage.getItem(STORAGE_KEY)).toContain('weekly');
        // Second call should NOT re-query (loaded flag set)
        apollo.query.calls.reset();
        service.loadPreferences().subscribe((p2) => {
          expect(p2.defaultInterval).toBe('weekly');
          expect(apollo.query).not.toHaveBeenCalled();
          done();
        });
      });
    });

    it('falls back to localStorage when backend errors', (done) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_CHART_PREFERENCES, defaultInterval: '60min' }));
      const service = makeService();
      apollo.query.and.returnValue(throwError(() => new Error('boom')));
      spyOn(console, 'warn');
      service.loadPreferences().subscribe((prefs) => {
        expect(prefs.defaultInterval).toBe('60min');
        expect(service.loading()).toBeFalse();
        done();
      });
    });
  });

  describe('updatePreference', () => {
    it('optimistically updates signal + localStorage, then absorbs server response', (done) => {
      const service = makeService();
      const serverPrefs: ChartPreferences = { ...DEFAULT_CHART_PREFERENCES, showRawData: true };
      apollo.mutate.and.returnValue(of(backendResponse(serverPrefs) as any));
      service.updatePreference('showRawData', true).subscribe((p) => {
        expect(p.showRawData).toBeTrue();
        expect(service.preferences().showRawData).toBeTrue();
        expect(localStorage.getItem(STORAGE_KEY)).toContain('"showRawData":true');
        done();
      });
    });

    it('returns optimistic update when backend reports !success', (done) => {
      const service = makeService();
      apollo.mutate.and.returnValue(
        of({
          data: {
            updateChartPreferences: { success: false, message: 'no', preferences: DEFAULT_CHART_PREFERENCES },
          },
        } as any),
      );
      service.updatePreference('lockToRight', false).subscribe((p) => {
        expect(p.lockToRight).toBeFalse();
        done();
      });
    });

    it('returns the optimistic update when backend errors', (done) => {
      const service = makeService();
      apollo.mutate.and.returnValue(throwError(() => new Error('500')));
      spyOn(console, 'warn');
      service.updatePreference('lockToRight', false).subscribe((p) => {
        expect(p.lockToRight).toBeFalse();
        done();
      });
    });
  });

  describe('updatePreferences', () => {
    it('merges updates into signal and persists to backend + localStorage', (done) => {
      const service = makeService();
      const merged: ChartPreferences = {
        ...DEFAULT_CHART_PREFERENCES,
        useExchangeTime: false,
        defaultInterval: '5min',
      };
      apollo.mutate.and.returnValue(of(backendResponse(merged) as any));
      service.updatePreferences({ useExchangeTime: false, defaultInterval: '5min' }).subscribe((p) => {
        expect(p).toEqual(merged);
        expect(service.preferences()).toEqual(merged);
        done();
      });
    });

    it('returns optimistic merged value when backend !success', (done) => {
      const service = makeService();
      apollo.mutate.and.returnValue(
        of({
          data: {
            updateChartPreferences: { success: false, message: 'no', preferences: DEFAULT_CHART_PREFERENCES },
          },
        } as any),
      );
      service.updatePreferences({ defaultInterval: 'monthly' }).subscribe((p) => {
        expect(p.defaultInterval).toBe('monthly');
        done();
      });
    });

    it('returns optimistic merged value when backend errors', (done) => {
      const service = makeService();
      apollo.mutate.and.returnValue(throwError(() => new Error('500')));
      spyOn(console, 'warn');
      service.updatePreferences({ defaultInterval: 'monthly' }).subscribe((p) => {
        expect(p.defaultInterval).toBe('monthly');
        done();
      });
    });
  });

  describe('getPreference / resetToDefaults', () => {
    it('getPreference returns the current value for a key', () => {
      const service = makeService();
      expect(service.getPreference('defaultInterval')).toBe(DEFAULT_CHART_PREFERENCES.defaultInterval);
    });

    it('resetToDefaults delegates to updatePreferences', (done) => {
      const service = makeService();
      apollo.mutate.and.returnValue(of(backendResponse(DEFAULT_CHART_PREFERENCES) as any));
      service.resetToDefaults().subscribe((p) => {
        expect(p).toEqual(DEFAULT_CHART_PREFERENCES);
        done();
      });
    });
  });

  describe('localStorage save tolerates failure', () => {
    it('saveToLocalStorage swallows storage errors', (done) => {
      const service = makeService();
      // Have the backend echo back the optimistic update so the assertion
      // doesn't care which branch (server or fallback) we land in.
      const next: ChartPreferences = { ...DEFAULT_CHART_PREFERENCES, showExtendedHours: true };
      apollo.mutate.and.returnValue(of(backendResponse(next) as any));
      spyOn(Storage.prototype, 'setItem').and.throwError('quota');
      spyOn(console, 'warn');
      service.updatePreference('showExtendedHours', true).subscribe((p) => {
        expect(p.showExtendedHours).toBeTrue();
        done();
      });
    });
  });
});
