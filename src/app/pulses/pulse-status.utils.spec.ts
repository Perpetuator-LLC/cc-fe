// Copyright (c) 2026 Perpetuator LLC
import { Pulse } from './pulses.types';
import {
  formatSeconds,
  formatTimeAgo,
  getDisplayStatusText,
  getPulseStatusDisplay,
  getStatusClass,
} from './pulse-status.utils';

function makePulse(overrides: Partial<Pulse> = {}): Pulse {
  return {
    uuid: 'pulse-1',
    title: 'Test pulse',
    transcript: '',
    summary: '',
    audioUrl: '',
    audioDurationSeconds: 0,
    wordCount: 0,
    status: 'READY',
    validatedCompliance: true,
    validatedFacts: true,
    validatedLength: true,
    isValidated: true,
    isScheduled: false,
    configName: 'Config',
    deliveryMethod: 'in_app',
    playCount: 0,
    listenDurationSeconds: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

describe('getPulseStatusDisplay', () => {
  it('shows Queued for fresh PENDING pulses', () => {
    const display = getPulseStatusDisplay(makePulse({ status: 'PENDING', createdAt: minutesAgo(1) }));
    expect(display).toEqual({ label: 'Queued', cssClass: 'status-warning' });
  });

  it('shows Queued (delayed) for PENDING pulses older than 5 minutes', () => {
    const display = getPulseStatusDisplay(makePulse({ status: 'PENDING', createdAt: minutesAgo(6) }));
    expect(display).toEqual({ label: 'Queued (delayed)', cssClass: 'status-warning' });
  });

  it('shows Generating for fresh GENERATING pulses', () => {
    const display = getPulseStatusDisplay(makePulse({ status: 'GENERATING', generatingStartedAt: minutesAgo(1) }));
    expect(display).toEqual({ label: 'Generating...', cssClass: 'status-warning' });
  });

  it('shows Generating (slow) when generation runs past 7 minutes', () => {
    const display = getPulseStatusDisplay(makePulse({ status: 'GENERATING', generatingStartedAt: minutesAgo(8) }));
    expect(display).toEqual({ label: 'Generating (slow)', cssClass: 'status-warning' });
  });

  it('returns null for GENERATING without a start time and for terminal statuses', () => {
    expect(getPulseStatusDisplay(makePulse({ status: 'GENERATING', generatingStartedAt: null }))).toBeNull();
    expect(getPulseStatusDisplay(makePulse({ status: 'READY' }))).toBeNull();
    expect(getPulseStatusDisplay(makePulse({ status: 'FAILED' }))).toBeNull();
  });
});

describe('getStatusClass', () => {
  it('maps statuses to badge classes', () => {
    expect(getStatusClass('READY')).toBe('status-success');
    expect(getStatusClass('DELIVERED')).toBe('status-success');
    expect(getStatusClass('GENERATING')).toBe('status-warning');
    expect(getStatusClass('PENDING')).toBe('status-warning');
    expect(getStatusClass('FAILED')).toBe('status-error');
    expect(getStatusClass('SOMETHING_ELSE')).toBe('');
  });

  it('is case-insensitive', () => {
    expect(getStatusClass('ready')).toBe('status-success');
  });

  it('prefers the time-aware display class when a pulse is provided', () => {
    const pending = makePulse({ status: 'PENDING', createdAt: minutesAgo(1) });
    expect(getStatusClass(pending.status, pending)).toBe('status-warning');
  });

  it('falls back to the plain status when the pulse has no special display', () => {
    const ready = makePulse({ status: 'READY' });
    expect(getStatusClass(ready.status, ready)).toBe('status-success');
  });
});

describe('getDisplayStatusText', () => {
  it('uses the time-aware label when available', () => {
    expect(getDisplayStatusText(makePulse({ status: 'PENDING', createdAt: minutesAgo(1) }))).toBe('Queued');
  });

  it('title-cases the raw status otherwise', () => {
    expect(getDisplayStatusText(makePulse({ status: 'READY' }))).toBe('Ready');
    expect(getDisplayStatusText(makePulse({ status: 'FAILED' }))).toBe('Failed');
  });
});

describe('formatSeconds', () => {
  it('formats null, undefined and zero as 0:00', () => {
    expect(formatSeconds(null)).toBe('0:00');
    expect(formatSeconds(undefined)).toBe('0:00');
    expect(formatSeconds(0)).toBe('0:00');
  });

  it('formats seconds as M:SS', () => {
    expect(formatSeconds(59)).toBe('0:59');
    expect(formatSeconds(65)).toBe('1:05');
    expect(formatSeconds(600)).toBe('10:00');
    expect(formatSeconds(61.9)).toBe('1:01');
  });
});

describe('formatTimeAgo', () => {
  it('returns Never for missing dates', () => {
    expect(formatTimeAgo(null)).toBe('Never');
    expect(formatTimeAgo(undefined)).toBe('Never');
    expect(formatTimeAgo('')).toBe('Never');
  });

  it('formats minutes, hours and days ago', () => {
    expect(formatTimeAgo(minutesAgo(5))).toBe('5m ago');
    expect(formatTimeAgo(minutesAgo(2 * 60))).toBe('2h ago');
    expect(formatTimeAgo(minutesAgo(3 * 24 * 60))).toBe('3d ago');
  });

  it('falls back to the locale date past 7 days', () => {
    const tenDaysAgo = minutesAgo(10 * 24 * 60);
    expect(formatTimeAgo(tenDaysAgo)).toBe(new Date(tenDaysAgo).toLocaleDateString());
  });
});
