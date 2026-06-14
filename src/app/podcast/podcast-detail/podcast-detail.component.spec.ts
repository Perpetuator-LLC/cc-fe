// Copyright (c) 2025-2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PodcastDetailComponent } from './podcast-detail.component';
import { PodcastsService } from '../podcasts.service';
import { MessageService } from '../../message.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { DeletePodcastDialogComponent } from './delete-podcast-dialog/delete-podcast-dialog.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { TeamsResult, TeamsService } from '../../team/teams.service';
import { Voice, VoicesService } from '../voices.service';
import { UserService } from '../../user/user.service';
import { ToolbarService } from '../../layout/toolbar.service';
import { Clipboard } from '@angular/cdk/clipboard';
import { signal } from '@angular/core';
import { LoadingService } from '../../layout/loading.service';
import { NewsService } from '../../news/news.service';
import { EpisodeService } from '../../episode/episode.service';
import { JobService } from '../../jobs/job.service';
import { ResearchService } from '../../topics/research.service';
import { ShareService } from '../../share.service';
import { SchedulingService } from '../../scheduling.service';
import { of as rxOf } from 'rxjs';

// Use SpyObj for MatDialog (matches pattern used in login.component.spec.ts and
// other passing dialog tests in this repo). The previous custom MockMatDialog
// class injected fine but its `open` spy was never invoked from the component —
// most likely because the partial class shape failed Angular's DI typing on
// some test runs.
function makeDialogSpy(): jasmine.SpyObj<MatDialog> {
  return jasmine.createSpyObj<MatDialog>('MatDialog', ['open', 'closeAll']);
}

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
  let mockShareService: jasmine.SpyObj<ShareService>;
  let mockSchedulingService: jasmine.SpyObj<SchedulingService>;
  let messagesSubject: BehaviorSubject<never[]>;

  beforeEach(async () => {
    messagesSubject = new BehaviorSubject<never[]>([]);

    mockPodcastsService = jasmine.createSpyObj('PodcastsService', [
      'deletePodcast',
      'getPodcastById',
      'getRssFeeds',
      'getPodcastCategories',
      'getPodcastsForFilter',
    ]);
    mockMessageService = jasmine.createSpyObj('MessageService', ['success', 'error', 'clearMessages']);
    Object.defineProperty(mockMessageService, 'messages$', {
      get: () => messagesSubject.asObservable(),
    });
    mockDialog = makeDialogSpy();
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockTeamsService = jasmine.createSpyObj('TeamsService', ['getTeams']);
    mockVoicesService = jasmine.createSpyObj('VoicesService', ['getVoices']);
    mockUserService = jasmine.createSpyObj('UserService', ['getUser']);
    Object.defineProperty(mockUserService, 'userDetails', {
      get: () => signal(null),
    });
    mockToolbarService = jasmine.createSpyObj('ToolbarService', ['setToolbarTemplate', 'clearToolbarComponent']);
    mockClipboard = jasmine.createSpyObj('Clipboard', ['copy']);
    mockLoadingService = jasmine.createSpyObj('LoadingService', ['show', 'hide']);
    mockNewsService = jasmine.createSpyObj('NewsService', ['createEpisode']);
    mockEpisodeService = jasmine.createSpyObj('EpisodeService', ['getEpisodes']);
    mockJobService = jasmine.createSpyObj('JobService', ['addJob']);
    mockResearchService = jasmine.createSpyObj('ResearchService', ['createResearchChain']);
    mockShareService = jasmine.createSpyObj('ShareService', ['extractIdFromSlugParam', 'buildPodcastUrl']);

    // Make extractIdFromSlugParam return the test UUID
    mockShareService.extractIdFromSlugParam.and.returnValue('test-podcast-uuid');
    mockShareService.buildPodcastUrl.and.returnValue('https://example.com/p/test-podcast-uuid');

    mockSchedulingService = jasmine.createSpyObj('SchedulingService', ['getSchedules']);
    mockSchedulingService.getSchedules.and.returnValue(
      rxOf({
        schedules: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      }),
    );

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
        latestEpisodeDate: null,
        latestInternalEpisodeDate: null,
        viewCount: 0,
        lastNewsFetchedAt: null,
        createdAt: null,
      }),
    );

    mockPodcastsService.getPodcastCategories.and.returnValue(of({}));

    mockPodcastsService.getPodcastsForFilter.and.returnValue(of({ podcasts: [] }));

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

    mockEpisodeService.getEpisodes.and.returnValue(
      of({
        episodes: [],
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
        provideHttpClient(),
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
        { provide: ShareService, useValue: mockShareService },
        { provide: SchedulingService, useValue: mockSchedulingService },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ uuid: 'test-podcast-uuid' }),
            queryParams: of({}), // Add queryParams observable
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'uuid' ? 'test-podcast-uuid' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    // PodcastDetailComponent is standalone and lists @angular/material/dialog's
    // MatDialog among its transitive providers (via Material modules pulled in
    // by its template/imports). Standalone components prefer the component-level
    // injector, which can win over module-level `useValue`, so the component
    // ended up with a real MatDialog even though TestBed.inject returned the
    // mock. overrideProvider forces the substitution at the component injector
    // level too.
    TestBed.overrideProvider(MatDialog, { useValue: mockDialog });

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
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/media/podcasts']);

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

  describe('voice and team helpers', () => {
    function makeVoice(over: Partial<Voice> = {}): Voice {
      return {
        uuid: 'voice-1',
        displayName: 'Ava',
        creditsPerMillionChar: 15000,
        model: 'OPENAI_TTS_1',
        ...over,
      } as Voice;
    }

    it('builds the voice display name with CPM and tier fallbacks', () => {
      const label = component.getVoiceDisplayName(makeVoice());
      expect(label).toContain('Ava');
      expect(label).toContain('(15 CPM)');
      expect(component.getVoiceDisplayName(makeVoice({ displayName: null }))).toContain('Name not set');
    });

    it('compares voices and teams by uuid', () => {
      expect(component.compareVoices(makeVoice(), makeVoice())).toBeTrue();
      expect(component.compareVoices(makeVoice(), makeVoice({ uuid: 'other' }))).toBeFalse();
      expect(component.compareVoices(null, makeVoice())).toBeFalse();

      const team = { uuid: 't1' } as TeamsResult;
      expect(component.compareTeams(team, { uuid: 't1' } as TeamsResult)).toBeTrue();
      expect(component.compareTeams(team, { uuid: 't2' } as TeamsResult)).toBeFalse();
      expect(component.compareTeams(null, team)).toBeFalse();
    });

    it('displays a voice or an empty string', () => {
      expect(component.displayVoice(null)).toBe('');
      expect(component.displayVoice(makeVoice())).toContain('Ava');
    });

    it('marks the selected voice from the form value', () => {
      component.podcastForm.get('voice')?.setValue(makeVoice());
      expect(component.isVoiceSelected(makeVoice())).toBeTrue();
      expect(component.isVoiceSelected(makeVoice({ uuid: 'other' }))).toBeFalse();
    });
  });

  describe('target words validation', () => {
    it('derives the minimum from intro and outro word counts', () => {
      component.podcastForm.patchValue({ intro: '', outro: '' });
      const base = component.getMinimumTargetWords();
      component.podcastForm.patchValue({ intro: 'hello there listeners', outro: 'bye now' });
      expect(component.getMinimumTargetWords()).toBe(base + 5);
    });

    it('builds the right error message per validation failure', () => {
      const control = component.podcastForm.get('intro')!;
      control.setErrors(null);
      expect(component.getTargetWordsError('intro')).toBeNull();

      control.setErrors({ required: true });
      expect(component.getTargetWordsError('intro')).toBe('Target words is required');

      control.setErrors({ min: true });
      expect(component.getTargetWordsError('intro')).toContain('Must be at least');
    });
  });

  describe('telegram mode', () => {
    it('clears the bot token when switching to the CC bot', () => {
      component.podcastForm.patchValue({ tgBotToken: 'secret' });
      component.onTelegramModeChange('cc_bot');
      expect(component['telegramMode']).toBe('cc_bot');
      expect(component.podcastForm.get('tgBotToken')?.value).toBeNull();
    });

    it('keeps the bot token in custom-bot mode', () => {
      component.podcastForm.patchValue({ tgBotToken: 'secret' });
      component.onTelegramModeChange('custom_bot');
      expect(component['telegramMode']).toBe('custom_bot');
      expect(component.podcastForm.get('tgBotToken')?.value).toBe('secret');
    });

    it('reports telegram connectivity from a Success response', () => {
      component.podcastForm.patchValue({ tgResponse: 'Success. Connected.' });
      expect(component.telegramConnected).toBeTrue();
      component.podcastForm.patchValue({ tgResponse: 'Error: nope' });
      expect(component.telegramConnected).toBeFalse();
    });
  });

  describe('copy podcast url', () => {
    it('errors when the url is empty', () => {
      component.podcastForm.get('url')?.setValue('');
      component.copyPodcastUrl();
      expect(mockMessageService.error).toHaveBeenCalledWith('Podcast URL is empty');
      expect(mockClipboard.copy).not.toHaveBeenCalled();
    });

    it('reports success or failure from the clipboard', () => {
      component.podcastForm.get('url')?.setValue('https://pod.test/feed');
      mockClipboard.copy.and.returnValue(true);
      component.copyPodcastUrl();
      expect(mockClipboard.copy).toHaveBeenCalledWith('https://pod.test/feed');
      expect(mockMessageService.success).toHaveBeenCalledWith('Podcast URL copied to clipboard');

      mockClipboard.copy.and.returnValue(false);
      component.copyPodcastUrl();
      expect(mockMessageService.error).toHaveBeenCalledWith('Failed to copy podcast URL');
    });
  });

  describe('image and unsaved-change helpers', () => {
    it('builds the display image url with a cache buster, or null', () => {
      component.imageUrl = null;
      component.thumbnailUrl = null;
      expect(component.displayImageUrl).toBeNull();

      component.thumbnailUrl = 'https://cdn.test/thumb.png';
      component.imageCacheBuster = 42;
      expect(component.displayImageUrl).toBe('https://cdn.test/thumb.png?t=42');

      component.thumbnailUrl = 'https://cdn.test/thumb.png?v=1';
      expect(component.displayImageUrl).toBe('https://cdn.test/thumb.png?v=1&t=42');
      expect(component.hasPodcastImage).toBeTrue();
    });

    it('toggles the drag state on drag over and leave', () => {
      const over = new DragEvent('dragover');
      spyOn(over, 'preventDefault');
      component.onImageDragOver(over);
      expect(component.isDraggingImage).toBeTrue();
      expect(over.preventDefault).toHaveBeenCalled();

      component.onImageDragLeave(new DragEvent('dragleave'));
      expect(component.isDraggingImage).toBeFalse();
    });

    it('gates episode creation on unsaved changes', () => {
      component.podcastForm.markAsPristine();
      expect(component.hasUnsavedChanges).toBeFalse();
      expect(component.getEpisodeCreationButtonTooltip()).toBe('Create a new episode');
      component.podcastForm.markAsDirty();
      expect(component.hasUnsavedChanges).toBeTrue();
      expect(component.getEpisodeCreationButtonTooltip()).toContain('save your changes');
    });
  });

  describe('derived getters', () => {
    it('builds the public share url only with a uuid and name', () => {
      component.podcastForm.patchValue({ name: '' });
      expect(component.publicShareUrl).toBe('');
      component.podcastForm.get('uuid')?.setValue('pod-1');
      component.podcastForm.patchValue({ name: 'My Show' });
      expect(component.publicShareUrl).toBe('https://example.com/p/test-podcast-uuid');
      expect(mockShareService.buildPodcastUrl).toHaveBeenCalledWith('pod-1', 'My Show');
    });

    it('falls back from description to prompt', () => {
      component.podcastForm.patchValue({ description: '', prompt: 'the prompt' });
      expect(component.podcastDescription).toBe('the prompt');
      component.podcastForm.patchValue({ description: 'the description' });
      expect(component.podcastDescription).toBe('the description');
    });
  });
});
