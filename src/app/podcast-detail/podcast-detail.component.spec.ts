// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PodcastDetailComponent } from './podcast-detail.component';
import { PodcastsService } from '../podcasts.service';
import { MessageService } from '../message.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { DeletePodcastDialogComponent } from './delete-podcast-dialog/delete-podcast-dialog.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TeamsService } from '../teams.service';
import { VoicesService } from '../voices.service';
import { UserService } from '../user.service';
import { ToolbarService } from '../toolbar.service';
import { Clipboard } from '@angular/cdk/clipboard';
import { ViewContainerRef, signal } from '@angular/core';
import { LoadingService } from '../loading.service';
import { NewsService } from '../news.service';
import { EpisodeService } from '../episode.service';
import { JobService } from '../job.service';
import { ResearchService } from '../research.service';

describe('PodcastDetailComponentComponent', () => {
  let component: PodcastDetailComponent;
  let fixture: ComponentFixture<PodcastDetailComponent>;
  let mockPodcastsService: jasmine.SpyObj<PodcastsService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockTeamsService: jasmine.SpyObj<TeamsService>;
  let mockVoicesService: jasmine.SpyObj<VoicesService>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockToolbarService: jasmine.SpyObj<ToolbarService>;
  let mockClipboard: jasmine.SpyObj<Clipboard>;
  let mockLoadingService: jasmine.SpyObj<LoadingService>;
  let mockNewsService: jasmine.SpyObj<NewsService>;
  let mockEpisodeService: jasmine.SpyObj<EpisodeService>;
  let mockJobService: jasmine.SpyObj<JobService>;
  let mockResearchService: jasmine.SpyObj<ResearchService>;
  let messagesSubject: BehaviorSubject<never[]>;

  beforeEach(async () => {
    messagesSubject = new BehaviorSubject<never[]>([]);

    mockPodcastsService = jasmine.createSpyObj('PodcastsService', [
      'deletePodcast',
      'getPodcastById',
      'getRssFeeds',
      'getPodcastCategories',
    ]);
    mockMessageService = jasmine.createSpyObj('MessageService', ['success', 'error', 'clearMessages']);
    Object.defineProperty(mockMessageService, 'messages$', {
      get: () => messagesSubject.asObservable(),
    });
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockTeamsService = jasmine.createSpyObj('TeamsService', ['getTeams']);
    mockVoicesService = jasmine.createSpyObj('VoicesService', ['getVoices']);
    mockUserService = jasmine.createSpyObj('UserService', ['getUser']);
    Object.defineProperty(mockUserService, 'userDetails', {
      get: () => signal(null),
    });
    mockToolbarService = jasmine.createSpyObj('ToolbarService', [
      'setTemplate',
      'clearTemplate',
      'getViewContainerRef',
      'clearToolbarComponent',
    ]);
    mockClipboard = jasmine.createSpyObj('Clipboard', ['copy']);
    mockLoadingService = jasmine.createSpyObj('LoadingService', ['show', 'hide']);
    mockNewsService = jasmine.createSpyObj('NewsService', ['createEpisode']);
    mockEpisodeService = jasmine.createSpyObj('EpisodeService', ['getEpisodes']);
    mockJobService = jasmine.createSpyObj('JobService', ['addJob']);
    mockResearchService = jasmine.createSpyObj('ResearchService', ['createResearchChain']);

    mockPodcastsService = jasmine.createSpyObj('PodcastsService', [
      'deletePodcast',
      'getPodcastById',
      'getRssFeeds',
      'getPodcastCategories',
    ]);
    mockMessageService = jasmine.createSpyObj('MessageService', ['success', 'error', 'clearMessages']);
    Object.defineProperty(mockMessageService, 'messages$', {
      get: () => messagesSubject.asObservable(),
    });
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockTeamsService = jasmine.createSpyObj('TeamsService', ['getTeams']);
    mockVoicesService = jasmine.createSpyObj('VoicesService', ['getVoices']);
    mockUserService = jasmine.createSpyObj('UserService', ['getUser']);
    Object.defineProperty(mockUserService, 'userDetails', {
      get: () => signal(null),
    });
    mockToolbarService = jasmine.createSpyObj('ToolbarService', [
      'setTemplate',
      'clearTemplate',
      'getViewContainerRef',
      'clearToolbarComponent',
    ]);
    mockClipboard = jasmine.createSpyObj('Clipboard', ['copy']);

    const mockViewContainerRef = {
      clear: jasmine.createSpy('clear'),
      createEmbeddedView: jasmine.createSpy('createEmbeddedView'),
    };
    mockToolbarService.getViewContainerRef.and.returnValue(mockViewContainerRef as unknown as ViewContainerRef);

    mockPodcastsService.getPodcastById.and.returnValue(
      of({
        id: '1',
        uuid: 'test-podcast-uuid',
        name: 'Test Podcast',
        url: '',
        enabled: false,
        slug: '',
        image: null,
        imageUrl: null,
        thumbnailUrl: null,
        ownerName: '',
        ownerEmail: '',
        ownerLink: '',
        intro: '',
        prompt: '',
        outro: '',
        tgChannelId: null,
        tgResponse: null,
        team: null,
        categories: {},
        rssFeeds: [],
        voice: null,
        newsPrompt: '',
        newsTargetWords: 0,
        researchPrompt: '',
        researchTargetWords: 0,
      }),
    );

    mockPodcastsService.getPodcastCategories.and.returnValue(of({}));

    mockTeamsService.getTeams.and.returnValue(
      of({
        teams: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      }),
    );

    mockVoicesService.getVoices.and.returnValue(
      of({
        voices: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [PodcastDetailComponent],
      providers: [
        provideAnimations(),
        { provide: PodcastsService, useValue: mockPodcastsService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: Router, useValue: mockRouter },
        { provide: TeamsService, useValue: mockTeamsService },
        { provide: VoicesService, useValue: mockVoicesService },
        { provide: UserService, useValue: mockUserService },
        { provide: ToolbarService, useValue: mockToolbarService },
        { provide: Clipboard, useValue: mockClipboard },
        { provide: LoadingService, useValue: mockLoadingService },
        { provide: NewsService, useValue: mockNewsService },
        { provide: EpisodeService, useValue: mockEpisodeService },
        { provide: JobService, useValue: mockJobService },
        { provide: ResearchService, useValue: mockResearchService },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ uuid: 'test-podcast-uuid' }),
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'uuid' ? 'test-podcast-uuid' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PodcastDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('deletePodcastDialog', () => {
    it('should pass dialog result to deletePodcast service, not component deleteConfirmation property', (done) => {
      const testPodcastName = 'Test Podcast Name';
      const confirmationTextFromDialog = 'Test Podcast Name';
      const testPodcastUuid = 'test-podcast-uuid';

      const mockDialogRef = {
        afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of(confirmationTextFromDialog)),
      } as unknown as MatDialogRef<DeletePodcastDialogComponent>;

      mockDialog.open.and.returnValue(mockDialogRef);

      component['deleteConfirmation'] = '';
      component.podcastForm.patchValue({ name: testPodcastName });

      mockPodcastsService.deletePodcast.and.returnValue(
        of({ success: true, message: 'Deleted successfully', podcast: null }),
      );

      component.deletePodcastDialog();

      setTimeout(() => {
        expect(mockDialog.open).toHaveBeenCalledWith(DeletePodcastDialogComponent, {
          width: '500px',
          data: { podcastName: testPodcastName },
        });

        expect(mockPodcastsService.deletePodcast).toHaveBeenCalledWith(testPodcastUuid, confirmationTextFromDialog);

        expect(mockPodcastsService.deletePodcast).not.toHaveBeenCalledWith(testPodcastUuid, '');

        expect(mockMessageService.success).toHaveBeenCalledWith('Podcast deleted successfully');
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/p']);

        done();
      }, 100);
    });

    it('should not call deletePodcast if dialog is cancelled', (done) => {
      const testPodcastName = 'Test Podcast Name';

      const mockDialogRef = {
        afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of(false)),
      } as unknown as MatDialogRef<DeletePodcastDialogComponent>;

      mockDialog.open.and.returnValue(mockDialogRef);

      component.podcastForm.patchValue({ name: testPodcastName });

      component.deletePodcastDialog();

      setTimeout(() => {
        expect(mockDialog.open).toHaveBeenCalled();
        expect(mockPodcastsService.deletePodcast).not.toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should handle error when delete fails', (done) => {
      const testPodcastName = 'Test Podcast Name';
      const confirmationTextFromDialog = 'Test Podcast Name';
      const testPodcastUuid = 'test-podcast-uuid';
      const errorMessage = 'Network error';

      const mockDialogRef = {
        afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of(confirmationTextFromDialog)),
      } as unknown as MatDialogRef<DeletePodcastDialogComponent>;

      mockDialog.open.and.returnValue(mockDialogRef);

      component.podcastForm.patchValue({ name: testPodcastName });

      mockPodcastsService.deletePodcast.and.returnValue(throwError(() => new Error(errorMessage)));

      component.deletePodcastDialog();

      setTimeout(() => {
        expect(mockPodcastsService.deletePodcast).toHaveBeenCalledWith(testPodcastUuid, confirmationTextFromDialog);
        expect(mockMessageService.error).toHaveBeenCalledWith(`Failed to delete podcast: ${errorMessage}`);
        expect(mockRouter.navigate).not.toHaveBeenCalled();
        done();
      }, 100);
    });
  });
});
