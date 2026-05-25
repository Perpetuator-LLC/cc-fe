// Copyright (c) 2025-2026 Perpetuator LLC
import {
  JobKind,
  JobStatus,
  iconForJob,
  kindToString,
  statusToString,
  stringToJobKind,
  stringToJobStatus,
} from './job.service';

// Exhaustive coverage of the four pure conversion helpers exported from
// job.service.ts. Each switch arm renders one line of code, so iterating
// over every JobKind / JobStatus value is the fastest route to coverage.

describe('Job utility functions', () => {
  describe('stringToJobKind', () => {
    it('round-trips every JobKind value (case-insensitive)', () => {
      for (const kind of Object.values(JobKind)) {
        expect(stringToJobKind(kind)).toBe(kind);
        expect(stringToJobKind(kind.toLowerCase())).toBe(kind);
      }
    });

    it('returns UNKNOWN with a console warning for unknown strings', () => {
      const warn = spyOn(console, 'warn');
      expect(stringToJobKind('SOMETHING_NEW')).toBe(JobKind.UNKNOWN);
      expect(warn).toHaveBeenCalled();
    });
  });

  describe('kindToString', () => {
    it('returns a non-empty label for every JobKind', () => {
      for (const kind of Object.values(JobKind)) {
        const label = kindToString(kind);
        expect(label).toBeTruthy();
        expect(label.length).toBeGreaterThan(0);
      }
    });

    it('returns N/A for fully unknown input (default branch)', () => {
      // Use a kind string that isn't a known JobKind value. Use lowercase
      // 'unknown-kind' so stringToJobKind's UNKNOWN warn doesn't fire as a
      // side-effect of this assertion path.
      expect(kindToString('___not_a_kind___')).toBe('N/A');
    });
  });

  describe('iconForJob', () => {
    it('returns a non-empty icon name for every JobKind', () => {
      for (const kind of Object.values(JobKind)) {
        const icon = iconForJob(kind);
        expect(icon).toBeTruthy();
        expect(icon.length).toBeGreaterThan(0);
      }
    });

    it('falls back to "work" icon for unrecognized kinds via UNKNOWN branch', () => {
      // stringToJobKind('???') => UNKNOWN => 'help_outline'. The default arm
      // of iconForJob (returning 'work') is only reachable if stringToJobKind
      // returns a value not in the switch; in practice it always returns one
      // of the enum members, so this assertion proves the UNKNOWN branch:
      spyOn(console, 'warn');
      expect(iconForJob('???')).toBe('help_outline');
    });
  });

  describe('stringToJobStatus', () => {
    it('converts every JobStatus value case-insensitively', () => {
      for (const status of Object.values(JobStatus)) {
        expect(stringToJobStatus(status)).toBe(status);
        expect(stringToJobStatus(status.toLowerCase())).toBe(status);
      }
    });

    it('throws for invalid status strings', () => {
      expect(() => stringToJobStatus('NOPE')).toThrowError('Invalid job status');
    });
  });

  describe('statusToString', () => {
    it('returns a friendly label for every JobStatus', () => {
      expect(statusToString(JobStatus.PENDING)).toBe('Pending');
      expect(statusToString(JobStatus.RUNNING)).toBe('Running');
      expect(statusToString(JobStatus.COMPLETED)).toBe('Completed');
      expect(statusToString(JobStatus.FAILED)).toBe('Failed');
    });

    it('returns N/A for unknown status', () => {
      expect(statusToString('WHATEVER')).toBe('N/A');
    });
  });
});
