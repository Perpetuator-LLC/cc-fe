// Copyright (c) 2026 Perpetuator LLC
import { Schedule, ScheduleType, SolarEvent } from '../../scheduling.service';
import {
  cronDayToSelectedDays,
  cronToTime,
  detectDayPattern,
  formatScheduleDescription,
  friendlyToSchedule,
  getDaysForPattern,
  getFriendlyScheduleType,
  getJobKindIcon,
  getJobKindLabel,
  getJobTypesForContext,
  getNextRunDisplay,
  getUserTimezone,
  parseTime,
  scheduleToFriendly,
  selectedDaysToCron,
} from './schedule.utils';
import { FRIENDLY_JOB_TYPES, FriendlyScheduleInput } from './schedule.types';

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    uuid: 'sched-1',
    name: 'Test schedule',
    jobKind: 'PUBLISH_PULSE_CHAIN',
    enabled: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getUserTimezone', () => {
  it('returns the Intl resolved timezone', () => {
    expect(getUserTimezone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });
});

describe('getJobTypesForContext', () => {
  it('returns all job types for the "all" context', () => {
    expect(getJobTypesForContext('all')).toEqual(FRIENDLY_JOB_TYPES);
  });

  it('filters job types by context', () => {
    expect(getJobTypesForContext('podcast').every((jt) => jt.context === 'podcast')).toBeTrue();
    expect(getJobTypesForContext('pulse').map((jt) => jt.value)).toEqual(['PUBLISH_PULSE_CHAIN']);
    expect(getJobTypesForContext('episode').map((jt) => jt.value)).toEqual(['PUBLISH_EPISODE_AUDIO']);
  });
});

describe('getJobKindLabel', () => {
  it('returns the friendly label for a known job kind', () => {
    expect(getJobKindLabel('PUBLISH_PULSE_CHAIN')).toBe('Generate Pulse Recording');
  });

  it('title-cases unknown job kinds', () => {
    expect(getJobKindLabel('MY_CUSTOM_JOB')).toBe('My Custom Job');
  });
});

describe('getJobKindIcon', () => {
  it('returns the icon for a known job kind', () => {
    expect(getJobKindIcon('PUBLISH_EPISODE_AUDIO')).toBe('publish');
  });

  it('falls back to the schedule icon for unknown kinds', () => {
    expect(getJobKindIcon('MY_CUSTOM_JOB')).toBe('schedule');
  });
});

describe('getFriendlyScheduleType', () => {
  it('maps CLOCKED to one-time and everything else to recurring', () => {
    expect(getFriendlyScheduleType(makeSchedule({ scheduleType: ScheduleType.CLOCKED }))).toBe('one-time');
    expect(getFriendlyScheduleType(makeSchedule({ scheduleType: ScheduleType.CRONTAB }))).toBe('recurring');
    expect(getFriendlyScheduleType(makeSchedule({ scheduleType: ScheduleType.INTERVAL }))).toBe('recurring');
  });
});

describe('cronDayToSelectedDays', () => {
  it('returns all days for "*" or empty input', () => {
    expect(cronDayToSelectedDays('*')).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(cronDayToSelectedDays('')).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('maps the 1-5 range to weekdays', () => {
    expect(cronDayToSelectedDays('1-5')).toEqual([0, 1, 2, 3, 4]);
  });

  it('maps 0,6 to the weekend', () => {
    expect(cronDayToSelectedDays('0,6')).toEqual([5, 6]);
  });

  it('converts individual cron days (0=Sun) to UI days (0=Mon)', () => {
    expect(cronDayToSelectedDays('1,3,5')).toEqual([0, 2, 4]);
    expect(cronDayToSelectedDays('0')).toEqual([6]);
  });
});

describe('selectedDaysToCron', () => {
  it('returns "*" when all days are selected', () => {
    expect(selectedDaysToCron([0, 1, 2, 3, 4, 5, 6])).toBe('*');
  });

  it('converts UI days (0=Mon) to sorted cron days (0=Sun)', () => {
    expect(selectedDaysToCron([0, 1, 2, 3, 4])).toBe('1,2,3,4,5');
    expect(selectedDaysToCron([5, 6])).toBe('0,6');
    expect(selectedDaysToCron([6])).toBe('0');
  });
});

describe('detectDayPattern', () => {
  it('detects daily, weekdays, weekends and custom patterns', () => {
    expect(detectDayPattern([0, 1, 2, 3, 4, 5, 6])).toBe('daily');
    expect(detectDayPattern([4, 2, 0, 1, 3])).toBe('weekdays');
    expect(detectDayPattern([5, 6])).toBe('weekends');
    expect(detectDayPattern([0, 5])).toBe('custom');
    expect(detectDayPattern([])).toBe('custom');
  });
});

describe('getDaysForPattern', () => {
  it('returns the day set for each pattern', () => {
    expect(getDaysForPattern('daily')).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(getDaysForPattern('weekdays')).toEqual([0, 1, 2, 3, 4]);
    expect(getDaysForPattern('weekends')).toEqual([5, 6]);
    expect(getDaysForPattern('custom')).toEqual([]);
  });
});

describe('cronToTime', () => {
  it('zero-pads hour and minute', () => {
    expect(cronToTime('9', '5')).toBe('09:05');
    expect(cronToTime('14', '30')).toBe('14:30');
  });

  it('falls back to 09:00 for non-numeric values', () => {
    expect(cronToTime('abc', '0')).toBe('09:00');
    expect(cronToTime('9', 'xyz')).toBe('09:00');
  });
});

describe('parseTime', () => {
  it('parses HH:mm strings', () => {
    expect(parseTime('14:30')).toEqual({ hour: 14, minute: 30 });
    expect(parseTime('09:05')).toEqual({ hour: 9, minute: 5 });
  });

  it('defaults missing pieces to zero', () => {
    expect(parseTime('7')).toEqual({ hour: 7, minute: 0 });
    expect(parseTime('')).toEqual({ hour: 0, minute: 0 });
  });
});

describe('formatScheduleDescription', () => {
  it('formats INTERVAL schedules with hours and minutes', () => {
    expect(formatScheduleDescription(makeSchedule({ scheduleType: ScheduleType.INTERVAL, interval: 3900 }))).toBe(
      'Generate Pulse Recording every 1h 5m',
    );
    expect(formatScheduleDescription(makeSchedule({ scheduleType: ScheduleType.INTERVAL, interval: 300 }))).toBe(
      'Generate Pulse Recording every 5m',
    );
    expect(formatScheduleDescription(makeSchedule({ scheduleType: ScheduleType.INTERVAL }))).toBe(
      'Generate Pulse Recording every 0m',
    );
  });

  it('formats CRONTAB schedules for daily, weekdays, weekends and custom days', () => {
    const base = { scheduleType: ScheduleType.CRONTAB, cronHour: '8', cronMinute: '15' };
    expect(formatScheduleDescription(makeSchedule({ ...base, cronDayOfWeek: '*' }))).toBe(
      'Generate Pulse Recording at 08:15 on daily',
    );
    expect(formatScheduleDescription(makeSchedule({ ...base, cronDayOfWeek: '1-5' }))).toBe(
      'Generate Pulse Recording at 08:15 on weekdays',
    );
    expect(formatScheduleDescription(makeSchedule({ ...base, cronDayOfWeek: '0,6' }))).toBe(
      'Generate Pulse Recording at 08:15 on weekends',
    );
    expect(formatScheduleDescription(makeSchedule({ ...base, cronDayOfWeek: '1,3' }))).toBe(
      'Generate Pulse Recording at 08:15 on Mon, Wed',
    );
  });

  it('appends the cron timezone when present', () => {
    const desc = formatScheduleDescription(
      makeSchedule({
        scheduleType: ScheduleType.CRONTAB,
        cronHour: '8',
        cronMinute: '0',
        cronDayOfWeek: '*',
        cronTimezone: 'UTC',
      }),
    );
    expect(desc).toBe('Generate Pulse Recording at 08:00 on daily (UTC)');
  });

  it('uses 09:00 defaults for CRONTAB schedules missing hour/minute', () => {
    expect(formatScheduleDescription(makeSchedule({ scheduleType: ScheduleType.CRONTAB }))).toBe(
      'Generate Pulse Recording at 09:00 on daily',
    );
  });

  it('formats CLOCKED schedules with the local date and time', () => {
    const iso = '2026-03-15T14:30:00Z';
    const date = new Date(iso);
    const expected = `Generate Pulse Recording on ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    expect(formatScheduleDescription(makeSchedule({ scheduleType: ScheduleType.CLOCKED, clockedTime: iso }))).toBe(
      expected,
    );
  });

  it('labels CLOCKED schedules without a time as one-time', () => {
    expect(formatScheduleDescription(makeSchedule({ scheduleType: ScheduleType.CLOCKED }))).toBe(
      'Generate Pulse Recording (one-time)',
    );
  });

  it('formats SOLAR schedules with the solar event', () => {
    expect(
      formatScheduleDescription(makeSchedule({ scheduleType: ScheduleType.SOLAR, solarEvent: SolarEvent.SUNRISE })),
    ).toBe('Generate Pulse Recording at sunrise');
  });

  it('falls back to the schedule name (or Unknown schedule) without a type', () => {
    expect(formatScheduleDescription(makeSchedule())).toBe('Test schedule');
    expect(formatScheduleDescription(makeSchedule({ name: '' }))).toBe('Unknown schedule');
  });
});

describe('friendlyToSchedule', () => {
  function makeInput(overrides: Partial<FriendlyScheduleInput> = {}): FriendlyScheduleInput {
    return {
      name: 'My schedule',
      jobKind: 'PUBLISH_PULSE_CHAIN',
      scheduleType: 'recurring',
      timezone: '',
      enabled: true,
      ...overrides,
    };
  }

  it('maps one-time input to a CLOCKED schedule', () => {
    const result = friendlyToSchedule(
      makeInput({ scheduleType: 'one-time', scheduledDateTime: '2026-03-15T14:30:00Z' }),
    );
    expect(result.scheduleType).toBe(ScheduleType.CLOCKED);
    expect(result.clockedTime).toBe('2026-03-15T14:30:00Z');
    expect(result.cronHour).toBeUndefined();
  });

  it('maps recurring input with a day pattern to a CRONTAB schedule', () => {
    const result = friendlyToSchedule(makeInput({ dayPattern: 'weekdays', time: '08:15' }));
    expect(result.scheduleType).toBe(ScheduleType.CRONTAB);
    expect(result.cronHour).toBe('8');
    expect(result.cronMinute).toBe('15');
    expect(result.cronDayOfWeek).toBe('1,2,3,4,5');
    expect(result.cronDayOfMonth).toBe('*');
    expect(result.cronMonthOfYear).toBe('*');
  });

  it('uses selectedDays for the custom day pattern and defaults time to 09:00', () => {
    const result = friendlyToSchedule(makeInput({ dayPattern: 'custom', selectedDays: [0, 6] }));
    expect(result.cronDayOfWeek).toBe('0,1');
    expect(result.cronHour).toBe('9');
    expect(result.cronMinute).toBe('0');
  });

  it('stores entity UUIDs and timezone as snake_case args', () => {
    const result = friendlyToSchedule(
      makeInput({
        podcastUuid: 'pod-1',
        pulseConfigUuid: 'pc-1',
        episodeUuid: 'ep-1',
        episodeName: 'Episode One',
        timezone: 'UTC',
      }),
    );
    expect(result.args).toEqual({
      podcast_uuid: 'pod-1',
      pulse_config_uuid: 'pc-1',
      episode_uuid: 'ep-1',
      episode_name: 'Episode One',
      timezone: 'UTC',
    });
  });

  it('always includes args, even when empty', () => {
    expect(friendlyToSchedule(makeInput()).args).toEqual({});
  });
});

describe('scheduleToFriendly', () => {
  it('maps CLOCKED schedules to one-time input', () => {
    const input = scheduleToFriendly(
      makeSchedule({ scheduleType: ScheduleType.CLOCKED, clockedTime: '2026-03-15T14:30:00Z' }),
    );
    expect(input.scheduleType).toBe('one-time');
    expect(input.scheduledDateTime).toBe('2026-03-15T14:30:00Z');
  });

  it('maps CRONTAB schedules to recurring input with time, days and pattern', () => {
    const input = scheduleToFriendly(
      makeSchedule({ scheduleType: ScheduleType.CRONTAB, cronHour: '8', cronMinute: '15', cronDayOfWeek: '1-5' }),
    );
    expect(input.scheduleType).toBe('recurring');
    expect(input.time).toBe('08:15');
    expect(input.selectedDays).toEqual([0, 1, 2, 3, 4]);
    expect(input.dayPattern).toBe('weekdays');
  });

  it('prefers cronTimezone, then args timezone, then the user timezone', () => {
    expect(scheduleToFriendly(makeSchedule({ cronTimezone: 'UTC', args: { timezone: 'Asia/Tokyo' } })).timezone).toBe(
      'UTC',
    );
    expect(scheduleToFriendly(makeSchedule({ args: { timezone: 'Asia/Tokyo' } })).timezone).toBe('Asia/Tokyo');
    expect(scheduleToFriendly(makeSchedule()).timezone).toBe(getUserTimezone());
  });

  it('extracts entity UUIDs from snake_case args', () => {
    const input = scheduleToFriendly(makeSchedule({ args: { podcast_uuid: 'pod-1', pulse_config_uuid: 'pc-1' } }));
    expect(input.podcastUuid).toBe('pod-1');
    expect(input.pulseConfigUuid).toBe('pc-1');
  });
});

describe('getNextRunDisplay', () => {
  it('shows date and time for future CLOCKED schedules', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const display = getNextRunDisplay(makeSchedule({ scheduleType: ScheduleType.CLOCKED, clockedTime: future }));
    expect(display).toContain(' at ');
  });

  it('shows Completed for past or missing CLOCKED times', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(getNextRunDisplay(makeSchedule({ scheduleType: ScheduleType.CLOCKED, clockedTime: past }))).toBe(
      'Completed',
    );
    expect(getNextRunDisplay(makeSchedule({ scheduleType: ScheduleType.CLOCKED }))).toBe('Completed');
  });

  it('shows the next time for CRONTAB schedules (with defaults)', () => {
    expect(
      getNextRunDisplay(makeSchedule({ scheduleType: ScheduleType.CRONTAB, cronHour: '8', cronMinute: '15' })),
    ).toBe('Next at 08:15');
    expect(getNextRunDisplay(makeSchedule({ scheduleType: ScheduleType.CRONTAB }))).toBe('Next at 09:00');
  });

  it('shows N/A for other schedule types', () => {
    expect(getNextRunDisplay(makeSchedule({ scheduleType: ScheduleType.INTERVAL }))).toBe('N/A');
  });
});
