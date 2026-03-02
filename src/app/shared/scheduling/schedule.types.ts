// Copyright (c) 2026 Perpetuator LLC

/**
 * User-friendly schedule type (hides technical crontab/interval/clocked)
 */
export type FriendlyScheduleType = 'recurring' | 'one-time';

/**
 * Day of week as number (0 = Monday, 6 = Sunday for crontab compatibility)
 * Note: Crontab uses 0 = Sunday, but we store as 0 = Monday internally for UX
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Pre-defined day patterns for quick selection
 */
export type DayPattern = 'daily' | 'weekdays' | 'weekends' | 'custom';

/**
 * Schedule context - what entity this schedule is for
 */
export type ScheduleContext = 'podcast' | 'pulse' | 'episode' | 'all';

/**
 * User-friendly job type mapping
 */
export interface FriendlyJobType {
  value: string; // The actual JobKind enum value
  label: string; // User-friendly label
  description: string; // Explanation of what this job does
  context: ScheduleContext; // Which context this job applies to
  icon: string; // Material icon name
}

/**
 * Mapping of job kinds to user-friendly labels
 */
export const FRIENDLY_JOB_TYPES: FriendlyJobType[] = [
  {
    value: 'PUBLISH_LATEST_EPISODE_CHAIN',
    label: 'Publish Daily News Episode',
    description: 'Generate and publish a new episode from the latest news',
    context: 'podcast',
    icon: 'newspaper',
  },
  {
    value: 'PUBLISH_RESEARCH_TOPIC_EPISODE_CHAIN',
    label: 'Publish Research Episode',
    description: 'Generate and publish an episode from research topics',
    context: 'podcast',
    icon: 'science',
  },
  {
    value: 'PUBLISH_PULSE_CHAIN',
    label: 'Generate Pulse Recording',
    description: 'Generate a pulse audio recording and notify via email/SMS',
    context: 'pulse',
    icon: 'graphic_eq',
  },
  {
    value: 'PUBLISH_EPISODE_AUDIO',
    label: 'Release Episode',
    description: 'Make a draft episode live at the scheduled time',
    context: 'episode',
    icon: 'publish',
  },
];

/**
 * Days of the week for display
 */
export const DAYS_OF_WEEK = [
  { value: 0, short: 'Mon', long: 'Monday' },
  { value: 1, short: 'Tue', long: 'Tuesday' },
  { value: 2, short: 'Wed', long: 'Wednesday' },
  { value: 3, short: 'Thu', long: 'Thursday' },
  { value: 4, short: 'Fri', long: 'Friday' },
  { value: 5, short: 'Sat', long: 'Saturday' },
  { value: 6, short: 'Sun', long: 'Sunday' },
] as const;

/**
 * Common timezones for quick selection
 */
export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'UTC', label: 'UTC / GMT' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
] as const;

/**
 * Input for the friendly schedule form
 */
export interface FriendlyScheduleInput {
  name: string;
  jobKind: string;
  scheduleType: FriendlyScheduleType;

  // For recurring schedules
  dayPattern?: DayPattern;
  selectedDays?: DayOfWeek[];
  time?: string; // HH:mm format

  // For one-time schedules
  scheduledDateTime?: string; // ISO date-time

  // Common
  timezone: string;
  enabled: boolean;

  // Context-specific args
  podcastUuid?: string;
  pulseConfigUuid?: string;
  episodeUuid?: string;
  episodeName?: string; // For display in schedule list
}

/**
 * Schedule filter options for the list component
 */
export interface ScheduleFilter {
  podcastUuid?: string;
  pulseConfigUuid?: string;
  episodeUuid?: string;
  context?: ScheduleContext;
}
