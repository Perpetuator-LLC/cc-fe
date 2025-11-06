// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JobStatusBarComponent } from './job-status-bar.component';
import { JobService } from '../job.service';
import { MessageService } from '../message.service';
import { JobDisplayService } from '../job-display.service';
import { PodcastsService } from '../podcasts.service';
import { EpisodeService } from '../episode.service';
import { ResearchService } from '../research.service';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

describe('JobStatusBarComponent', () => {
  let component: JobStatusBarComponent;
  let fixture: ComponentFixture<JobStatusBarComponent>;
  let mockJobService: jasmine.SpyObj<JobService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockJobDisplayService: jasmine.SpyObj<JobDisplayService>;
  let mockPodcastsService: jasmine.SpyObj<PodcastsService>;
  let mockEpisodeService: jasmine.SpyObj<EpisodeService>;
  let mockResearchService: jasmine.SpyObj<ResearchService>;

  beforeEach(async () => {
    mockJobService = jasmine.createSpyObj('JobService', ['getJobs', 'addJob']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['success', 'error']);
    mockJobDisplayService = jasmine.createSpyObj('JobDisplayService', ['openJobStatusDialog']);
    mockPodcastsService = jasmine.createSpyObj('PodcastsService', ['getPodcastById']);
    mockEpisodeService = jasmine.createSpyObj('EpisodeService', ['getEpisode']);
    mockResearchService = jasmine.createSpyObj('ResearchService', ['getTopic']);

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
});
