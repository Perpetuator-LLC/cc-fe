// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import { ErrorHandlerService } from './error-handler.service';
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

export interface DynamicSchedule {
  uuid: string;
  name: string;
  jobKind: string;
  scheduleType?: ScheduleType;
  interval?: number;
  cronHour?: string;
  cronMinute?: string;
  cronDayOfWeek?: string;
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

const GET_DYNAMIC_SCHEDULES = gql`
  query GetDynamicSchedules {
    dynamicSchedules {
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

const CREATE_DYNAMIC_SCHEDULE = gql`
  mutation CreateDynamicSchedule(
    $name: String!
    $jobKind: JobKind!
    $scheduleType: ScheduleTypeEnum
    $interval: Int!
    $cronHour: String
    $cronMinute: String
    $cronDayOfWeek: String
    $clockedTime: DateTime
    $solarEvent: String
    $solarLatitude: Float
    $solarLongitude: Float
    $args: GenericScalar
    $enabled: Boolean!
  ) {
    createDynamicSchedule(
      name: $name
      jobKind: $jobKind
      scheduleType: $scheduleType
      interval: $interval
      cronHour: $cronHour
      cronMinute: $cronMinute
      cronDayOfWeek: $cronDayOfWeek
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

const UPDATE_DYNAMIC_SCHEDULE = gql`
  mutation UpdateDynamicSchedule(
    $scheduleUuid: UUID!
    $name: String
    $jobKind: JobKind
    $scheduleType: ScheduleTypeEnum
    $interval: Int
    $cronHour: String
    $cronMinute: String
    $cronDayOfWeek: String
    $clockedTime: DateTime
    $solarEvent: String
    $solarLatitude: Float
    $solarLongitude: Float
    $args: GenericScalar
    $enabled: Boolean
  ) {
    updateDynamicSchedule(
      scheduleUuid: $scheduleUuid
      name: $name
      jobKind: $jobKind
      scheduleType: $scheduleType
      interval: $interval
      cronHour: $cronHour
      cronMinute: $cronMinute
      cronDayOfWeek: $cronDayOfWeek
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

const DELETE_DYNAMIC_SCHEDULE = gql`
  mutation DeleteDynamicSchedule($scheduleUuid: UUID!) {
    deleteDynamicSchedule(scheduleUuid: $scheduleUuid) {
      success
      message
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class SchedulingService extends BaseService {
  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
  ) {
    super(apollo, errorHandler);
  }

  getDynamicSchedules() {
    interface Response {
      dynamicSchedules: RelayConnection<DynamicSchedule>;
    }

    return this.query<Response>({
      query: GET_DYNAMIC_SCHEDULES,
      fetchPolicy: 'network-only',
    }).pipe(
      map(({ dynamicSchedules }) => ({
        schedules: dynamicSchedules.edges.map((edge) => edge.node),
        pageInfo: dynamicSchedules.pageInfo,
      })),
    );
  }

  createDynamicSchedule(schedule: Partial<DynamicSchedule>) {
    interface Response {
      createDynamicSchedule: {
        success: boolean;
        message: string;
        schedule: DynamicSchedule;
      };
    }

    return this.mutate<Response>({
      mutation: CREATE_DYNAMIC_SCHEDULE,
      variables: {
        name: schedule.name,
        jobKind: schedule.jobKind,
        scheduleType: schedule.scheduleType,
        interval: schedule.interval,
        cronHour: schedule.cronHour,
        cronMinute: schedule.cronMinute,
        cronDayOfWeek: schedule.cronDayOfWeek,
        clockedTime: schedule.clockedTime,
        solarEvent: schedule.solarEvent,
        solarLatitude: schedule.solarLatitude,
        solarLongitude: schedule.solarLongitude,
        args: schedule.args ? JSON.stringify(schedule.args) : null,
        enabled: schedule.enabled ?? true,
      },
    }).pipe(
      map((data) => {
        if (!data.createDynamicSchedule.success) {
          throw new Error(data.createDynamicSchedule.message);
        }
        return data.createDynamicSchedule;
      }),
    );
  }

  updateDynamicSchedule(scheduleUuid: string, schedule: Partial<DynamicSchedule>) {
    interface Response {
      updateDynamicSchedule: {
        success: boolean;
        message: string;
        schedule: DynamicSchedule;
      };
    }

    return this.mutate<Response>({
      mutation: UPDATE_DYNAMIC_SCHEDULE,
      variables: {
        scheduleUuid,
        name: schedule.name,
        jobKind: schedule.jobKind,
        scheduleType: schedule.scheduleType,
        interval: schedule.interval,
        cronHour: schedule.cronHour,
        cronMinute: schedule.cronMinute,
        cronDayOfWeek: schedule.cronDayOfWeek,
        clockedTime: schedule.clockedTime,
        solarEvent: schedule.solarEvent,
        solarLatitude: schedule.solarLatitude,
        solarLongitude: schedule.solarLongitude,
        args: schedule.args ? JSON.stringify(schedule.args) : null,
        enabled: schedule.enabled,
      },
    }).pipe(
      map((data) => {
        if (!data.updateDynamicSchedule.success) {
          throw new Error(data.updateDynamicSchedule.message);
        }
        return data.updateDynamicSchedule;
      }),
    );
  }

  deleteDynamicSchedule(scheduleUuid: string) {
    interface Response {
      deleteDynamicSchedule: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: DELETE_DYNAMIC_SCHEDULE,
      variables: { scheduleUuid },
    }).pipe(
      map((data) => {
        if (!data.deleteDynamicSchedule.success) {
          throw new Error(data.deleteDynamicSchedule.message);
        }
        return data.deleteDynamicSchedule;
      }),
    );
  }

  getSchedulesForPodcast(podcastUuid: string) {
    console.debug('Fetching schedules for podcast', podcastUuid);
    // For now, return all schedules and filter client-side
    // In a real implementation, you might want to add episode-specific filtering
    return this.getDynamicSchedules().pipe(
      map(({ schedules }) =>
        schedules.filter((schedule) => {
          // Filter schedules that could apply to this episode's podcast
          const parsedArgs = parseScheduleArgs(schedule.args);
          return parsedArgs['podcast_uuid'];
        }),
      ),
    );
  }

  savePodcastSchedules(podcastUuid: string, schedules: DynamicSchedule[]) {
    console.debug('Saving schedules for podcast', podcastUuid, schedules);
    // This is a placeholder - implement based on your backend requirements
    // interface Response {
    //   success: boolean;
    //   message: string;
    //   schedules: DynamicSchedule[];
    // }

    // Return a mock observable for now
    return this.getDynamicSchedules().pipe(
      map(() => ({
        success: true,
        message: 'Schedules saved successfully',
        schedules: [],
      })),
    );
  }
}
