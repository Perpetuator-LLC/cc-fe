// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable } from '@angular/core';
import { gql } from 'apollo-angular';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import { RelayConnection } from './utils/relay';
import { parseScheduleArgs } from './utils/schedule';

export enum ScheduleType {
  INTERVAL = 'INTERVAL',
  CRONTAB = 'CRONTAB',
  CLOCKED = 'CLOCKED',
  SOLAR = 'SOLAR',
}

export enum SolarEvent {
  SUNRISE = 'sunrise',
  SUNSET = 'sunset',
}

export interface Schedule {
  uuid: string;
  name: string;
  jobKind: string;
  scheduleType?: ScheduleType;
  interval?: number;
  cronHour?: string;
  cronMinute?: string;
  cronDayOfWeek?: string;
  cronDayOfMonth?: string;
  cronMonthOfYear?: string;
  cronTimezone?: string;
  clockedTime?: string;
  solarEvent?: SolarEvent;
  solarLatitude?: number;
  solarLongitude?: number;
  args?: Record<string, unknown>;
  kwargs?: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const GET_SCHEDULES = gql`
  query GetSchedules {
    schedules {
      edges {
        node {
          uuid
          name
          jobKind
          scheduleType
          interval
          cronHour
          cronMinute
          cronDayOfWeek
          cronDayOfMonth
          cronMonthOfYear
          cronTimezone
          clockedTime
          solarEvent
          solarLatitude
          solarLongitude
          args
          kwargs
          enabled
          createdAt
          updatedAt
        }
      }
    }
  }
`;

const CREATE_SCHEDULE = gql`
  mutation CreateSchedule(
    $name: String!
    $jobKind: JobKind!
    $scheduleType: ScheduleKind
    $interval: Int
    $cronHour: String
    $cronMinute: String
    $cronDayOfWeek: String
    $cronDayOfMonth: String
    $cronMonthOfYear: String
    $clockedTime: DateTime
    $solarEvent: String
    $solarLatitude: Float
    $solarLongitude: Float
    $args: GenericScalar
    $enabled: Boolean!
  ) {
    createSchedule(
      name: $name
      jobKind: $jobKind
      scheduleType: $scheduleType
      interval: $interval
      cronHour: $cronHour
      cronMinute: $cronMinute
      cronDayOfWeek: $cronDayOfWeek
      cronDayOfMonth: $cronDayOfMonth
      cronMonthOfYear: $cronMonthOfYear
      clockedTime: $clockedTime
      solarEvent: $solarEvent
      solarLatitude: $solarLatitude
      solarLongitude: $solarLongitude
      args: $args
      enabled: $enabled
    ) {
      success
      message
      schedule {
        uuid
        name
        jobKind
        scheduleType
        interval
        cronHour
        cronMinute
        cronDayOfWeek
        cronDayOfMonth
        cronMonthOfYear
        clockedTime
        solarEvent
        solarLatitude
        solarLongitude
        args
        kwargs
        enabled
        createdAt
        updatedAt
      }
    }
  }
`;

const UPDATE_SCHEDULE = gql`
  mutation UpdateSchedule(
    $scheduleUuid: UUID!
    $name: String
    $jobKind: JobKind
    $scheduleType: ScheduleKind
    $interval: Int
    $cronHour: String
    $cronMinute: String
    $cronDayOfWeek: String
    $cronDayOfMonth: String
    $cronMonthOfYear: String
    $clockedTime: DateTime
    $solarEvent: String
    $solarLatitude: Float
    $solarLongitude: Float
    $args: GenericScalar
    $enabled: Boolean
  ) {
    updateSchedule(
      scheduleUuid: $scheduleUuid
      name: $name
      jobKind: $jobKind
      scheduleType: $scheduleType
      interval: $interval
      cronHour: $cronHour
      cronMinute: $cronMinute
      cronDayOfWeek: $cronDayOfWeek
      cronDayOfMonth: $cronDayOfMonth
      cronMonthOfYear: $cronMonthOfYear
      clockedTime: $clockedTime
      solarEvent: $solarEvent
      solarLatitude: $solarLatitude
      solarLongitude: $solarLongitude
      args: $args
      enabled: $enabled
    ) {
      success
      message
      schedule {
        uuid
        name
        jobKind
        scheduleType
        interval
        cronHour
        cronMinute
        cronDayOfWeek
        cronDayOfMonth
        cronMonthOfYear
        cronTimezone
        clockedTime
        solarEvent
        solarLatitude
        solarLongitude
        args
        kwargs
        enabled
        createdAt
        updatedAt
      }
    }
  }
`;

const DELETE_SCHEDULE = gql`
  mutation DeleteSchedule($scheduleUuid: UUID!) {
    deleteSchedule(scheduleUuid: $scheduleUuid) {
      success
      message
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class SchedulingService extends BaseService {
  getSchedules(filters?: { podcastUuid?: string; pulseConfigUuid?: string; episodeUuid?: string }) {
    interface Response {
      schedules: RelayConnection<Schedule>;
    }

    return this.query<Response>({
      query: GET_SCHEDULES,
      fetchPolicy: 'network-only',
    }).pipe(
      map(({ schedules }) => {
        let filteredSchedules = schedules.edges.map((edge) => edge.node);

        // Client-side filtering if filters provided
        if (filters) {
          if (filters.podcastUuid) {
            filteredSchedules = filteredSchedules.filter((s) => {
              const args = s.args as Record<string, unknown> | undefined;
              return args?.['podcast_uuid'] === filters.podcastUuid;
            });
          }
          if (filters.pulseConfigUuid) {
            filteredSchedules = filteredSchedules.filter((s) => {
              const args = s.args as Record<string, unknown> | undefined;
              return args?.['pulse_config_uuid'] === filters.pulseConfigUuid;
            });
          }
          if (filters.episodeUuid) {
            filteredSchedules = filteredSchedules.filter((s) => {
              const args = s.args as Record<string, unknown> | undefined;
              return args?.['episode_uuid'] === filters.episodeUuid;
            });
          }
        }

        return {
          schedules: filteredSchedules,
          pageInfo: schedules.pageInfo,
        };
      }),
    );
  }

  createSchedule(schedule: Partial<Schedule>) {
    interface Response {
      createSchedule: {
        success: boolean;
        message: string;
        schedule: Schedule;
      };
    }

    return this.mutate<Response>({
      mutation: CREATE_SCHEDULE,
      variables: {
        name: schedule.name,
        jobKind: schedule.jobKind,
        scheduleType: schedule.scheduleType,
        interval: schedule.interval,
        cronHour: schedule.cronHour,
        cronMinute: schedule.cronMinute,
        cronDayOfWeek: schedule.cronDayOfWeek,
        cronDayOfMonth: schedule.cronDayOfMonth,
        cronMonthOfYear: schedule.cronMonthOfYear,
        clockedTime: schedule.clockedTime,
        solarEvent: schedule.solarEvent,
        solarLatitude: schedule.solarLatitude,
        solarLongitude: schedule.solarLongitude,
        args: schedule.args ?? {},
        enabled: schedule.enabled ?? true,
      },
    }).pipe(
      map((data) => {
        if (!data.createSchedule.success) {
          throw new Error(data.createSchedule.message);
        }
        return data.createSchedule;
      }),
    );
  }

  updateSchedule(scheduleUuid: string, schedule: Partial<Schedule>) {
    interface Response {
      updateSchedule: {
        success: boolean;
        message: string;
        schedule: Schedule;
      };
    }

    // Build variables object, only including fields that are explicitly provided
    // This prevents clearing args when just toggling enabled status
    const variables: Record<string, unknown> = { scheduleUuid };

    if (schedule.name !== undefined) variables['name'] = schedule.name;
    if (schedule.jobKind !== undefined) variables['jobKind'] = schedule.jobKind;
    if (schedule.scheduleType !== undefined) variables['scheduleType'] = schedule.scheduleType;
    if (schedule.interval !== undefined) variables['interval'] = schedule.interval;
    if (schedule.cronHour !== undefined) variables['cronHour'] = schedule.cronHour;
    if (schedule.cronMinute !== undefined) variables['cronMinute'] = schedule.cronMinute;
    if (schedule.cronDayOfWeek !== undefined) variables['cronDayOfWeek'] = schedule.cronDayOfWeek;
    if (schedule.cronDayOfMonth !== undefined) variables['cronDayOfMonth'] = schedule.cronDayOfMonth;
    if (schedule.cronMonthOfYear !== undefined) variables['cronMonthOfYear'] = schedule.cronMonthOfYear;
    if (schedule.cronTimezone !== undefined) variables['cronTimezone'] = schedule.cronTimezone;
    if (schedule.clockedTime !== undefined) variables['clockedTime'] = schedule.clockedTime;
    if (schedule.solarEvent !== undefined) variables['solarEvent'] = schedule.solarEvent;
    if (schedule.solarLatitude !== undefined) variables['solarLatitude'] = schedule.solarLatitude;
    if (schedule.solarLongitude !== undefined) variables['solarLongitude'] = schedule.solarLongitude;
    if (schedule.args !== undefined) variables['args'] = schedule.args;
    if (schedule.enabled !== undefined) variables['enabled'] = schedule.enabled;

    return this.mutate<Response>({
      mutation: UPDATE_SCHEDULE,
      variables,
    }).pipe(
      map((data) => {
        if (!data.updateSchedule.success) {
          throw new Error(data.updateSchedule.message);
        }
        return data.updateSchedule;
      }),
    );
  }

  deleteSchedule(scheduleUuid: string) {
    interface Response {
      deleteSchedule: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: DELETE_SCHEDULE,
      variables: { scheduleUuid },
    }).pipe(
      map((data) => {
        if (!data.deleteSchedule.success) {
          throw new Error(data.deleteSchedule.message);
        }
        return data.deleteSchedule;
      }),
    );
  }

  getSchedulesForPodcast(podcastUuid: string) {
    console.debug('Fetching schedules for podcast', podcastUuid);
    // For now, return all schedules and filter client-side
    // In a real implementation, you might want to add episode-specific filtering
    return this.getSchedules().pipe(
      map(({ schedules }) =>
        schedules.filter((schedule) => {
          // Filter schedules that could apply to this episode's podcast
          const parsedArgs = parseScheduleArgs(schedule.args);
          return parsedArgs['podcastUuid'];
        }),
      ),
    );
  }

  savePodcastSchedules(podcastUuid: string, schedules: Schedule[]) {
    console.debug('Saving schedules for podcast', podcastUuid, schedules);
    // This is a placeholder - implement based on your backend requirements
    // interface Response {
    //   success: boolean;
    //   message: string;
    //   schedules: DynamicSchedule[];
    // }

    // Return a mock observable for now
    return this.getSchedules().pipe(
      map(() => ({
        success: true,
        message: 'Schedules saved successfully',
        schedules: [],
      })),
    );
  }
}
