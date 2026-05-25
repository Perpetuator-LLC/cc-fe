// Copyright (c) 2025-2026 Perpetuator LLC
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of, Subject, throwError } from 'rxjs';
import { signal, WritableSignal } from '@angular/core';
import {
  iconForJob,
  Job,
  JobKind,
  JobService,
  JobStatus,
  kindToString,
  statusToString,
  stringToJobKind,
  stringToJobStatus,
} from './job.service';
import { JobsWebSocketService } from './jobs-websocket.service';
import { MessageService } from '../message.service';
import { ErrorHandlerService } from '../utils/error-handler.service';

function makeJob(over: Partial<Job> = {}): Job {
  return {
    id: '1',
    uuid: 'job-1',
    kind: 'CREATE_EPISODE',
    status: 'PENDING',
    error: '',
    result: null,
    args: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

function relayWrap(jobs: Job[]) {
  return {
    data: {
      jobs: {
        edges: jobs.map((node) => ({ node, cursor: node.uuid })),
        pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
      },
    },
  };
}

describe('stringToJobKind', () => {
  it('returns matching enum value for every defined kind', () => {
    expect(stringToJobKind('CREATE_EPISODE')).toBe(JobKind.CREATE_EPISODE);
    expect(stringToJobKind('GENERATE_PODCAST')).toBe(JobKind.GENERATE_PODCAST);
    expect(stringToJobKind('FETCH_NEWS')).toBe(JobKind.FETCH_NEWS);
    expect(stringToJobKind('TEST_PRINT')).toBe(JobKind.TEST_PRINT);
    expect(stringToJobKind('SCHEDULE_JOB')).toBe(JobKind.SCHEDULE_JOB);
    expect(stringToJobKind('FETCH_STOCK_PRICES')).toBe(JobKind.FETCH_STOCK_PRICES);
    expect(stringToJobKind('RESEARCH_TOPIC')).toBe(JobKind.RESEARCH_TOPIC);
    expect(stringToJobKind('GENERATE_PULSE')).toBe(JobKind.GENERATE_PULSE);
    expect(stringToJobKind('CREATE_RECORDING')).toBe(JobKind.CREATE_RECORDING);
    expect(stringToJobKind('GENERATE_ARTICLE_FROM_EPISODE')).toBe(JobKind.GENERATE_ARTICLE_FROM_EPISODE);
  });

  it('is case-insensitive', () => {
    expect(stringToJobKind('create_episode')).toBe(JobKind.CREATE_EPISODE);
    expect(stringToJobKind('Generate_Podcast')).toBe(JobKind.GENERATE_PODCAST);
  });

  it('falls back to UNKNOWN and warns for unrecognized strings', () => {
    spyOn(console, 'warn');
    expect(stringToJobKind('not-real')).toBe(JobKind.UNKNOWN);
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('kindToString', () => {
  it('returns the friendly name for known kinds', () => {
    expect(kindToString('CREATE_EPISODE')).toBe('Create Episode');
    expect(kindToString('GENERATE_PODCAST')).toBe('Generate Podcast');
    expect(kindToString('FETCH_NEWS')).toBe('Fetch News');
    expect(kindToString('SCHEDULE_JOB')).toBe('Schedule Job');
    expect(kindToString('GENERATE_ARTICLE_FROM_SOURCE')).toBe('Generate Article');
    expect(kindToString('UNKNOWN')).toBe('Processing');
  });

  it('falls back to N/A for unrecognized values (default branch)', () => {
    // Note: kindToString switches on the *uppercased input string*, not on
    // stringToJobKind output, so '' falls through to default ('N/A').
    expect(kindToString('')).toBe('N/A');
    expect(kindToString('not-a-real-kind')).toBe('N/A');
  });
});

describe('iconForJob', () => {
  it('returns matching icon names', () => {
    expect(iconForJob('CREATE_EPISODE')).toBe('mic');
    expect(iconForJob('GENERATE_PODCAST')).toBe('auto_awesome');
    expect(iconForJob('FETCH_NEWS')).toBe('cloud_download');
    expect(iconForJob('SCHEDULE_JOB')).toBe('schedule');
    expect(iconForJob('PUBLISH_PULSE_CHAIN')).toBe('rocket_launch');
    expect(iconForJob('TEST_PRINT')).toBe('print');
    expect(iconForJob('UNKNOWN')).toBe('help_outline');
    expect(iconForJob('GENERATE_ARTICLE_FROM_SOURCE')).toBe('article');
  });
});

describe('stringToJobStatus / statusToString', () => {
  it('round-trips known statuses', () => {
    expect(stringToJobStatus('PENDING')).toBe(JobStatus.PENDING);
    expect(stringToJobStatus('RUNNING')).toBe(JobStatus.RUNNING);
    expect(stringToJobStatus('COMPLETED')).toBe(JobStatus.COMPLETED);
    expect(stringToJobStatus('FAILED')).toBe(JobStatus.FAILED);
    // Lowercase
    expect(stringToJobStatus('completed')).toBe(JobStatus.COMPLETED);
  });

  it('throws on unknown status', () => {
    expect(() => stringToJobStatus('NOT_A_STATUS')).toThrowError(/Invalid job status/);
  });

  it('statusToString labels known statuses', () => {
    expect(statusToString('PENDING')).toBe('Pending');
    expect(statusToString('RUNNING')).toBe('Running');
    expect(statusToString('COMPLETED')).toBe('Completed');
    expect(statusToString('FAILED')).toBe('Failed');
    expect(statusToString('unknown-thing')).toBe('N/A');
  });
});

describe('JobService', () => {
  let service: JobService;
  let apollo: jasmine.SpyObj<Apollo>;
  let wsService: {
    jobs: WritableSignal<Job[]>;
    addJob: jasmine.Spy;
    addJobs: jasmine.Spy;
    jobCompleted$: Subject<Job>;
    jobFailed$: Subject<Job>;
  };
  let messageService: jasmine.SpyObj<MessageService>;
  let errorHandler: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    jasmine.clock().install();
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query', 'mutate']);
    apollo.query.and.returnValue(of(relayWrap([]) as any));
    apollo.mutate.and.returnValue(of({ data: {} } as any));
    wsService = {
      jobs: signal<Job[]>([]),
      addJob: jasmine.createSpy('addJob'),
      addJobs: jasmine.createSpy('addJobs'),
      jobCompleted$: new Subject<Job>(),
      jobFailed$: new Subject<Job>(),
    };
    messageService = jasmine.createSpyObj<MessageService>('MessageService', ['error', 'success']);
    errorHandler = jasmine.createSpyObj<ErrorHandlerService>('ErrorHandlerService', ['handleError']);
    errorHandler.handleError.and.callFake((err) => throwError(() => err));

    TestBed.configureTestingModule({
      providers: [
        JobService,
        { provide: Apollo, useValue: apollo },
        { provide: JobsWebSocketService, useValue: wsService },
        { provide: MessageService, useValue: messageService },
        { provide: ErrorHandlerService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(JobService);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    service.ngOnDestroy();
  });

  it('is created and exposes the websocket-backed jobs signal', () => {
    expect(service).toBeTruthy();
    expect(service.jobs()).toEqual([]);
  });

  describe('addJob / addJobs delegation', () => {
    it('forwards single job to the websocket service', () => {
      const job = makeJob();
      service.addJob(job);
      expect(wsService.addJob).toHaveBeenCalledWith(job);
    });

    it('forwards job arrays to the websocket service', () => {
      const jobs = [makeJob(), makeJob({ uuid: 'job-2' })];
      service.addJobs(jobs);
      expect(wsService.addJobs).toHaveBeenCalledWith(jobs);
    });
  });

  describe('jobCompleted$ / jobFailed$ pass-through', () => {
    it('exposes the websocket service subjects', (done) => {
      let completedSeen = 0;
      let failedSeen = 0;
      const sub1 = service.jobCompleted$.subscribe(() => completedSeen++);
      const sub2 = service.jobFailed$.subscribe(() => failedSeen++);
      wsService.jobCompleted$.next(makeJob({ status: 'COMPLETED' }));
      wsService.jobFailed$.next(makeJob({ status: 'FAILED' }));
      Promise.resolve().then(() => {
        expect(completedSeen).toBe(1);
        expect(failedSeen).toBe(1);
        sub1.unsubscribe();
        sub2.unsubscribe();
        done();
      });
    });
  });

  describe('getJobTransitions', () => {
    it('returns jobs that newly entered the target status', () => {
      const prev = [makeJob({ uuid: 'a', status: 'RUNNING' }), makeJob({ uuid: 'b', status: 'COMPLETED' })];
      const next = [makeJob({ uuid: 'a', status: 'COMPLETED' }), makeJob({ uuid: 'b', status: 'COMPLETED' })];
      const transitions = service.getJobTransitions(next, prev, 'COMPLETED');
      expect(transitions.map((j) => j.uuid)).toEqual(['a']);
    });

    it('ignores jobs missing from the previous list', () => {
      const next = [makeJob({ uuid: 'a', status: 'COMPLETED' })];
      expect(service.getJobTransitions(next, [], 'COMPLETED')).toEqual([]);
    });

    it('returns [] when no statuses changed', () => {
      const same = [makeJob({ uuid: 'a', status: 'RUNNING' })];
      expect(service.getJobTransitions(same, same, 'COMPLETED')).toEqual([]);
    });
  });

  describe('cleanupOldJobs (timer-driven)', () => {
    it('drops COMPLETED jobs older than 5s but keeps newer ones', () => {
      const now = Date.now();
      const stale = makeJob({
        uuid: 'old',
        status: 'COMPLETED',
        updatedAt: new Date(now - 10_000).toISOString(),
      });
      const fresh = makeJob({
        uuid: 'fresh',
        status: 'COMPLETED',
        updatedAt: new Date(now - 1_000).toISOString(),
      });
      // Drive the signal via the websocket service (its observable feeds the signal)
      wsService.jobs.set([stale, fresh]);
      // Tick to let the constructor's toObservable subscription propagate
      jasmine.clock().tick(0);
      // Cleanup loop fires every 5s
      jasmine.clock().tick(5_000);
      expect(service.jobs().map((j) => j.uuid)).toEqual(['fresh']);
    });

    it('keeps FAILED jobs for up to 15s', () => {
      const now = Date.now();
      const stale = makeJob({
        uuid: 'old',
        status: 'FAILED',
        updatedAt: new Date(now - 20_000).toISOString(),
      });
      const fresh = makeJob({
        uuid: 'fresh',
        status: 'FAILED',
        updatedAt: new Date(now - 5_000).toISOString(),
      });
      wsService.jobs.set([stale, fresh]);
      jasmine.clock().tick(0);
      jasmine.clock().tick(5_000);
      expect(service.jobs().map((j) => j.uuid)).toEqual(['fresh']);
    });

    it('keeps RUNNING jobs indefinitely', () => {
      const now = Date.now();
      const running = makeJob({
        uuid: 'r',
        status: 'RUNNING',
        updatedAt: new Date(now - 60_000).toISOString(),
      });
      wsService.jobs.set([running]);
      jasmine.clock().tick(0);
      jasmine.clock().tick(5_000);
      expect(service.jobs().map((j) => j.uuid)).toEqual(['r']);
    });
  });

  describe('getJobs (Apollo)', () => {
    it('passes filters and unwraps the relay connection', (done) => {
      const list = [makeJob({ uuid: 'j1' }), makeJob({ uuid: 'j2' })];
      apollo.query.and.returnValue(of(relayWrap(list) as any));
      service.getJobs(['COMPLETED'], ['CREATE_EPISODE'], [], 5, null, 'createdAt', 'DESC').subscribe((result) => {
        expect(result.jobs.map((j) => j.uuid)).toEqual(['j1', 'j2']);
        const vars = (apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
        expect(vars['statuses']).toEqual(['COMPLETED']);
        expect(vars['first']).toBe(5);
        expect(vars['orderBy']).toBe('-createdAt');
        done();
      });
    });

    it('flips orderBy prefix when ASC', (done) => {
      apollo.query.and.returnValue(of(relayWrap([]) as any));
      service.getJobs([], [], [], 10, null, 'updatedAt', 'ASC').subscribe(() => {
        const vars = (apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
        expect(vars['orderBy']).toBe('updatedAt');
        done();
      });
    });
  });

  describe('getJobsGrouped (Apollo)', () => {
    it('returns the array and passes nullable filters', (done) => {
      const list = [makeJob()];
      apollo.query.and.returnValue(of({ data: { jobsGrouped: list } } as any));
      service.getJobsGrouped(3, ['COMPLETED'], []).subscribe((result) => {
        expect(result).toEqual(list);
        const vars = (apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
        expect(vars['firstTopLevel']).toBe(3);
        expect(vars['statuses']).toEqual(['COMPLETED']);
        // Empty array -> null
        expect(vars['kinds']).toBeNull();
        done();
      });
    });

    it('sends null for both filters when both are empty', (done) => {
      apollo.query.and.returnValue(of({ data: { jobsGrouped: [] } } as any));
      service.getJobsGrouped().subscribe(() => {
        const vars = (apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
        expect(vars['statuses']).toBeNull();
        expect(vars['kinds']).toBeNull();
        done();
      });
    });
  });

  describe('retryJobs / deleteJobs', () => {
    it('retryJobs unwraps response on success', (done) => {
      apollo.mutate.and.returnValue(
        of({ data: { retryJobs: { success: true, message: 'ok', jobs: [makeJob()] } } } as any),
      );
      service.retryJobs(['j1']).subscribe((result) => {
        expect(result.success).toBeTrue();
        expect(result.jobs.length).toBe(1);
        done();
      });
    });

    it('retryJobs throws on failure', (done) => {
      apollo.mutate.and.returnValue(of({ data: { retryJobs: { success: false, message: 'no' } } } as any));
      service.retryJobs(['j1']).subscribe({
        next: () => fail('should have errored'),
        error: (err) => {
          expect(err.message).toBe('no');
          done();
        },
      });
    });

    it('deleteJobs unwraps response on success', (done) => {
      apollo.mutate.and.returnValue(of({ data: { deleteJobs: { success: true, message: 'gone' } } } as any));
      service.deleteJobs(['j1']).subscribe((result) => {
        expect(result.success).toBeTrue();
        done();
      });
    });

    it('deleteJobs throws on failure', (done) => {
      apollo.mutate.and.returnValue(of({ data: { deleteJobs: { success: false, message: 'no' } } } as any));
      service.deleteJobs(['j1']).subscribe({
        next: () => fail('should have errored'),
        error: (err) => {
          expect(err.message).toBe('no');
          done();
        },
      });
    });
  });
});
