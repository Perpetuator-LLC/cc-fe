// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JobsListComponent } from './jobs-list.component';
import { JobService } from '../job.service';
import { MessageService } from '../../message.service';
import { ToolbarService } from '../../toolbar.service';
import { PodcastsService } from '../../podcast/podcasts.service';
import { EpisodeService } from '../../episode/episode.service';
import { JobDisplayService } from '../../job-display.service';
import { ResearchService } from '../../topics/research.service';
import { LoadingService } from '../../loading.service';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, BehaviorSubject } from 'rxjs';
import { ViewContainerRef } from '@angular/core';

describe('JobsListComponent', () => {
  let component: JobsListComponent;
  let fixture: ComponentFixture<JobsListComponent>;
  let mockJobService: jasmine.SpyObj<JobService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockToolbarService: jasmine.SpyObj<ToolbarService>;
  let mockPodcastsService: jasmine.SpyObj<PodcastsService>;
  let mockEpisodeService: jasmine.SpyObj<EpisodeService>;
  let mockJobDisplayService: jasmine.SpyObj<JobDisplayService>;
  let mockResearchService: jasmine.SpyObj<ResearchService>;
  let mockLoadingService: jasmine.SpyObj<LoadingService>;

  beforeEach(async () => {
    mockJobService = jasmine.createSpyObj('JobService', ['getJobs', 'addJob']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['success', 'error', 'clearMessages']);
    Object.defineProperty(mockMessageService, 'messages$', {
      get: () => new BehaviorSubject([]).asObservable(),
    });
    mockToolbarService = jasmine.createSpyObj('ToolbarService', [
      'setTemplate',
      'clearTemplate',
      'getViewContainerRef',
      'clearToolbarComponent',
    ]);
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

    const mockViewContainerRef = {
      clear: jasmine.createSpy('clear'),
      createEmbeddedView: jasmine.createSpy('createEmbeddedView'),
    };
    mockToolbarService.getViewContainerRef.and.returnValue(mockViewContainerRef as unknown as ViewContainerRef);

    await TestBed.configureTestingModule({
      imports: [JobsListComponent],
      providers: [
        provideAnimations(),
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

    fixture = TestBed.createComponent(JobsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
