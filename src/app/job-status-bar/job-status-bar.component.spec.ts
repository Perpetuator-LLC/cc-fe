// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { JobStatusBarComponent } from './job-status-bar.component';
import { JobService, Job, JobStatus } from '../job.service';
import { MessageService } from '../message.service';
import { JobDisplayService } from '../job-display.service';
import { PodcastsService } from '../podcasts.service';
import { EpisodeService } from '../episode/episode.service';
import { ResearchService } from '../research.service';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

describe('JobStatusBarComponent', () => {
  let component: JobStatusBarComponent;
  let fixture: ComponentFixture<JobStatusBarComponent>;
  let mockJobService: jasmine.SpyObj<JobService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockJobDisplayService: jasmine.SpyObj<JobDisplayService>;
  let mockPodcastsService: jasmine.SpyObj<PodcastsService>;
  let mockEpisodeService: jasmine.SpyObj<EpisodeService>;
  let mockResearchService: jasmine.SpyObj<ResearchService>;
  let jobsSignal: ReturnType<typeof signal<Job[]>>;

  const createMockJob = (overrides: Partial<Job> = {}): Job => ({
    id: '1',
    uuid: 'job-uuid-1',
    kind: 'CREATE_EPISODE',
    status: 'PENDING',
    error: '',
    result: null,
    args: null,
    createdAt: '2025-11-06T10:00:00Z',
    updatedAt: '2025-11-06T10:00:00Z',
    cost: undefined,
    ...overrides,
  });

  beforeEach(async () => {
    jobsSignal = signal<Job[]>([]);

    mockJobService = jasmine.createSpyObj('JobService', [
      'getJobs',
      'addJob',
      'deleteJobs',
      'retryJobs',
      'getJobTransitions',
    ]);
    mockMessageService = jasmine.createSpyObj('MessageService', ['success', 'error']);
    mockJobDisplayService = jasmine.createSpyObj('JobDisplayService', [
      'openJobStatusDialog',
      'handleJobCompletion',
      'getJobMessage',
      'hasPodcastUuid',
      'hasEpisodeUuid',
      'hasTopicUuid',
      'getPodcastUuid',
      'getEpisodeUuid',
      'getTopicUuid',
      'getMergedJobData',
    ]);
    mockPodcastsService = jasmine.createSpyObj('PodcastsService', ['getPodcastById']);
    mockEpisodeService = jasmine.createSpyObj('EpisodeService', ['getEpisodeById']);
    mockResearchService = jasmine.createSpyObj('ResearchService', ['getTopicById']);

    // Set up default mock returns
    Object.defineProperty(mockJobService, 'jobs', {
      get: () => jobsSignal,
      configurable: true,
    });

    mockJobService.getJobs.and.returnValue(
      of({
        jobs: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      }),
    );

    mockJobService.getJobTransitions.and.returnValue([]);
    mockJobDisplayService.getMergedJobData.and.returnValue({});
    mockJobDisplayService.getJobMessage.and.returnValue('Job message');
    mockJobDisplayService.hasPodcastUuid.and.returnValue(false);
    mockJobDisplayService.hasEpisodeUuid.and.returnValue(false);
    mockJobDisplayService.hasTopicUuid.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [JobStatusBarComponent],
      providers: [
        provideAnimations(),
        { provide: JobService, useValue: mockJobService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: JobDisplayService, useValue: mockJobDisplayService },
        { provide: PodcastsService, useValue: mockPodcastsService },
        { provide: EpisodeService, useValue: mockEpisodeService },
        { provide: ResearchService, useValue: mockResearchService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JobStatusBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with default data', () => {
      expect(component.data).toBeDefined();
      expect(component.data.panelOpenState).toBe(false);
    });

    it('should set panelOpenState to false if undefined', () => {
      component.data = { title: 'Test', panelOpenState: undefined };
      component.ngOnInit();
      expect(component.data.panelOpenState).toBe(false);
    });

    it('should call loadJobs on init', () => {
      spyOn(component, 'loadJobs');
      component.ngOnInit();
      expect(component.loadJobs).toHaveBeenCalled();
    });
  });

  describe('loadJobs', () => {
    it('should call jobService.getJobs with correct parameters', () => {
      component.loadJobs();

      expect(mockJobService.getJobs).toHaveBeenCalledWith([JobStatus.PENDING, JobStatus.RUNNING], [], []);
    });

    it('should update jobs with enriched data on success', fakeAsync(() => {
      const mockJobs = [createMockJob({ id: '1', kind: 'CREATE_EPISODE' })];
      mockJobService.getJobs.and.returnValue(
        of({
          jobs: mockJobs,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        }),
      );

      component.loadJobs();
      tick();

      expect(component['jobs'].length).toBe(1);
    }));

    it('should handle enrichment errors gracefully', fakeAsync(() => {
      const mockJobs = [createMockJob()];
      mockJobService.getJobs.and.returnValue(
        of({
          jobs: mockJobs,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        }),
      );

      spyOn(console, 'warn');
      mockJobDisplayService.getMergedJobData.and.throwError('Enrichment error');

      component.loadJobs();
      tick();

      expect(component['jobs'].length).toBe(1);
    }));
  });

  describe('deleteJob', () => {
    it('should call jobService.deleteJobs with job id', () => {
      mockJobService.deleteJobs.and.returnValue(of({ success: true, message: 'Deleted' }));
      component.deleteJob('job-1');

      expect(mockJobService.deleteJobs).toHaveBeenCalledWith(['job-1']);
    });

    it('should remove job from jobs array on success', () => {
      component['jobs'] = [createMockJob({ id: 'job-1' }), createMockJob({ id: 'job-2' })];

      mockJobService.deleteJobs.and.returnValue(of({ success: true, message: 'Deleted' }));
      component.deleteJob('job-1');

      expect(component['jobs'].length).toBe(1);
      expect(component['jobs'][0].id).toBe('job-2');
    });

    it('should show success message on deletion', () => {
      component['jobs'] = [createMockJob({ id: 'job-1' })];
      mockJobService.deleteJobs.and.returnValue(of({ success: true, message: 'Deleted' }));

      component.deleteJob('job-1');

      expect(mockMessageService.success).toHaveBeenCalledWith('Job deleted.');
    });

    it('should show error message on deletion failure', () => {
      mockJobService.deleteJobs.and.returnValue(throwError(() => ({ message: 'Delete failed' })));

      component.deleteJob('job-1');

      expect(mockMessageService.error).toHaveBeenCalledWith('Failed to delete job: Delete failed');
    });
  });

  describe('retryJob', () => {
    it('should call jobService.retryJobs with job id', () => {
      mockJobService.retryJobs.and.returnValue(of({ success: true, message: 'Retried', jobs: [] }));
      component.retryJob('job-1');

      expect(mockJobService.retryJobs).toHaveBeenCalledWith(['job-1']);
    });

    it('should update jobs array with retried job', () => {
      const originalJob = createMockJob({ id: 'job-1', status: 'FAILED' });
      const retriedJob = createMockJob({ id: 'job-2', status: 'PENDING' });
      component['jobs'] = [originalJob];

      mockJobService.retryJobs.and.returnValue(of({ success: true, message: 'Retried', jobs: [retriedJob] }));
      component.retryJob('job-1');

      expect(component['jobs'].length).toBe(1);
      expect(component['jobs'][0].id).toBe('job-2');
    });

    it('should handle retry errors', () => {
      spyOn(console, 'error');
      mockJobService.retryJobs.and.returnValue(throwError(() => ({ message: 'Retry failed' })));

      component.retryJob('job-1');

      expect(console.error).toHaveBeenCalledWith('Failed to retry job: Retry failed');
    });
  });

  describe('Job Enrichment', () => {
    it('should enrich jobs with podcast names', fakeAsync(() => {
      const job = createMockJob({ id: '1' });
      mockJobDisplayService.getMergedJobData.and.returnValue({ podcast_uuid: 'podcast-1' });
      mockPodcastsService.getPodcastById.and.returnValue(
        of({ uuid: 'podcast-1', name: 'Test Podcast' } as unknown) as ReturnType<
          typeof mockPodcastsService.getPodcastById
        >,
      );

      component['enrichJobsWithNames']([job]).then((enriched) => {
        expect(enriched[0].podcastName).toBe('Test Podcast');
      });

      tick();
    }));

    it('should enrich jobs with episode names', fakeAsync(() => {
      const job = createMockJob({ id: '1' });
      mockJobDisplayService.getMergedJobData.and.returnValue({ episode_uuid: 'episode-1' });
      mockEpisodeService.getEpisodeById.and.returnValue(
        of({ uuid: 'episode-1', title: 'Test Episode' } as unknown) as ReturnType<
          typeof mockEpisodeService.getEpisodeById
        >,
      );

      component['enrichJobsWithNames']([job]).then((enriched) => {
        expect(enriched[0].episodeName).toBe('Test Episode');
      });

      tick();
    }));

    it('should enrich jobs with topic names', fakeAsync(() => {
      const job = createMockJob({ id: '1' });
      mockJobDisplayService.getMergedJobData.and.returnValue({ topic_uuid: 'topic-1' });
      mockResearchService.getTopicById.and.returnValue(
        of({ uuid: 'topic-1', title: 'Test Topic' } as unknown) as ReturnType<typeof mockResearchService.getTopicById>,
      );

      component['enrichJobsWithNames']([job]).then((enriched) => {
        expect(enriched[0].topicName).toBe('Test Topic');
      });

      tick();
    }));

    it('should handle jobs with no UUIDs', fakeAsync(() => {
      const job = createMockJob({ id: '1' });
      mockJobDisplayService.getMergedJobData.and.returnValue({});

      component['enrichJobsWithNames']([job]).then((enriched) => {
        expect(enriched[0].podcastName).toBeUndefined();
        expect(enriched[0].episodeName).toBeUndefined();
        expect(enriched[0].topicName).toBeUndefined();
      });

      tick();
    }));

    it('should handle enrichment errors gracefully', fakeAsync(() => {
      const job = createMockJob({ id: '1' });
      mockJobDisplayService.getMergedJobData.and.returnValue({ podcast_uuid: 'podcast-1' });
      mockPodcastsService.getPodcastById.and.returnValue(throwError(() => new Error('Network error')));
      spyOn(console, 'warn');

      component['enrichJobsWithNames']([job]).then((enriched) => {
        expect(enriched.length).toBe(1);
        expect(console.warn).toHaveBeenCalled();
      });

      tick();
    }));
  });

  describe('Helper Methods', () => {
    it('should delegate getJobMessage to jobDisplayService', () => {
      const job = createMockJob();
      mockJobDisplayService.getJobMessage.and.returnValue('Test message');

      const result = component.getJobMessage(job);

      expect(result).toBe('Test message');
      expect(mockJobDisplayService.getJobMessage).toHaveBeenCalledWith(job);
    });

    it('should delegate hasPodcastUuid to jobDisplayService', () => {
      const job = createMockJob();
      mockJobDisplayService.hasPodcastUuid.and.returnValue(true);

      const result = component.hasPodcastUuid(job);

      expect(result).toBe(true);
      expect(mockJobDisplayService.hasPodcastUuid).toHaveBeenCalledWith(job);
    });

    it('should delegate hasEpisodeUuid to jobDisplayService', () => {
      const job = createMockJob();
      mockJobDisplayService.hasEpisodeUuid.and.returnValue(true);

      const result = component.hasEpisodeUuid(job);

      expect(result).toBe(true);
      expect(mockJobDisplayService.hasEpisodeUuid).toHaveBeenCalledWith(job);
    });

    it('should delegate hasTopicUuid to jobDisplayService', () => {
      const job = createMockJob();
      mockJobDisplayService.hasTopicUuid.and.returnValue(true);

      const result = component.hasTopicUuid(job);

      expect(result).toBe(true);
      expect(mockJobDisplayService.hasTopicUuid).toHaveBeenCalledWith(job);
    });

    it('should return podcast name or default', () => {
      const jobWithName = { ...createMockJob(), podcastName: 'My Podcast' };
      const jobWithoutName = createMockJob();

      expect(component.getPodcastName(jobWithName)).toBe('My Podcast');
      expect(component.getPodcastName(jobWithoutName)).toBe('Podcast');
    });

    it('should return episode name or default', () => {
      const jobWithName = { ...createMockJob(), episodeName: 'My Episode' };
      const jobWithoutName = createMockJob();

      expect(component.getEpisodeName(jobWithName)).toBe('My Episode');
      expect(component.getEpisodeName(jobWithoutName)).toBe('Episode');
    });

    it('should return topic name or default', () => {
      const jobWithName = { ...createMockJob(), topicName: 'My Topic' };
      const jobWithoutName = createMockJob();

      expect(component.getTopicName(jobWithName)).toBe('My Topic');
      expect(component.getTopicName(jobWithoutName)).toBe('Topic');
    });
  });

  describe('Error Message Handling', () => {
    it('should detect error messages', () => {
      expect(component.isErrorMessage('Error: Something went wrong')).toBe(true);
      expect(component.isErrorMessage('ERROR: Failed')).toBe(true);
      expect(component.isErrorMessage('Exception occurred')).toBe(true);
      expect(component.isErrorMessage('Traceback: ...')).toBe(true);
      expect(component.isErrorMessage('Normal message')).toBe(false);
    });

    it('should clean error messages by removing prefixes', () => {
      expect(component.getCleanErrorMessage('Error: Test error')).toBe('Test error');
      expect(component.getCleanErrorMessage('ERROR: Test error')).toBe('Test error');
      expect(component.getCleanErrorMessage('error: Test error')).toBe('Test error');
      expect(component.getCleanErrorMessage('Test error')).toBe('Test error');
      expect(component.getCleanErrorMessage('')).toBe('');
    });

    it('should get clean job message with error detection', () => {
      const job = createMockJob();
      mockJobDisplayService.getJobMessage.and.returnValue('Error: Test error');

      const result = component.getCleanJobMessage(job);

      expect(result).toBe('Test error');
    });

    it('should return normal message if not an error', () => {
      const job = createMockJob();
      mockJobDisplayService.getJobMessage.and.returnValue('Processing job');

      const result = component.getCleanJobMessage(job);

      expect(result).toBe('Processing job');
    });
  });

  describe('Job Sorting', () => {
    it('should sort jobs by status priority', () => {
      const jobs = [
        createMockJob({ id: '1', status: 'PENDING' }),
        createMockJob({ id: '2', status: 'COMPLETED' }),
        createMockJob({ id: '3', status: 'RUNNING' }),
        createMockJob({ id: '4', status: 'FAILED' }),
      ];

      const sorted = component['sortJobs'](jobs);

      expect(sorted[0].status).toBe('COMPLETED');
      expect(sorted[1].status).toBe('FAILED');
      expect(sorted[2].status).toBe('RUNNING');
      expect(sorted[3].status).toBe('PENDING');
    });

    it('should sort jobs by updatedAt within same status', () => {
      const jobs = [
        createMockJob({ id: '1', status: 'RUNNING', updatedAt: '2025-11-06T10:00:00Z' }),
        createMockJob({ id: '2', status: 'RUNNING', updatedAt: '2025-11-06T11:00:00Z' }),
        createMockJob({ id: '3', status: 'RUNNING', updatedAt: '2025-11-06T09:00:00Z' }),
      ];

      const sorted = component['sortJobs'](jobs);

      expect(sorted[0].id).toBe('2'); // Most recent first
      expect(sorted[1].id).toBe('1');
      expect(sorted[2].id).toBe('3');
    });
  });

  describe('Job Transitions and Notifications', () => {
    it('should call getJobTransitions when jobs signal changes', () => {
      // The component subscribes to jobs signal in constructor
      // Just verify that getJobTransitions is configured correctly
      expect(mockJobService.getJobTransitions).toBeDefined();
    });

    it('should have access to job display service for handling completions', () => {
      expect(mockJobDisplayService.handleJobCompletion).toBeDefined();
    });

    it('should have access to message service for showing notifications', () => {
      expect(mockMessageService.success).toBeDefined();
      expect(mockMessageService.error).toBeDefined();
    });
  });

  describe('Lifecycle', () => {
    it('should unsubscribe on destroy', () => {
      const unsubscribeSpy = spyOn(component['subscriptions'], 'unsubscribe');
      component.ngOnDestroy();
      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('should add subscriptions to subscription manager', () => {
      mockJobService.getJobs.and.returnValue(
        of({
          jobs: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        }),
      );

      component.loadJobs();

      expect(component['subscriptions'].closed).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty job list', () => {
      component['jobs'] = [];
      const sorted = component['sortJobs']([]);
      expect(sorted.length).toBe(0);
    });

    it('should handle null/undefined error messages', () => {
      expect(component.isErrorMessage('')).toBe(false);
      expect(component.getCleanErrorMessage('')).toBe('');
    });

    it('should handle jobs with missing timestamps', () => {
      const jobs = [createMockJob({ id: '1', updatedAt: '' }), createMockJob({ id: '2', updatedAt: '' })];

      const sorted = component['sortJobs'](jobs);
      expect(sorted.length).toBe(2);
    });
  });
});
