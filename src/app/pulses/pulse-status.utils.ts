// Copyright (c) 2026 Perpetuator LLC
import { Pulse, PulseStatus } from './pulses.types';

export interface PulseStatusDisplay {
  label: string;
  cssClass: string;
}

/**
 * Determine display status for a pulse based on status + elapsed time.
 * Backend cleanup marks stale pulses FAILED after 10 min.
 * Frontend shows warnings before that threshold.
 */
export function getPulseStatusDisplay(pulse: Pulse): PulseStatusDisplay | null {
  if (pulse.status === 'PENDING') {
    const age = Date.now() - new Date(pulse.createdAt).getTime();
    if (age > 5 * 60 * 1000) {
      return { label: 'Queued (delayed)', cssClass: 'status-warning' };
    }
    return { label: 'Queued', cssClass: 'status-warning' };
  }
  if (pulse.status === 'GENERATING' && pulse.generatingStartedAt) {
    const age = Date.now() - new Date(pulse.generatingStartedAt).getTime();
    if (age > 7 * 60 * 1000) {
      return { label: 'Generating (slow)', cssClass: 'status-warning' };
    }
    return { label: 'Generating...', cssClass: 'status-warning' };
  }
  return null;
}

/** Get CSS class for a pulse status badge. */
export function getStatusClass(status: PulseStatus | string, pulse?: Pulse): string {
  if (pulse) {
    const display = getPulseStatusDisplay(pulse);
    if (display) return display.cssClass;
  }
  switch (status?.toString().toUpperCase()) {
    case 'READY':
    case 'DELIVERED':
      return 'status-success';
    case 'GENERATING':
    case 'PENDING':
      return 'status-warning';
    case 'FAILED':
      return 'status-error';
    default:
      return '';
  }
}

/** Get display text for a pulse status. */
export function getDisplayStatusText(pulse: Pulse): string {
  const display = getPulseStatusDisplay(pulse);
  if (display) return display.label;
  return pulse.status.charAt(0) + pulse.status.slice(1).toLowerCase();
}

/** Format seconds as M:SS string. */
export function formatSeconds(seconds: number | null | undefined): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Format a date string as relative time (e.g. "5m ago", "2d ago"). */
export function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
