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
  let mockJobsWebSocketService: jasmine.SpyObj<JobsWebSocketService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockToolbarService: jasmine.SpyObj<ToolbarService>;
  let mockPodcastsService: jasmine.SpyObj<PodcastsService>;
  let mockEpisodeService: jasmine.SpyObj<EpisodeService>;
  let mockJobDisplayService: jasmine.SpyObj<JobDisplayService>;
  let mockResearchService: jasmine.SpyObj<ResearchService>;
  let mockLoadingService: jasmine.SpyObj<LoadingService>;

  beforeEach(async () => {
    mockJobService = jasmine.createSpyObj('JobService', ['getJobs', 'getJobsGrouped', 'addJob']);
    mockJobsWebSocketService = jasmine.createSpyObj('JobsWebSocketService', ['addJob', 'addJobs']);
    Object.defineProperty(mockJobsWebSocketService, 'jobUpdated$', {
      get: () => EMPTY,
    });
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
        { provide: JobService, useValue: mockJobService },
        { provide: JobsWebSocketService, useValue: mockJobsWebSocketService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ToolbarService, useValue: mockToolbarService },
        { provide: PodcastsService, useValue: mockPodcastsService },
        { provide: EpisodeService, useValue: mockEpisodeService },
        { provide: JobDisplayService, useValue: mockJobDisplayService },
        { provide: ResearchService, useValue: mockResearchService },
        { provide: LoadingService, useValue: mockLoadingService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JobsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
