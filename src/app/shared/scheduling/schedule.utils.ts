// Copyright (c) 2026 Perpetuator LLC
import { Schedule, ScheduleType } from '../../scheduling.service';
import {
  DayOfWeek,
  DayPattern,
  DAYS_OF_WEEK,
  FriendlyJobType,
  FRIENDLY_JOB_TYPES,
  FriendlyScheduleInput,
  FriendlyScheduleType,
  ScheduleContext,
} from './schedule.types';
import { parseScheduleArgs } from '../../utils/schedule';

/**
 * Get user's current timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get friendly job types for a specific context
 */
export function getJobTypesForContext(context: ScheduleContext): FriendlyJobType[] {
  if (context === 'all') {
    return FRIENDLY_JOB_TYPES;
  }
  return FRIENDLY_JOB_TYPES.filter((jt) => jt.context === context);
}

/**
 * Get friendly label for a job kind
 */
export function getJobKindLabel(jobKind: string): string {
  const found = FRIENDLY_JOB_TYPES.find((jt) => jt.value === jobKind);
  return (
    found?.label ||
    jobKind
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Get icon for a job kind
 */
export function getJobKindIcon(jobKind: string): string {
  const found = FRIENDLY_JOB_TYPES.find((jt) => jt.value === jobKind);
  return found?.icon || 'schedule';
}

/**
 * Determine if a schedule is one-time or recurring
 */
export function getFriendlyScheduleType(schedule: Schedule): FriendlyScheduleType {
  return schedule.scheduleType === ScheduleType.CLOCKED ? 'one-time' : 'recurring';
}

/**
 * Convert cron day of week to array of selected days
 * Crontab: 0=Sunday, 6=Saturday
 * Our UI: 0=Monday, 6=Sunday
 */
export function cronDayToSelectedDays(cronDayOfWeek: string): DayOfWeek[] {
  if (!cronDayOfWeek || cronDayOfWeek === '*') {
    return [0, 1, 2, 3, 4, 5, 6]; // All days
  }

  // Handle ranges like '1-5' (Mon-Fri in crontab, but we need to convert)
  if (cronDayOfWeek === '1-5') {
    return [0, 1, 2, 3, 4]; // Mon-Fri in our format
  }
  if (cronDayOfWeek === '0,6') {
    return [5, 6]; // Sat-Sun in our format
  }

  // Parse individual days
  const cronDays = cronDayOfWeek.split(',').map((d) => parseInt(d.trim(), 10));
  // Convert cron (0=Sun, 1=Mon, ..., 6=Sat) to our format (0=Mon, ..., 6=Sun)
  return cronDays.map((d) => ((d + 6) % 7) as DayOfWeek);
}

/**
 * Convert selected days to cron format
 * Our UI: 0=Monday, 6=Sunday
 * Crontab: 0=Sunday, 6=Saturday
 */
export function selectedDaysToCron(days: DayOfWeek[]): string {
  if (days.length === 7) {
    return '*';
  }
  // Convert our format (0=Mon) to cron format (0=Sun, 1=Mon)
  const cronDays = days.map((d) => ((d + 1) % 7).toString());
  return cronDays.sort().join(',');
}

/**
 * Detect day pattern from selected days
 */
export function detectDayPattern(days: DayOfWeek[]): DayPattern {
  const sorted = [...days].sort();
  if (sorted.length === 7) return 'daily';
  if (sorted.length === 5 && sorted.every((d, i) => d === i)) return 'weekdays';
  if (sorted.length === 2 && sorted[0] === 5 && sorted[1] === 6) return 'weekends';
  return 'custom';
}

/**
 * Get days for a pattern
 */
export function getDaysForPattern(pattern: DayPattern): DayOfWeek[] {
  switch (pattern) {
    case 'daily':
      return [0, 1, 2, 3, 4, 5, 6];
    case 'weekdays':
      return [0, 1, 2, 3, 4];
    case 'weekends':
      return [5, 6];
    case 'custom':
    default:
      return [];
  }
}

/**
 * Format time from cron hour/minute
 */
export function cronToTime(cronHour: string, cronMinute: string): string {
  const hour = parseInt(cronHour, 10);
  const minute = parseInt(cronMinute, 10);
  if (isNaN(hour) || isNaN(minute)) return '09:00';
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Parse time string to hour/minute
 */
export function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h || 0, minute: m || 0 };
}

/**
 * Create a user-friendly description of a schedule
 */
export function formatScheduleDescription(schedule: Schedule): string {
  const jobLabel = getJobKindLabel(schedule.jobKind);

  switch (schedule.scheduleType) {
    case ScheduleType.INTERVAL: {
      const hours = Math.floor((schedule.interval || 0) / 3600);
      const minutes = Math.floor(((schedule.interval || 0) % 3600) / 60);
      const interval = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      return `${jobLabel} every ${interval}`;
    }

    case ScheduleType.CRONTAB: {
      const time = cronToTime(schedule.cronHour || '9', schedule.cronMinute || '0');
      const days = cronDayToSelectedDays(schedule.cronDayOfWeek || '*');
      const dayPattern = detectDayPattern(days);

      let dayStr: string;
      switch (dayPattern) {
        case 'daily':
          dayStr = 'daily';
          break;
        case 'weekdays':
          dayStr = 'weekdays';
          break;
        case 'weekends':
          dayStr = 'weekends';
          break;
        default:
          dayStr = days.map((d) => DAYS_OF_WEEK[d].short).join(', ');
      }

      // Use cronTimezone from schedule
      const tz = schedule.cronTimezone ? ` (${schedule.cronTimezone})` : '';
      return `${jobLabel} at ${time} on ${dayStr}${tz}`;
    }

    case ScheduleType.CLOCKED: {
      const date = schedule.clockedTime ? new Date(schedule.clockedTime) : null;
      if (date) {
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${jobLabel} on ${dateStr} at ${timeStr}`;
      }
      return `${jobLabel} (one-time)`;
    }

    case ScheduleType.SOLAR: {
      return `${jobLabel} at ${schedule.solarEvent}`;
    }

    default:
      return schedule.name || 'Unknown schedule';
  }
}

/**
 * Convert friendly schedule input to backend Schedule format
 */
export function friendlyToSchedule(input: FriendlyScheduleInput): Partial<Schedule> {
  const schedule: Partial<Schedule> = {
    name: input.name,
    jobKind: input.jobKind,
    enabled: input.enabled,
  };

  // Build args - only for entity UUIDs, not timezone
  const args: Record<string, unknown> = {};
  if (input.podcastUuid) args['podcast_uuid'] = input.podcastUuid;
  if (input.pulseConfigUuid) args['pulse_config_uuid'] = input.pulseConfigUuid;
  if (input.episodeUuid) args['episode_uuid'] = input.episodeUuid;
  if (input.episodeName) args['episode_name'] = input.episodeName;
  // Store timezone in args since cronTimezone isn't in createSchedule mutation yet
  if (input.timezone) args['timezone'] = input.timezone;

  // Always include args (even if empty) as backend may require it
  schedule.args = args;

  if (input.scheduleType === 'one-time') {
    schedule.scheduleType = ScheduleType.CLOCKED;
    schedule.clockedTime = input.scheduledDateTime;
  } else {
    schedule.scheduleType = ScheduleType.CRONTAB;

    const days = input.dayPattern === 'custom' ? input.selectedDays || [] : getDaysForPattern(input.dayPattern!);

    const { hour, minute } = parseTime(input.time || '09:00');

    schedule.cronHour = hour.toString();
    schedule.cronMinute = minute.toString();
    schedule.cronDayOfWeek = selectedDaysToCron(days);
    schedule.cronDayOfMonth = '*';
    schedule.cronMonthOfYear = '*';
    // Note: cronTimezone field is not supported in createSchedule yet
    // Timezone is stored in args for now
  }

  return schedule;
}

/**
 * Convert backend schedule to friendly input format
 */
export function scheduleToFriendly(schedule: Schedule): FriendlyScheduleInput {
  const parsedArgs = parseScheduleArgs(schedule.args);

  const input: FriendlyScheduleInput = {
    name: schedule.name,
    jobKind: schedule.jobKind,
    scheduleType: getFriendlyScheduleType(schedule),
    // Try cronTimezone field first, then args, then user default
    timezone: schedule.cronTimezone || (parsedArgs['timezone'] as string) || getUserTimezone(),
    enabled: schedule.enabled,
    podcastUuid: parsedArgs['podcastUuid'] as string | undefined,
    pulseConfigUuid: parsedArgs['pulseConfigUuid'] as string | undefined,
    episodeUuid: parsedArgs['episodeUuid'] as string | undefined,
  };

  if (schedule.scheduleType === ScheduleType.CLOCKED) {
    input.scheduledDateTime = schedule.clockedTime;
  } else if (schedule.scheduleType === ScheduleType.CRONTAB) {
    input.time = cronToTime(schedule.cronHour || '9', schedule.cronMinute || '0');
    input.selectedDays = cronDayToSelectedDays(schedule.cronDayOfWeek || '*');
    input.dayPattern = detectDayPattern(input.selectedDays);
  }

  return input;
}

/**
 * Get next run time display (approximate, for UI purposes)
 */
export function getNextRunDisplay(schedule: Schedule): string {
  if (schedule.scheduleType === ScheduleType.CLOCKED) {
    const date = schedule.clockedTime ? new Date(schedule.clockedTime) : null;
    if (date && date > new Date()) {
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return 'Completed';
  }

  // For recurring schedules, show the next occurrence time
  // This is an approximation - actual calculation would require considering timezone
  if (schedule.scheduleType === ScheduleType.CRONTAB) {
    const time = cronToTime(schedule.cronHour || '9', schedule.cronMinute || '0');
    return `Next at ${time}`;
  }

  return 'N/A';
}
