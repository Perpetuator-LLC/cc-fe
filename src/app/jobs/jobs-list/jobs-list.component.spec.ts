// Copyright (c) 2025-2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { JobsListComponent } from './jobs-list.component';
import { EnrichedJob, JobChainGroup } from './jobs-list.types';
import { Job, JobService } from '../job.service';
import { JobsWebSocketService } from '../jobs-websocket.service';
import { MessageService } from '../../message.service';
import { ToolbarService } from '../../layout/toolbar.service';
import { PodcastsService } from '../../podcast/podcasts.service';
import { EpisodeService } from '../../episode/episode.service';
import { JobDisplayService } from '../../job-display.service';
import { ResearchService } from '../../topics/research.service';
import { LoadingService } from '../../layout/loading.service';
import { PulsesService } from '../../pulses/pulses.service';
import { Apollo } from 'apollo-angular';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, BehaviorSubject, EMPTY, throwError } from 'rxjs';

describe('JobsListComponent', () => {
  let component: JobsListComponent;
  let fixture: ComponentFixture<JobsListComponent>;
  let mockJobService: jasmine.SpyObj<JobService>;
  let mockJobsWebSocketService: Partial<JobsWebSocketService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockToolbarService: jasmine.SpyObj<ToolbarService>;
  let mockPodcastsService: jasmine.SpyObj<PodcastsService>;
  let mockEpisodeService: jasmine.SpyObj<EpisodeService>;
  let mockJobDisplayService: jasmine.SpyObj<JobDisplayService>;
  let mockResearchService: jasmine.SpyObj<ResearchService>;
  let mockLoadingService: jasmine.SpyObj<LoadingService>;
  let mockPulsesService: jasmine.SpyObj<PulsesService>;

  beforeEach(async () => {
    mockJobService = jasmine.createSpyObj('JobService', [
      'getJobs',
      'getJobsGrouped',
      'addJob',
      'deleteJobs',
      'retryJobs',
    ]);
    mockJobsWebSocketService = {
      jobUpdated$: EMPTY,
      jobCompleted$: EMPTY,
      jobFailed$: EMPTY,
      addJob: jasmine.createSpy('addJob'),
      addJobs: jasmine.createSpy('addJobs'),
    } as unknown as Partial<JobsWebSocketService>;
    mockMessageService = jasmine.createSpyObj('MessageService', ['success', 'error', 'clearMessages']);
    Object.defineProperty(mockMessageService, 'messages$', {
      get: () => new BehaviorSubject([]).asObservable(),
    });
    mockToolbarService = jasmine.createSpyObj('ToolbarService', ['setToolbarTemplate', 'clearToolbarComponent']);
    mockPodcastsService = jasmine.createSpyObj('PodcastsService', ['getPodcastById']);
    mockEpisodeService = jasmine.createSpyObj('EpisodeService', ['getEpisode']);
    mockJobDisplayService = jasmine.createSpyObj('JobDisplayService', [
      'openJobStatusDialog',
      'parseJobResult',
      'getJobMessage',
      'hasPodcastUuid',
      'getPodcastUuid',
      'getFqn',
      'getInterval',
      'getSymbol',
      'getExchange',
    ]);
    mockResearchService = jasmine.createSpyObj('ResearchService', ['getTopic']);
    mockLoadingService = jasmine.createSpyObj('LoadingService', ['show', 'hide']);
    mockPulsesService = jasmine.createSpyObj('PulsesService', ['getPulseConfig']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockPulsesService.getPulseConfig.and.returnValue(EMPTY as any);

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

    mockJobService.getJobsGrouped.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [JobsListComponent],
      providers: [
        provideAnimations(),
        { provide: JobsWebSocketService, useValue: mockJobsWebSocketService },
        { provide: JobService, useValue: mockJobService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ToolbarService, useValue: mockToolbarService },
        { provide: PodcastsService, useValue: mockPodcastsService },
        { provide: EpisodeService, useValue: mockEpisodeService },
        { provide: JobDisplayService, useValue: mockJobDisplayService },
        { provide: ResearchService, useValue: mockResearchService },
        { provide: LoadingService, useValue: mockLoadingService },
        { provide: PulsesService, useValue: mockPulsesService },
        {
          provide: Apollo,
          useValue: { query: () => EMPTY, mutate: () => EMPTY, watchQuery: () => ({ valueChanges: EMPTY }) },
        },
      ],
    }).compileComponents();
  });

  it('should have mock JobsWebSocketService with all properties', () => {
    const svc = TestBed.inject(JobsWebSocketService);
    console.log('Injected service:', svc);
    console.log('jobUpdated$:', svc.jobUpdated$);
    console.log('jobCompleted$:', svc.jobCompleted$);
    console.log('jobFailed$:', svc.jobFailed$);
    expect(svc.jobUpdated$).toBeDefined();
    expect(svc.jobCompleted$).toBeDefined();
    expect(svc.jobFailed$).toBeDefined();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(JobsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('chain and status helpers', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(JobsListComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    function makeChain(over: Partial<JobChainGroup> = {}): JobChainGroup {
      return {
        chainId: 'chain-1',
        totalJobs: 1,
        completedJobs: 0,
        jobs: [],
        firstJobKind: 'PUBLISH_PULSE_CHAIN',
        lastJobKind: 'PUBLISH_PULSE_CHAIN',
        ...over,
      } as unknown as JobChainGroup;
    }

    it('distinguishes chain groups from single jobs', () => {
      expect(component.isChainGroup(makeChain())).toBeTrue();
      expect(component.isChainGroup({ uuid: 'job-1' } as unknown as EnrichedJob)).toBeFalse();
    });

    it('maps chain statuses to css classes', () => {
      expect(component.chainStatusClass('completed')).toBe('job-success');
      expect(component.chainStatusClass('running')).toBe('job-running');
      expect(component.chainStatusClass('failed')).toBe('job-failed');
      expect(component.chainStatusClass('anything')).toBe('job-pending');
    });

    it('computes chain progress with a zero-job guard', () => {
      expect(component.getChainProgress(makeChain({ totalJobs: 0 }))).toBe(0);
      expect(component.getChainProgress(makeChain({ totalJobs: 4, completedJobs: 2 }))).toBe(50);
    });

    it('builds chain titles for single, repeated and mixed chains', () => {
      expect(component.getChainTitle(makeChain({ totalJobs: 1 })).length).toBeGreaterThan(0);
      expect(component.getChainTitle(makeChain({ totalJobs: 3 }))).toContain('(3 jobs)');
      const mixed = makeChain({ totalJobs: 2, lastJobKind: 'PUBLISH_EPISODE_AUDIO' });
      expect(component.getChainTitle(mixed)).toContain('→');
      expect(component.getChainIcon(makeChain()).length).toBeGreaterThan(0);
    });

    it('maps job statuses to css classes', () => {
      expect(component.statusClass('PENDING')).toBe('job-pending');
      expect(component.statusClass('RUNNING')).toBe('job-running');
      expect(component.statusClass('COMPLETED')).toBe('job-success');
      expect(component.statusClass('FAILED')).toBe('job-failed');
    });

    it('falls back to generic names for enriched jobs', () => {
      const bare = {} as EnrichedJob;
      expect(component.getPodcastName(bare)).toBe('Podcast');
      expect(component.getEpisodeName(bare)).toBe('Episode');
      expect(component.getTopicName(bare)).toBe('Topic');
      expect(component.getPulseConfigName(bare)).toBe('Pulse');
      const named = { podcastName: 'Alpha', episodeName: 'Ep 1' } as EnrichedJob;
      expect(component.getPodcastName(named)).toBe('Alpha');
      expect(component.getEpisodeName(named)).toBe('Ep 1');
    });

    it('toggles chain expansion state', () => {
      expect(component.isChainExpanded('c1')).toBeFalse();
      component.toggleChainExpanded('c1');
      expect(component.isChainExpanded('c1')).toBeTrue();
      component.toggleChainExpanded('c1');
      expect(component.isChainExpanded('c1')).toBeFalse();
    });

    it('reloads jobs when the status filter changes', () => {
      mockJobService.getJobs.calls.reset();
      mockJobService.getJobsGrouped.calls.reset();
      component.onStatusFilterChange('FAILED');
      expect(component.statusFilter).toBe('FAILED');
      expect(component.statusFilterLabel.length).toBeGreaterThan(0);
      const reloaded = mockJobService.getJobs.calls.count() + mockJobService.getJobsGrouped.calls.count();
      expect(reloaded).toBeGreaterThan(0);
    });

    it('delegates job-result helpers to JobDisplayService', () => {
      const job = { uuid: 'job-1' } as Job;
      mockJobDisplayService.hasPodcastUuid.and.returnValue(true);
      mockJobDisplayService.getPodcastUuid.and.returnValue('pod-1');
      mockJobDisplayService.getJobMessage.and.returnValue('done');
      expect(component.hasPodcastUuid(job)).toBeTrue();
      expect(component.getPodcastUuid(job)).toBe('pod-1');
      expect(component.getJobMessage(job)).toBe('done');
      expect(mockJobDisplayService.hasPodcastUuid).toHaveBeenCalledWith(job);
    });

    it('builds the symbol tooltip from fqn and interval', () => {
      const job = { uuid: 'job-1' } as Job;
      mockJobDisplayService.getFqn.and.returnValue('STOCK:NYSE:IBM');
      mockJobDisplayService.getInterval.and.returnValue('daily');
      expect(component.getSymbolTooltip(job)).toBe('FQN: STOCK:NYSE:IBM\nInterval: daily\nClick to view chart');

      mockJobDisplayService.getFqn.and.returnValue(null);
      mockJobDisplayService.getInterval.and.returnValue(null);
      expect(component.getSymbolTooltip(job)).toBe('Click to view chart');
    });

    it('navigates to the terminal chart only when a symbol exists', () => {
      const router = TestBed.inject(Router);
      const navigate = spyOn(router, 'navigate');
      const job = { uuid: 'job-1' } as Job;

      mockJobDisplayService.getSymbol.and.returnValue(null);
      component.navigateToSymbol(job);
      expect(navigate).not.toHaveBeenCalled();

      mockJobDisplayService.getSymbol.and.returnValue('IBM');
      mockJobDisplayService.getExchange.and.returnValue('NYSE');
      mockJobDisplayService.getInterval.and.returnValue(null);
      component.navigateToSymbol(job);
      expect(navigate).toHaveBeenCalledWith(
        ['/terminal'],
        jasmine.objectContaining({
          queryParams: jasmine.objectContaining({ symbol: 'IBM', exchange: 'NYSE', interval: 'daily' }),
        }),
      );
    });

    it('deletes a job and reports success or failure', () => {
      mockJobService.deleteJobs.and.returnValue(of({ success: true, message: 'deleted' }));
      component.deleteJob('job-1');
      expect(mockJobService.deleteJobs).toHaveBeenCalledWith(['job-1']);
      expect(mockMessageService.success).toHaveBeenCalledWith('Job deleted.');

      mockJobService.deleteJobs.and.returnValue(throwError(() => new Error('nope')));
      component.deleteJob('job-2');
      expect(mockMessageService.error).toHaveBeenCalledWith('Failed to delete job: nope');
    });

    it('retries a job and prepends the returned jobs', () => {
      mockJobService.retryJobs.and.returnValue(of({ success: true, message: 'retried', jobs: [] as Job[] }));
      component.retryJob('job-1');
      expect(mockJobService.retryJobs).toHaveBeenCalledWith(['job-1']);
    });
  });
});
