// Copyright (c) 2025-2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JobsListComponent } from './jobs-list.component';
import { JobService } from '../job.service';
import { JobsWebSocketService } from '../jobs-websocket.service';
import { MessageService } from '../../message.service';
import { ToolbarService } from '../../layout/toolbar.service';
import { PodcastsService } from '../../podcast/podcasts.service';
import { EpisodeService } from '../../episode/episode.service';
import { JobDisplayService } from '../../job-display.service';
import { ResearchService } from '../../topics/research.service';
import { LoadingService } from '../../layout/loading.service';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, BehaviorSubject, EMPTY } from 'rxjs';

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

  beforeEach(async () => {
    mockJobService = jasmine.createSpyObj('JobService', ['getJobs', 'getJobsGrouped', 'addJob']);
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
    mockJobDisplayService = jasmine.createSpyObj('JobDisplayService', ['openJobStatusDialog']);
    mockResearchService = jasmine.createSpyObj('ResearchService', ['getTopic']);
    mockLoadingService = jasmine.createSpyObj('LoadingService', ['show', 'hide']);

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
});
