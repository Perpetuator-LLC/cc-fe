// Copyright (c) 2025-2026 Perpetuator LLC
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of, throwError } from 'rxjs';
import { Schedule, ScheduleType, SchedulingService, SolarEvent } from './scheduling.service';
import { ErrorHandlerService } from './utils/error-handler.service';

function makeSchedule(over: Partial<Schedule> = {}): Schedule {
  return {
    uuid: 'sch-1',
    name: 'My Schedule',
    jobKind: 'CREATE_EPISODE',
    scheduleType: ScheduleType.INTERVAL,
    interval: 60,
    enabled: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

function relayWrap(schedules: Schedule[]) {
  return {
    data: {
      schedules: {
        edges: schedules.map((node) => ({ node })),
        pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
      },
    },
  };
}

describe('SchedulingService', () => {
  let service: SchedulingService;
  let apollo: jasmine.SpyObj<Apollo>;

  beforeEach(() => {
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query', 'mutate']);
    apollo.query.and.returnValue(of(relayWrap([]) as any));
    apollo.mutate.and.returnValue(of({ data: {} } as any));
    // BaseService injects ErrorHandlerService, which transitively pulls
    // OAuthService — provide a stub so the DI graph resolves.
    const errorHandler = jasmine.createSpyObj<ErrorHandlerService>('ErrorHandlerService', ['handleError']);
    errorHandler.handleError.and.callFake((err) => throwError(() => err));
    TestBed.configureTestingModule({
      providers: [
        SchedulingService,
        { provide: Apollo, useValue: apollo },
        { provide: ErrorHandlerService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(SchedulingService);
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  describe('getSchedules', () => {
    it('returns unwrapped schedules list with pageInfo when no filters', (done) => {
      const list = [makeSchedule({ uuid: 'a' }), makeSchedule({ uuid: 'b' })];
      apollo.query.and.returnValue(of(relayWrap(list) as any));
      service.getSchedules().subscribe(({ schedules, pageInfo }) => {
        expect(schedules.map((s) => s.uuid)).toEqual(['a', 'b']);
        expect(pageInfo).toEqual(jasmine.objectContaining({ hasNextPage: false }));
        done();
      });
    });

    it('filters by podcastUuid when provided', (done) => {
      const list = [
        makeSchedule({ uuid: 'p1', args: { podcast_uuid: 'pod-A' } }),
        makeSchedule({ uuid: 'p2', args: { podcast_uuid: 'pod-B' } }),
      ];
      apollo.query.and.returnValue(of(relayWrap(list) as any));
      service.getSchedules({ podcastUuid: 'pod-B' }).subscribe(({ schedules }) => {
        expect(schedules.map((s) => s.uuid)).toEqual(['p2']);
        done();
      });
    });

    it('filters by pulseConfigUuid when provided', (done) => {
      const list = [
        makeSchedule({ uuid: 'c1', args: { pulse_config_uuid: 'pc-A' } }),
        makeSchedule({ uuid: 'c2', args: { pulse_config_uuid: 'pc-B' } }),
      ];
      apollo.query.and.returnValue(of(relayWrap(list) as any));
      service.getSchedules({ pulseConfigUuid: 'pc-A' }).subscribe(({ schedules }) => {
        expect(schedules.map((s) => s.uuid)).toEqual(['c1']);
        done();
      });
    });

    it('filters by episodeUuid when provided', (done) => {
      const list = [
        makeSchedule({ uuid: 'e1', args: { episode_uuid: 'ep-A' } }),
        makeSchedule({ uuid: 'e2', args: { episode_uuid: 'ep-B' } }),
      ];
      apollo.query.and.returnValue(of(relayWrap(list) as any));
      service.getSchedules({ episodeUuid: 'ep-A' }).subscribe(({ schedules }) => {
        expect(schedules.map((s) => s.uuid)).toEqual(['e1']);
        done();
      });
    });

    it('filters by all three together', (done) => {
      const list = [
        makeSchedule({
          uuid: 'all',
          args: { podcast_uuid: 'pod-A', pulse_config_uuid: 'pc-A', episode_uuid: 'ep-A' },
        }),
        makeSchedule({ uuid: 'only-pod', args: { podcast_uuid: 'pod-A' } }),
      ];
      apollo.query.and.returnValue(of(relayWrap(list) as any));
      service
        .getSchedules({ podcastUuid: 'pod-A', pulseConfigUuid: 'pc-A', episodeUuid: 'ep-A' })
        .subscribe(({ schedules }) => {
          expect(schedules.map((s) => s.uuid)).toEqual(['all']);
          done();
        });
    });
  });

  describe('createSchedule', () => {
    it('forwards all schedule fields as mutation variables and unwraps the success response', (done) => {
      const created = makeSchedule({ uuid: 'new', name: 'Created' });
      apollo.mutate.and.returnValue(
        of({ data: { createSchedule: { success: true, message: 'ok', schedule: created } } } as any),
      );
      const partial: Partial<Schedule> = {
        name: 'Created',
        jobKind: 'CREATE_EPISODE',
        scheduleType: ScheduleType.CRONTAB,
        cronHour: '12',
        cronMinute: '0',
        cronDayOfWeek: 'MON',
        cronDayOfMonth: '*',
        cronMonthOfYear: '*',
        args: { podcast_uuid: 'p1' },
      };
      service.createSchedule(partial).subscribe((res) => {
        expect(res.schedule).toEqual(created);
        const vars = (apollo.mutate.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
        expect(vars['name']).toBe('Created');
        expect(vars['jobKind']).toBe('CREATE_EPISODE');
        expect(vars['scheduleType']).toBe(ScheduleType.CRONTAB);
        expect(vars['cronHour']).toBe('12');
        expect(vars['args']).toEqual({ podcast_uuid: 'p1' });
        expect(vars['enabled']).toBeTrue(); // default
        done();
      });
    });

    it('throws when success is false', (done) => {
      apollo.mutate.and.returnValue(
        of({ data: { createSchedule: { success: false, message: 'nope', schedule: null } } } as any),
      );
      service.createSchedule({ name: 'X' }).subscribe({
        next: () => fail('should have errored'),
        error: (err) => {
          expect(err.message).toBe('nope');
          done();
        },
      });
    });

    it('defaults args to {} and enabled to true', (done) => {
      apollo.mutate.and.returnValue(
        of({
          data: {
            createSchedule: { success: true, message: 'ok', schedule: makeSchedule({ uuid: 'd' }) },
          },
        } as any),
      );
      service.createSchedule({ name: 'D' }).subscribe(() => {
        const vars = (apollo.mutate.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
        expect(vars['args']).toEqual({});
        expect(vars['enabled']).toBeTrue();
        done();
      });
    });
  });

  describe('updateSchedule', () => {
    it('only forwards explicitly-set fields (so undefined fields are skipped)', (done) => {
      apollo.mutate.and.returnValue(
        of({
          data: {
            updateSchedule: { success: true, message: 'ok', schedule: makeSchedule({ uuid: 'u1' }) },
          },
        } as any),
      );
      // Set scheduleType and solarEvent so all branches fire; leave others undefined.
      const update = { enabled: false, scheduleType: ScheduleType.SOLAR, solarEvent: SolarEvent.SUNRISE };
      service.updateSchedule('u1', update).subscribe(() => {
        const vars = (apollo.mutate.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
        expect(vars['scheduleUuid']).toBe('u1');
        expect(vars['enabled']).toBeFalse();
        expect(vars['scheduleType']).toBe(ScheduleType.SOLAR);
        expect(vars['solarEvent']).toBe(SolarEvent.SUNRISE);
        // Things we did not set should not be present
        expect(vars['cronHour']).toBeUndefined();
        expect(vars['interval']).toBeUndefined();
        done();
      });
    });

    it('forwards every cron + solar + clocked field when supplied', (done) => {
      apollo.mutate.and.returnValue(
        of({
          data: {
            updateSchedule: { success: true, message: 'ok', schedule: makeSchedule({ uuid: 'u2' }) },
          },
        } as any),
      );
      service
        .updateSchedule('u2', {
          name: 'N',
          jobKind: 'CREATE_EPISODE',
          scheduleType: ScheduleType.CRONTAB,
          interval: 60,
          cronHour: '1',
          cronMinute: '2',
          cronDayOfWeek: '3',
          cronDayOfMonth: '4',
          cronMonthOfYear: '5',
          cronTimezone: 'UTC',
          clockedTime: '2026-01-01T00:00:00Z',
          solarEvent: SolarEvent.SUNSET,
          solarLatitude: 40,
          solarLongitude: -70,
          args: { x: 1 },
          enabled: true,
        })
        .subscribe(() => {
          const vars = (apollo.mutate.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
          expect(vars['name']).toBe('N');
          expect(vars['cronHour']).toBe('1');
          expect(vars['cronMinute']).toBe('2');
          expect(vars['cronDayOfWeek']).toBe('3');
          expect(vars['cronDayOfMonth']).toBe('4');
          expect(vars['cronMonthOfYear']).toBe('5');
          expect(vars['cronTimezone']).toBe('UTC');
          expect(vars['clockedTime']).toBe('2026-01-01T00:00:00Z');
          expect(vars['solarLatitude']).toBe(40);
          expect(vars['solarLongitude']).toBe(-70);
          expect(vars['args']).toEqual({ x: 1 });
          done();
        });
    });

    it('throws when success is false', (done) => {
      apollo.mutate.and.returnValue(
        of({ data: { updateSchedule: { success: false, message: 'bad', schedule: null } } } as any),
      );
      service.updateSchedule('u', {}).subscribe({
        next: () => fail('should have errored'),
        error: (err) => {
          expect(err.message).toBe('bad');
          done();
        },
      });
    });
  });

  describe('deleteSchedule', () => {
    it('returns success on truthy response', (done) => {
      apollo.mutate.and.returnValue(of({ data: { deleteSchedule: { success: true, message: 'gone' } } } as any));
      service.deleteSchedule('x').subscribe((res) => {
        expect(res.success).toBeTrue();
        done();
      });
    });

    it('throws on falsy response', (done) => {
      apollo.mutate.and.returnValue(of({ data: { deleteSchedule: { success: false, message: 'still here' } } } as any));
      service.deleteSchedule('x').subscribe({
        next: () => fail('should have errored'),
        error: (err) => {
          expect(err.message).toBe('still here');
          done();
        },
      });
    });
  });

  describe('getSchedulesForPodcast', () => {
    it('filters to schedules whose parsed args include a podcastUuid', (done) => {
      const list = [
        makeSchedule({ uuid: 'p1', args: { podcast_uuid: 'X' } }),
        makeSchedule({ uuid: 'p2', args: { episode_uuid: 'E1' } }),
      ];
      apollo.query.and.returnValue(of(relayWrap(list) as any));
      service.getSchedulesForPodcast('X').subscribe((schedules) => {
        expect(schedules.map((s) => s.uuid)).toEqual(['p1']);
        done();
      });
    });
  });

  describe('savePodcastSchedules', () => {
    it('placeholder returns success envelope', (done) => {
      service.savePodcastSchedules('p', []).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.schedules).toEqual([]);
        done();
      });
    });
  });
});
