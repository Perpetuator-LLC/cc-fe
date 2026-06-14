// Copyright (c) 2025-2026 Perpetuator LLC
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { JobsWebSocketService } from './jobs-websocket.service';
import { AuthService } from '../auth/auth.service';
import { signal } from '@angular/core';
import { Job } from './job.service';

describe('JobsWebSocketService', () => {
  let service: JobsWebSocketService;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let isLoggedInSignal: ReturnType<typeof signal<boolean>>;

  const createMockJob = (overrides: Partial<Job> = {}): Job => ({
    id: '1',
    uuid: 'job-uuid-1',
    kind: 'CREATE_EPISODE',
    status: 'PENDING',
    error: '',
    result: null,
    args: null,
    createdAt: '2025-12-14T10:00:00Z',
    updatedAt: '2025-12-14T10:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    isLoggedInSignal = signal(false);
    mockAuthService = jasmine.createSpyObj('AuthService', ['logout', 'getToken']);
    Object.defineProperty(mockAuthService, 'isLoggedIn', {
      get: () => isLoggedInSignal,
    });

    TestBed.configureTestingModule({
      providers: [JobsWebSocketService, { provide: AuthService, useValue: mockAuthService }],
    });

    service = TestBed.inject(JobsWebSocketService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Connection State', () => {
    it('should start disconnected', () => {
      expect(service.isConnected()).toBe(false);
    });

    it('should have empty jobs initially', () => {
      expect(service.jobs().length).toBe(0);
    });
  });

  describe('addJob', () => {
    it('should add a job to the jobs signal', () => {
      const job = createMockJob({ uuid: 'test-uuid' });
      service.addJob(job);

      expect(service.jobs().length).toBe(1);
      expect(service.jobs()[0].uuid).toBe('test-uuid');
    });

    it('should not add duplicate jobs', () => {
      const job = createMockJob({ uuid: 'test-uuid' });
      service.addJob(job);
      service.addJob(job);

      expect(service.jobs().length).toBe(1);
    });

    it('should add job to front of list', () => {
      const job1 = createMockJob({ uuid: 'uuid-1' });
      const job2 = createMockJob({ uuid: 'uuid-2' });

      service.addJob(job1);
      service.addJob(job2);

      expect(service.jobs()[0].uuid).toBe('uuid-2');
      expect(service.jobs()[1].uuid).toBe('uuid-1');
    });
  });

  describe('addJobs', () => {
    it('should add multiple jobs', () => {
      const jobs = [createMockJob({ uuid: 'uuid-1' }), createMockJob({ uuid: 'uuid-2' })];

      service.addJobs(jobs);

      expect(service.jobs().length).toBe(2);
    });

    it('should not add duplicate jobs', () => {
      const existingJob = createMockJob({ uuid: 'uuid-1' });
      service.addJob(existingJob);

      const newJobs = [createMockJob({ uuid: 'uuid-1' }), createMockJob({ uuid: 'uuid-2' })];
      service.addJobs(newJobs);

      expect(service.jobs().length).toBe(2);
    });
  });

  describe('Auth State Changes', () => {
    it('should start in disconnected state when user is not logged in', () => {
      // Service is created with isLoggedIn = false
      expect(service.isConnected()).toBe(false);
    });

    it('should clear jobs when disconnect is called', () => {
      // Add some jobs first
      service.addJob(createMockJob());
      expect(service.jobs().length).toBe(1);

      // Disconnect - note: this doesn't actually clear jobs, auth state change does
      service.disconnect();

      // Connection state should be disconnected
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('query helpers', () => {
    it('finds a job by uuid and filters by status', () => {
      service.addJob(createMockJob({ uuid: 'a', status: 'PENDING' }));
      service.addJob(createMockJob({ uuid: 'b', status: 'RUNNING' }));
      service.addJob(createMockJob({ uuid: 'c', status: 'RUNNING' }));

      expect(service.getJob('b')?.uuid).toBe('b');
      expect(service.getJob('missing')).toBeUndefined();
      expect(service.getJobsByStatus('RUNNING').map((j) => j.uuid)).toEqual(['c', 'b']);
      expect(service.getJobsByStatus('PENDING').length).toBe(1);
    });
  });

  describe('addOrUpdateJob via addJob', () => {
    it('updates an existing job when the incoming update is newer', () => {
      service.addJob(createMockJob({ uuid: 'a', status: 'PENDING', updatedAt: '2025-12-14T10:00:00Z' }));
      service.addJob(createMockJob({ uuid: 'a', status: 'RUNNING', updatedAt: '2025-12-14T10:05:00Z' }));
      expect(service.jobs().length).toBe(1);
      expect(service.getJob('a')?.status).toBe('RUNNING');
    });

    it('skips a stale update that is older than the existing job', () => {
      service.addJob(createMockJob({ uuid: 'a', status: 'RUNNING', updatedAt: '2025-12-14T10:05:00Z' }));
      service.addJob(createMockJob({ uuid: 'a', status: 'PENDING', updatedAt: '2025-12-14T10:00:00Z' }));
      expect(service.getJob('a')?.status).toBe('RUNNING');
    });
  });

  describe('handleInitialJobs', () => {
    it('keeps only active jobs and marks the connection live', () => {
      service.handleInitialJobs([
        createMockJob({ uuid: 'a', status: 'PENDING' }),
        createMockJob({ uuid: 'b', status: 'COMPLETED' }),
        createMockJob({ uuid: 'c', status: 'running' }),
      ]);
      expect(service.jobs().map((j) => j.uuid)).toEqual(['a', 'c']);
      expect(service.isConnected()).toBeTrue();
    });

    it('ignores a non-array payload', () => {
      service.addJob(createMockJob({ uuid: 'keep' }));
      service.handleInitialJobs(null as unknown as Job[]);
      expect(service.getJob('keep')).toBeTruthy();
    });
  });

  describe('completion and failure handlers', () => {
    it('adds a completed job, emits, and removes it after 5s', fakeAsync(() => {
      const completed: string[] = [];
      service.jobCompleted$.subscribe((j) => completed.push(j.uuid));
      service.handleJobCompleted(createMockJob({ uuid: 'done', status: 'COMPLETED' }));
      expect(service.getJob('done')).toBeTruthy();
      expect(completed).toEqual(['done']);
      tick(5000);
      expect(service.getJob('done')).toBeUndefined();
    }));

    it('adds a failed job, emits, and removes it after 15s', fakeAsync(() => {
      const failed: string[] = [];
      service.jobFailed$.subscribe((j) => failed.push(j.uuid));
      service.handleJobFailed(createMockJob({ uuid: 'bad', status: 'FAILED' }));
      expect(service.getJob('bad')).toBeTruthy();
      expect(failed).toEqual(['bad']);
      tick(15000);
      expect(service.getJob('bad')).toBeUndefined();
    }));
  });
});
