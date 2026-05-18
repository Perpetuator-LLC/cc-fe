// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, ElementRef, inject, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, debounceTime, filter, switchMap, map } from 'rxjs';
import { MessageService } from '../../message.service';
import { PodcastsService, RssFeedResult } from '../podcasts.service';
import { ToolbarService } from '../../layout/toolbar.service';
import { TeamsResult, TeamsService } from '../../team/teams.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatButton, MatFabButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../confirmation-dialog/confirmation-dialog.component';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { AddRssFeedDialogComponent } from '../add-rss-feed-dialog/add-rss-feed-dialog.component';
import { RssFeedResultsDialogComponent } from '../rss-feed-results-dialog/rss-feed-results-dialog.component';
import { MatOption, MatSelect } from '@angular/material/select';
import { PodcastCategoriesComponent } from '../podcast-categories/podcast-categories.component';
import { tierToString, Voice, VoicesService, VoiceTier, voiceToTier } from '../voices.service';
import { AddVoiceDialogComponent } from '../add-voice-dialog/add-voice-dialog.component';
import { UserService } from '../../user/user.service';
import { RefreshVoicesDialogComponent } from '../refresh-voices-dialog/refresh-voices-dialog.component';
import { MatTabsModule } from '@angular/material/tabs';
import { DeletePodcastDialogComponent } from './delete-podcast-dialog/delete-podcast-dialog.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { LoadingService } from '../../layout/loading.service';
import { NewsService } from '../../news/news.service';
import { EpisodeService } from '../../episode/episode.service';
import { Job, JobService } from '../../jobs/job.service';
import { ResearchService } from '../../topics/research.service';
import { ShareButtonsComponent } from '../../share-buttons/share-buttons.component';
import { ShareService } from '../../share.service';
import { EpisodesTableComponent } from '../../episode/episodes-table/episodes-table.component';
import { RssFeedTableComponent } from '../rss-feed-table/rss-feed-table.component';
import {
  RegenerateImageDialogComponent,
  RegenerateImageDialogResult,
} from '../regenerate-image-dialog/regenerate-image-dialog.component';
import {
  ImageHistoryDialogComponent,
  ImageHistoryDialogData,
} from '../image-history-dialog/image-history-dialog.component';
import { VoiceSelectorComponent } from '../../shared/voice-selector/voice-selector.component';
import { ScheduleListComponent } from '../../shared/scheduling/schedule-list/schedule-list.component';
import { MatRadioModule } from '@angular/material/radio';
import { IncludesPipe, StartsWithPipe } from '../../shared/pipes';

@Component({
  selector: 'app-podcast-detail',
  templateUrl: './podcast-detail.component.html',
  styleUrls: ['./podcast-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,

    MatProgressSpinner,
    MatProgressBarModule,
    ReactiveFormsModule,
    MatFormField,
    MatFormFieldModule,
    MatButton,
    MatMenuModule,
    MatButtonModule,
    MatIcon,
    MatLabel,
    MatInput,
    MatIconButton,
    MatCardContent,
    MatFabButton,
    MatCheckbox,
    MatTooltip,
    FormsModule,
    MatCard,
    MatSelect,
    MatOption,
    PodcastCategoriesComponent,
    MatTabsModule,
    CdkTextareaAutosize,
    ShareButtonsComponent,
    EpisodesTableComponent,
    RssFeedTableComponent,
    VoiceSelectorComponent,
    ScheduleListComponent,
    MatRadioModule,
    StartsWithPipe,
    IncludesPipe,
  ],
})
export class PodcastDetailComponent implements OnInit, OnDestroy {
  // Minimum words required beyond intro + outro
  private static readonly MIN_ADDITIONAL_WORDS = 50;

  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  podcastForm: FormGroup;
  private subscriptions = new Subscription();
  protected loading = true;
  protected rssFeedLoading = false;
  protected podcastUuid: string;
  protected urlDisabled = true;
  protected deleteConfirmation = '';
  selectedFile: File | null = null;
  previewImage: string | ArrayBuffer | null = null;
  protected teams: TeamsResult[] = [];
  protected loadingTeams = false;
  protected voices: Voice[] = [];
  protected loadingVoices = false;
  protected selectedVoiceUuid: string | null = null;
  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;
  voiceFilter = new FormControl<VoiceTier[]>([]);
  voiceTiers = Object.values(VoiceTier);
  currentPlayingVoice: Voice | null = null;
  private audioPlayTimeout: ReturnType<typeof setTimeout> | null = null;
  protected lastSubmittedCategories: Record<string, string[]> = {};
  private pendingSubmitCategories: Record<string, string[]> = {};
  voiceSearchControl = new FormControl<string>('');
  private tierFilteredVoices: Voice[] = [];
  protected filteredVoices: Voice[] = [];
  isEditing = false;
  private savedScrollPosition = 0;
  protected selectedTabIndex = 0;
  // Debounce flags for create episode buttons
  protected creatingNewsEpisode = false;
  protected creatingResearchEpisode = false;
  protected generatingImage = false;
  protected telegramMode: 'cc_bot' | 'custom_bot' = 'cc_bot';
  protected readonly CC_BOT_USERNAME = '@capital_copilot_bot';
  private readonly tabNames = [
    'episodes',
    'settings',
    'content',
    'voice',
    'categories',
    'publishing',
    'rss-feeds',
    'schedules',
    'danger-zone',
  ];

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly toolbarService = inject(ToolbarService);
  private readonly podcastsService = inject(PodcastsService);
  private readonly teamService = inject(TeamsService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly clipboard = inject(Clipboard);
  private readonly voicesService = inject(VoicesService);
  protected readonly userService = inject(UserService);
  private readonly loadingService = inject(LoadingService);
  private readonly newsService = inject(NewsService);
  private readonly episodeService = inject(EpisodeService);
  private readonly jobService = inject(JobService);
  private readonly researchService = inject(ResearchService);
  protected readonly shareService = inject(ShareService);

  constructor() {
    const uuidParam = this.route.snapshot.paramMap.get('uuid');
    if (!uuidParam) {
      throw new Error('Failed to get Podcast ID from route.');
    }
    // Extract UUID from slug (handles both 'uuid' and 'uuid-slug-name' formats)
    this.podcastUuid = this.shareService.extractIdFromSlugParam(uuidParam);

    this.podcastForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      uuid: [{ value: '', disabled: true }],
      team: [null],
      name: [''],
      intro: [''],
      prompt: [''],
      newsPrompt: [''],
      newsTargetWords: [450, [Validators.required, Validators.min(50)]],
      researchPrompt: [''],
      researchTargetWords: [1400, [Validators.required, Validators.min(50)]],
      outro: [''],
      enabled: [false],
      createdAt: [{ value: '', disabled: true }],
      slug: [{ value: '', disabled: true }],
      url: [{ value: '', disabled: true }],
      description: [''],
      ownerName: [''],
      ownerEmail: [''],
      ownerLink: [''],
      image: [null],
      imageUrl: [null],
      thumbnailUrl: [null],
      rssFeeds: this.fb.array([]),
      tgBotToken: [null],
      tgChannelId: [null],
      tgResponse: [null],
      categories: [{}],
      voice: [null],
    });

    this.podcastForm.get('enabled')?.valueChanges.subscribe((enabled) => {
      const podcast = this.podcastForm.getRawValue();
      const slugControl = this.podcastForm.get('slug');
      if (enabled != slugControl?.disabled) {
        // console.debug('Podcast slug control already enabled');
        return;
      }
      podcast.enabled = enabled;
      this.urlDisabled = !enabled;
      if (enabled) {
        // if the podcast slug is empty snake case the podcast name
        const podcastName = podcast.name;
        if (!podcast.slug && podcastName) {
          podcast.slug = podcastName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        }
        slugControl?.enable();
      } else {
        slugControl?.disable();
      }
      this.podcastForm.patchValue(podcast);
      // Detect Telegram mode from loaded data
      if (podcast.tgBotToken) {
        this.telegramMode = 'custom_bot';
      } else {
        this.telegramMode = 'cc_bot';
      }
    });

    this.subscriptions.add(
      this.voiceSearchControl.valueChanges.pipe(debounceTime(1000)).subscribe((searchTerm) => {
        this.applyVoiceSearch(searchTerm);
      }),
    );
  }

  imageUrl: string | null = null;
  thumbnailUrl: string | null = null;
  isDraggingImage = false;
  // Cache buster to force browser to reload image after regeneration/revert
  imageCacheBuster = Date.now();

  ngOnInit(): void {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);

    // Initialize tab from query parameter
    this.subscriptions.add(
      this.route.queryParams.subscribe((params) => {
        const tabParam = params['tab'];
        if (tabParam) {
          const tabIndex = this.tabNames.indexOf(tabParam);
          if (tabIndex !== -1) {
            this.selectedTabIndex = tabIndex;
          }
        }
      }),
    );

    this.loading = true;
    this.refreshPodcastData();
    this.imageUrl = this.podcastForm.get('imageUrl')?.value;
    this.thumbnailUrl = this.podcastForm.get('thumbnailUrl')?.value;
    this.subscriptions.add(
      this.podcastForm.get('imageUrl')?.valueChanges.subscribe((value) => {
        this.imageUrl = value;
        // Update cache buster when image URL changes to force browser reload
        this.imageCacheBuster = Date.now();
      }),
    );
    this.subscriptions.add(
      this.podcastForm.get('thumbnailUrl')?.valueChanges.subscribe((value) => {
        this.thumbnailUrl = value;
        // Update cache buster when thumbnail URL changes to force browser reload
        this.imageCacheBuster = Date.now();
      }),
    );
    this.loadTeams();
    this.applyVoiceFilters();

    this.subscriptions.add(
      this.podcastForm.valueChanges
        .pipe(
          debounceTime(1000),
          filter(() => this.podcastForm.valid && this.podcastForm.dirty),
          filter(() => {
            const { enabled, slug } = this.podcastForm.getRawValue();
            return !(enabled && !slug);
          }),
          switchMap((valueToSubmit) => {
            // Save scroll position before submitting
            this.savedScrollPosition = window.scrollY;

            // Only update pendingSubmitCategories here
            this.pendingSubmitCategories = { ...valueToSubmit.categories };
            const {
              team,
              name,
              intro,
              prompt,
              newsPrompt,
              newsTargetWords,
              researchPrompt,
              researchTargetWords,
              outro,
              enabled,
              slug,
              description,
              ownerName,
              ownerEmail,
              ownerLink,
              tgBotToken,
              tgChannelId,
              categories,
              voice,
            } = valueToSubmit;
            return this.podcastsService
              .updatePodcast(
                this.podcastUuid,
                team ? team.uuid : null,
                name,
                intro,
                prompt,
                newsPrompt,
                newsTargetWords,
                researchPrompt,
                researchTargetWords,
                outro,
                enabled,
                slug,
                description,
                ownerName,
                ownerEmail,
                ownerLink,
                tgBotToken,
                tgChannelId,
                null,
                categories,
                voice ? voice.uuid : null,
              )
              .pipe(
                // Pass the submitted value along with the result
                map((result) => ({ result, submittedValue: valueToSubmit })),
              );
          }),
        )
        .subscribe({
          next: ({ result }) => {
            if (result.success) {
              // Update lastSubmittedCategories only when server confirms
              this.lastSubmittedCategories = { ...this.pendingSubmitCategories };

              // Don't patch the form with server response during auto-save to avoid thrashing
              // The server response should match what we sent, so patching is unnecessary
              // Only update fields that the server might have changed (like url when enabling podcast)
              const serverData = result.podcast;
              this.podcastForm.patchValue(
                {
                  url: serverData.url,
                },
                { emitEvent: false },
              );

              // Reset dirty flag since we successfully saved
              this.podcastForm.markAsPristine();
              this.pendingSubmitCategories = {};

              // Restore scroll position after change detection
              setTimeout(() => {
                window.scrollTo(0, this.savedScrollPosition);
              }, 0);

              this.messageService.success('Podcast updated successfully', 3000);
            } else {
              this.messageService.error(result.message);
            }
          },
          error: (err) => {
            this.messageService.error(`Failed to update podcast: ${err.message}`);
          },
        }),
    );

    this.applyVoiceFilters();
  }

  getVoiceDisplayName(voice: Voice): string {
    const tier = voiceToTier(voice);
    return (
      `${voice.displayName ?? 'Name not set'} - ${tierToString(tier) ?? 'Tier not set'}` +
      ` (${Math.round(voice.creditsPerMillionChar / 1000)} CPM)`
    );
  }

  // Modify loadVoices to store results and apply search
  private loadVoices(tiers?: VoiceTier[], enabled?: boolean): void {
    this.loadingVoices = true;
    this.subscriptions.add(
      this.voicesService.getVoices(tiers, enabled).subscribe({
        next: (response) => {
          this.tierFilteredVoices = response.voices; // Store the tier-filtered list
          this.applyVoiceSearch(this.voiceSearchControl.value); // Apply current search term
          this.loadingVoices = false;
          // Ensure the selected voice is still in the filtered list
          const currentVoice = this.podcastForm.get('voice')?.value;
          if (currentVoice && !this.filteredVoices.some((v) => v.uuid === currentVoice.uuid)) {
            // Optionally clear the selection if the current voice is filtered out
            // this.podcastForm.get('voice')?.setValue(null);
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to load voices: ${err.message}`);
          this.loadingVoices = false;
          this.tierFilteredVoices = [];
          this.filteredVoices = [];
        },
      }),
    );
  }

  compareVoices(o1: Voice | null, o2: Voice | null): boolean {
    return !!o1 && !!o2 && o1.uuid === o2.uuid;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  displayVoice(voice: any): string {
    return voice ? this.getVoiceDisplayName(voice) : '';
  }

  protected onTabChange(index: number): void {
    this.selectedTabIndex = index;
    const tabName = this.tabNames[index];
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabName },
      queryParamsHandling: 'merge',
    });
  }

  playVoiceSample(voice: Voice): void {
    if (this.audioPlayTimeout) {
      clearTimeout(this.audioPlayTimeout);
    }

    this.audioPlayTimeout = setTimeout(() => {
      if (!voice.sampleUrl) return;

      const audio = this.audioPlayer.nativeElement;
      audio.src = voice.sampleUrl;
      audio.load();
      audio.play().catch((err) => {
        if (err.name === 'AbortError') {
          return; // User interrupted playback
        }
        this.messageService.error(`Failed to play audio sample: ${err.message}`);
      });
      this.currentPlayingVoice = voice;
      this.audioPlayTimeout = null;
    }, 100);
  }

  stopVoiceSample(): void {
    if (this.audioPlayTimeout) {
      clearTimeout(this.audioPlayTimeout);
      this.audioPlayTimeout = null;
    }

    const audio = this.audioPlayer.nativeElement;
    if (!audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.currentPlayingVoice = null;
  }

  private applyVoiceSearch(searchTerm: string | null): void {
    const lowerCaseSearchTerm = (searchTerm || '').toLowerCase().trim();
    if (!lowerCaseSearchTerm) {
      this.filteredVoices = [...this.tierFilteredVoices]; // No search term, show all tier-filtered voices
    } else {
      this.filteredVoices = this.tierFilteredVoices.filter((voice) =>
        (voice.displayName || '').toLowerCase().includes(lowerCaseSearchTerm),
      );
    }
  }

  applyVoiceFilters(): void {
    const selectedTiers = this.voiceFilter.value;
    const enabled = true;
    // Reset search control without emitting event to avoid double filtering initially
    // this.voiceSearchControl.setValue('', { emitEvent: false });
    this.loadVoices(selectedTiers?.length ? selectedTiers : undefined, enabled);
  }

  clearVoiceFilters(): void {
    this.voiceFilter.setValue([]);
    this.voiceSearchControl.setValue(''); // This will trigger the valueChanges subscription
    // loadVoices will be called implicitly by voiceSearchControl change if needed,
    // but explicitly calling it ensures tiers are also reset.
    this.loadVoices();
  }

  private loadTeams(): void {
    this.loadingTeams = true;
    this.subscriptions.add(
      this.teamService.getTeams().subscribe({
        next: (response: { teams: TeamsResult[] }) => {
          this.teams = response.teams;
          this.loadingTeams = false;
        },
        error: (err: { message: string }) => {
          this.messageService.error(`Failed to load teams: ${err.message}`);
          this.loadingTeams = false;
        },
        complete: () => {
          this.loadingTeams = false;
        },
      }),
    );
  }

  openAddVoiceDialog(): void {
    const dialogRef = this.dialog.open(AddVoiceDialogComponent, {
      // width: '1200px',
      panelClass: 'add-voice-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.createCustomVoice(result);
      }
    });
  }

  createCustomVoice(voiceData: {
    externalId: string;
    model: string;
    externalUserId: string;
    displayName: string;
  }): void {
    this.voicesService
      .createVoice(voiceData.model, voiceData.externalId, voiceData.externalUserId, voiceData.displayName)
      .subscribe({
        next: () => {
          this.messageService.success('Voice added successfully');
          this.applyVoiceFilters();
        },
        error: (err) => {
          this.messageService.error(`Failed to add voice: ${err.message}`);
        },
      });
  }

  compareTeams(o1: TeamsResult | null, o2: TeamsResult | null): boolean {
    return !!o1 && !!o2 && o1.uuid === o2.uuid;
  }

  private refreshPodcastData() {
    this.loading = true;
    this.loadingService.show();
    this.subscriptions.add(
      this.podcastsService.getPodcastById(this.podcastUuid).subscribe({
        next: (podcast) => {
          this.podcastForm.patchValue(podcast);
          this.setRssFeeds(podcast.rssFeeds);
          this.lastSubmittedCategories = podcast.categories as Record<string, string[]>;
          this.loading = false;
          this.loadingService.hide();
        },
        error: (err) => {
          this.loading = false;
          this.loadingService.hide();
          this.messageService.error(`Failed to retrieve podcast data: ${err.message}`);
        },
        complete: () => {
          this.loading = false;
          this.loadingService.hide();
        },
      }),
    );
  }

  refreshTelegram() {
    const { uuid } = this.podcastForm.getRawValue();
    this.podcastsService.refreshTgResponse(uuid).subscribe({
      next: () => {
        this.messageService.success(`Podcast Telegram response refreshed successfully`);
      },
      error: (err) => {
        this.messageService.error(`Failed to refresh Telegram response: ${err.message}`);
      },
    });
  }

  onTelegramModeChange(mode: 'cc_bot' | 'custom_bot'): void {
    this.telegramMode = mode;
    if (mode === 'cc_bot') {
      this.podcastForm.patchValue({ tgBotToken: null });
    }
  }

  savePodcast() {
    if (!this.podcastForm.valid) {
      return;
    }
    const {
      uuid,
      team,
      name,
      intro,
      prompt,
      newsPrompt,
      newsTargetWords,
      researchPrompt,
      researchTargetWords,
      outro,
      enabled,
      slug,
      description,
      ownerName,
      ownerEmail,
      ownerLink,
      tgBotToken,
      tgChannelId,
      categories,
      voice,
    } = this.podcastForm.getRawValue();
    if (enabled && !slug) {
      this.messageService.error('Podcast slug is required when podcast is enabled');
      return;
    }
    const saveObservable = this.podcastsService.updatePodcast(
      uuid,
      team ? team.uuid : null,
      name,
      intro,
      prompt,
      newsPrompt,
      newsTargetWords,
      researchPrompt,
      researchTargetWords,
      outro,
      enabled,
      slug,
      description,
      ownerName,
      ownerEmail,
      ownerLink,
      tgBotToken,
      tgChannelId,
      null,
      categories,
      voice ? voice.uuid : null,
    );

    this.subscriptions.add(
      saveObservable.subscribe({
        next: (data) => {
          if (!data.success) {
            this.messageService.error(data.message);
            return;
          }
          this.messageService.success(`Podcast ${uuid ? 'updated' : 'created'} successfully`);
          this.podcastForm.patchValue(data.podcast);
          this.podcastForm.markAsPristine();
          if (!uuid) {
            this.router.navigate(['/media/podcasts']);
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to ${uuid ? 'update' : 'create'} podcast: ${err.message}`);
        },
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.loadingService.hide();
    this.toolbarService.clearToolbarComponent();
  }

  copyPodcastUrl() {
    const url = this.podcastForm.get('url')?.value;
    if (!url || url === '') {
      this.messageService.error('Podcast URL is empty');
      return;
    }
    if (this.clipboard.copy(url)) {
      this.messageService.success('Podcast URL copied to clipboard');
    } else {
      this.messageService.error('Failed to copy podcast URL');
    }
  }

  deletePodcastDialog(): void {
    const dialogRef = this.dialog.open(DeletePodcastDialogComponent, {
      width: '500px',
      data: { podcastName: this.podcastForm.get('name')?.value },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.podcastsService.deletePodcast(this.podcastUuid, result).subscribe({
          next: () => {
            this.messageService.success('Podcast deleted successfully');
            this.router.navigate(['/media/podcasts']);
          },
          error: (error) => {
            this.messageService.error(`Failed to delete podcast: ${error.message}`);
          },
        });
      }
    });
  }

  onPodcastImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.handleImageFile(file);
    }
  }

  private uploadPodcastImage(file: File) {
    this.podcastsService.uploadPodcastImage(this.podcastUuid, file).subscribe({
      next: () => {
        // TODO: Handle response properly based on API design? even on success this was failing
        // if (!response.success) {
        this.messageService.success('Podcast image uploaded successfully');
        this.selectedFile = null;
        this.podcastForm.get('image')?.reset();
        // Refresh podcast data to update Apollo cache with new imageUrl and thumbnailUrl
        this.refreshPodcastData();
        // } else {
        //   this.messageService.error(response.message);
        // }
      },
      error: (error) => {
        this.messageService.error(`Failed to upload podcast image: ${error.message}`);
        this.selectedFile = null;
        this.podcastForm.get('image')?.reset();
      },
    });
  }

  deletePodcastImage() {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message: 'Are you sure you want to delete this podcast image?',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.podcastsService.deletePodcastImage(this.podcastUuid).subscribe({
          next: (data) => {
            if (!data.success) {
              this.messageService.error(data.message);
              return;
            }
            this.messageService.success('Podcast image deleted successfully');
            this.refreshPodcastData();
          },
          error: (err) => {
            this.messageService.error(`Failed to delete podcast image: ${err.message}`);
          },
        });
      }
    });
  }

  /**
   * Open dialog to regenerate podcast cover image using AI
   */
  regenerateImage(): void {
    const dialogRef = this.dialog.open(RegenerateImageDialogComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe((result: RegenerateImageDialogResult | undefined) => {
      if (result) {
        this.generatingImage = true;
        this.podcastsService.regeneratePodcastImage(this.podcastUuid, result.customPromptHint).subscribe({
          next: ({ job }) => {
            this.jobService.addJob(job);
            this.messageService.success('Image generation started. This may take a few moments.');
            // Subscribe to WebSocket events for this job
            this.subscribeToImageGenerationJob(job.uuid);
          },
          error: (err) => {
            this.generatingImage = false;
            this.messageService.error(`Failed to start image generation: ${err.message}`);
          },
        });
      }
    });
  }

  /**
   * Subscribe to WebSocket job events for image generation
   */
  private subscribeToImageGenerationJob(jobUuid: string): void {
    // Subscribe to job completed events
    const completedSub = this.jobService.jobCompleted$.subscribe((job) => {
      if (job.uuid === jobUuid) {
        this.generatingImage = false;
        this.messageService.success('Podcast cover image generated successfully!');
        this.refreshPodcastData();
        completedSub.unsubscribe();
        failedSub.unsubscribe();
      }
    });

    // Subscribe to job failed events
    const failedSub = this.jobService.jobFailed$.subscribe((job) => {
      if (job.uuid === jobUuid) {
        this.generatingImage = false;
        this.messageService.error(`Image generation failed: ${job.error || 'Unknown error'}`);
        completedSub.unsubscribe();
        failedSub.unsubscribe();
      }
    });

    // Add to component subscriptions so they get cleaned up on destroy
    this.subscriptions.add(completedSub);
    this.subscriptions.add(failedSub);

    // Safety timeout after 5 minutes
    setTimeout(
      () => {
        if (this.generatingImage) {
          this.generatingImage = false;
          this.messageService.error('Image generation timed out. Please check job status.');
          completedSub.unsubscribe();
          failedSub.unsubscribe();
        }
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Open dialog to view and manage image history
   */
  openImageHistory(): void {
    const dialogRef = this.dialog.open(ImageHistoryDialogComponent, {
      width: '600px',
      data: { podcastUuid: this.podcastUuid } as ImageHistoryDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.reverted) {
        this.refreshPodcastData();
      }
    });
  }

  /**
   * Get the display image URL with cache-busting parameter
   * This ensures the browser reloads the image after regeneration/revert
   */
  get displayImageUrl(): string | null {
    const url = this.thumbnailUrl || this.imageUrl;
    if (!url) return null;
    // Add cache buster as query parameter
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${this.imageCacheBuster}`;
  }

  protected viewFullImage(): void {
    if (!this.imageUrl) return;
    window.open(this.imageUrl, '_blank');
  }

  onImageDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingImage = true;
  }

  onImageDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingImage = false;
  }

  onImageDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingImage = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.handleImageFile(file);
    }
  }

  private handleImageFile(file: File): void {
    // Supported MIME types per BE69: JPEG, PNG, WEBP, GIF
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!supportedTypes.includes(file.type)) {
      this.messageService.error('Please upload an image file (JPEG, PNG, WEBP, or GIF)');
      return;
    }

    // Check file size (5MB = 5242880 bytes) per BE69
    const maxSizeInBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      this.messageService.error('File size exceeds the maximum limit of 5MB. Please upload a smaller image.');
      return;
    }

    this.selectedFile = file;

    // Preview the image
    const reader = new FileReader();
    reader.onload = () => {
      this.previewImage = reader.result;
    };
    reader.readAsDataURL(this.selectedFile);

    this.uploadPodcastImage(file);
  }

  get rssFeeds(): FormArray {
    return this.podcastForm.get('rssFeeds') as FormArray;
  }

  openAddRssFeedDialog(): void {
    const dialogRef = this.dialog.open(AddRssFeedDialogComponent, {
      width: '600px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.urls) {
        this.addRssFeedsInBulk(result.urls);
      }
    });
  }

  private async addRssFeedsInBulk(urls: string[]): Promise<void> {
    this.rssFeedLoading = true;
    const successful: string[] = [];
    const failed: { url: string; error: string }[] = [];

    // Create progress message
    const progressTimestamp = this.messageService.progress(
      `Processing RSS feeds: 0 of ${urls.length} completed`,
      0,
      false,
    );

    // Process 5 URLs at a time in parallel
    const batchSize = 5;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const promises = batch.map((url) => this.processSingleRssFeed(url));

      const results = await Promise.allSettled(promises);

      results.forEach((result, index) => {
        const url = batch[index];
        if (result.status === 'fulfilled' && result.value.success) {
          successful.push(url);
        } else {
          const errorMsg =
            result.status === 'rejected'
              ? result.reason?.message || 'Unknown error'
              : result.value.error || 'Failed to add feed';
          failed.push({ url, error: errorMsg });
        }
      });

      // Calculate progress
      const processed = i + batch.length;
      const progressPercent = Math.round((processed / urls.length) * 100);

      // Update progress message
      this.messageService.updateProgress(
        progressTimestamp,
        `Processing RSS feeds: ${processed} of ${urls.length} completed
        (${successful.length} successful, ${failed.length} failed)`,
        progressPercent,
      );

      // Partial save after each batch if there are successful feeds
      if (successful.length > 0) {
        try {
          await this.updateRssFeedsAsync();
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
          this.messageService.error(`Failed to save batch: ${errorMessage}`);
        }
      }
    }

    this.rssFeedLoading = false;

    // Remove progress message
    this.messageService.removeMessage(progressTimestamp);

    // Show completion message
    if (successful.length > 0 && failed.length === 0) {
      this.messageService.success(`Successfully added ${successful.length} RSS feed(s)`);
    } else if (successful.length > 0 && failed.length > 0) {
      this.messageService.warning(`Added ${successful.length} RSS feed(s), but ${failed.length} failed`);
    } else if (failed.length > 0) {
      this.messageService.error(`Failed to add all ${failed.length} RSS feed(s)`);
    }

    // Show results dialog
    this.dialog.open(RssFeedResultsDialogComponent, {
      width: '700px',
      data: { successful, failed },
    });
  }

  private processSingleRssFeed(url: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.podcastsService.createRssFeed(url).subscribe({
        next: (data) => {
          if (!data.rssFeed) {
            resolve({ success: false, error: 'RSS Feed creation returned null' });
            return;
          }
          const existingId = this.rssFeeds.controls.findIndex((a) => a.get('uuid')?.value == data.rssFeed.uuid);
          if (existingId >= 0) {
            resolve({ success: false, error: 'RSS Feed already exists' });
            return;
          }
          this.rssFeeds.push(
            this.fb.group({
              id: [data.rssFeed.id, Validators.required],
              uuid: [data.rssFeed.uuid, Validators.required],
              url: [data.rssFeed.url, Validators.required],
              name: [data.rssFeed.name],
              isReachable: [data.rssFeed.isReachable],
              isParsable: [data.rssFeed.isParsable],
              lastFetchAttempt: [data.rssFeed.lastFetchAttempt],
              articlesPerDay: [data.rssFeed.articlesPerDay],
            }),
          );
          resolve({ success: true });
        },
        error: (err) => {
          resolve({ success: false, error: err.message || 'Failed to create RSS feed' });
        },
      });
    });
  }

  private updateRssFeedsAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      const rssFeedIds = this.rssFeeds.value.map((feed: RssFeedResult) => feed.uuid);
      this.podcastsService.setPodcastRssFeeds(this.podcastUuid, rssFeedIds).subscribe({
        next: (data) => {
          this.podcastForm.patchValue(data.podcast);
          // Refresh RSS feeds with updated status information
          if (data.podcast.rssFeeds) {
            this.setRssFeeds(data.podcast.rssFeeds);
          }
          resolve();
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  }

  addRssFeed(url: string): void {
    this.rssFeedLoading = true;
    this.subscriptions.add(
      this.podcastsService.createRssFeed(url).subscribe({
        next: (data) => {
          const existingId = this.rssFeeds.controls.findIndex((a) => a.get('uuid')?.value == data.rssFeed.uuid);
          if (existingId >= 0) {
            this.messageService.info('RSS Feed already exists');
            this.rssFeedLoading = false;
            return;
          }
          this.rssFeeds.push(
            this.fb.group({
              id: [data.rssFeed.id, Validators.required],
              uuid: [data.rssFeed.uuid, Validators.required],
              url: [data.rssFeed.url, Validators.required],
              name: [data.rssFeed.name],
              isReachable: [data.rssFeed.isReachable],
              isParsable: [data.rssFeed.isParsable],
              lastFetchAttempt: [data.rssFeed.lastFetchAttempt],
              articlesPerDay: [data.rssFeed.articlesPerDay],
            }),
          );
          this.updateRssFeeds();
        },
        error: (err) => {
          this.messageService.error(`Failed to update RSS Feeds: ${err.message}`);
          this.rssFeedLoading = false;
        },
      }),
    );
  }

  private setRssFeeds(rssFeeds: RssFeedResult[]): void {
    const rssFeedsFormArray = this.rssFeeds;
    rssFeedsFormArray.clear();
    rssFeeds.forEach((feed) => {
      rssFeedsFormArray.push(
        this.fb.group({
          id: [feed.id, Validators.required],
          uuid: [feed.uuid, Validators.required],
          url: [feed.url, Validators.required],
          name: [feed.name],
          isReachable: [feed.isReachable],
          isParsable: [feed.isParsable],
          lastFetchAttempt: [feed.lastFetchAttempt],
          articlesPerDay: [feed.articlesPerDay],
        }),
      );
    });
  }

  removeRssFeed(feedId: string): void {
    this.rssFeeds.removeAt(this.rssFeeds.controls.findIndex((control) => control.get('uuid')?.value === feedId));
    this.updateRssFeeds();
  }

  copyAllRssFeedUrls(): void {
    const feeds = this.podcastForm.get('rssFeeds')?.value || [];
    if (feeds.length === 0) {
      this.messageService.warning('No RSS feeds to copy');
      return;
    }

    const urls = feeds.map((feed: RssFeedResult) => feed.url).join('\n');
    navigator.clipboard.writeText(urls).then(
      () => {
        this.messageService.success(`Copied ${feeds.length} RSS feed URL${feeds.length > 1 ? 's' : ''} to clipboard`);
      },
      (err) => {
        this.messageService.error(`Failed to copy URLs: ${err.message}`);
      },
    );
  }

  private updateRssFeeds(): void {
    this.rssFeedLoading = true;
    const rssFeedIds = this.rssFeeds.value.map((feed: RssFeedResult) => feed.uuid);
    this.podcastsService.setPodcastRssFeeds(this.podcastUuid, rssFeedIds).subscribe({
      next: (data) => {
        this.podcastForm.patchValue(data.podcast);
        // Refresh RSS feeds with updated status information
        if (data.podcast.rssFeeds) {
          this.setRssFeeds(data.podcast.rssFeeds);
        }
        this.rssFeedLoading = false;
        this.messageService.success('RSS Feeds updated successfully');
      },
      error: (err) => {
        this.refreshPodcastData();
        this.rssFeedLoading = false;
        this.messageService.error(`Failed to update RSS Feeds: ${err.message}`);
      },
    });
  }

  // Helper method to count words in a string
  private countWords(text: string | null): number {
    if (!text) return 0;
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  // Calculate minimum allowed target words based on intro/outro
  getMinimumTargetWords(): number {
    const intro = this.podcastForm.get('intro')?.value;
    const outro = this.podcastForm.get('outro')?.value;
    const introWords = this.countWords(intro);
    const outroWords = this.countWords(outro);
    return introWords + outroWords + PodcastDetailComponent.MIN_ADDITIONAL_WORDS;
  }

  // Get error message for target words validation
  getTargetWordsError(fieldName: string): string | null {
    const control = this.podcastForm.get(fieldName);
    if (!control || !control.errors) return null;

    const minRequired = this.getMinimumTargetWords();
    const value = control.value;

    if (control.errors['required']) {
      return 'Target words is required';
    }
    if (control.errors['min'] || (value && value < minRequired)) {
      return `Must be at least ${minRequired} words (intro + outro + ${PodcastDetailComponent.MIN_ADDITIONAL_WORDS})`;
    }
    return null;
  }

  protected readonly tierToString = tierToString;

  protected openRefreshVoicesDialog(): void {
    const dialogRef = this.dialog.open(RefreshVoicesDialogComponent, {
      width: '500px', // Adjust width as needed
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.success) {
        this.messageService.success(result.message || 'Voices refreshed successfully.');
        // Optionally reload voices if needed, e.g., by calling applyVoiceFilters()
        this.applyVoiceFilters();
      } else if (result?.message) {
        // Handle potential errors reported from the dialog/service even if success is false
        this.messageService.error(result.message);
      }
      // Handle cancellation or other cases if necessary
    });
  }

  // Add this helper method to check if a voice is selected
  isVoiceSelected(voice: Voice): boolean {
    const selected = this.podcastForm.get('voice')?.value;
    return selected && selected.uuid === voice.uuid;
  }

  // Handle voice selection from shared voice selector
  onVoiceSelected(voice: Voice): void {
    this.finfo(voice);
  }

  // Update finfo to select the voice
  finfo(voice: Voice) {
    this.podcastForm.get('voice')?.setValue(voice);
    this.savePodcast(); // Immediately hit the API after selection
  }

  onCheckboxChange(event: MatCheckboxChange, tier: VoiceTier) {
    const current = this.voiceFilter.value || [];

    if (event.checked) {
      this.voiceFilter.setValue([...current, tier]);
    } else {
      this.voiceFilter.setValue(current.filter((t) => t !== tier));
    }

    this.applyVoiceFilters();
  }

  createBlankEpisode() {
    const newsUuids: string[] = [];
    this.subscriptions.add(
      this.newsService.createEpisode(newsUuids, this.podcastUuid).subscribe({
        next: (data: { job: Job }) => {
          this.messageService.info('Creating blank episode...');
          this.jobService.addJob(data.job);
        },
        error: (err: Error) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  createNewsEpisode() {
    if (this.creatingNewsEpisode) {
      return; // Prevent double-click
    }
    this.creatingNewsEpisode = true;

    this.subscriptions.add(
      this.podcastsService.createLatestNewsEpisodeChain(this.podcastUuid).subscribe({
        next: (data) => {
          this.creatingNewsEpisode = false;
          if (!data.jobs || data.jobs.length === 0) {
            this.messageService.error('Failed to create latest episode: No jobs returned');
            return;
          }
          this.messageService.info('Creating latest episode from news...');
          data.jobs.forEach((job) => {
            this.jobService.addJob(job);
          });
        },
        error: (err: { message: string }) => {
          this.creatingNewsEpisode = false;
          this.messageService.error(err.message);
        },
      }),
    );
  }

  createResearchEpisode() {
    if (this.creatingResearchEpisode) {
      return; // Prevent double-click
    }
    this.creatingResearchEpisode = true;

    this.subscriptions.add(
      this.researchService.createResearchChain(this.podcastUuid).subscribe({
        next: (data) => {
          this.creatingResearchEpisode = false;
          if (!data.jobs || data.jobs.length === 0) {
            this.messageService.error('Failed to start research: No jobs returned');
            return;
          }
          this.messageService.info(`Research started! ${data.jobs.length} jobs created.`);
          data.jobs.forEach((job) => {
            this.jobService.addJob(job);
          });
        },
        error: (err: { message: string }) => {
          this.creatingResearchEpisode = false;
          this.messageService.error(`Failed to start research: ${err.message}`);
        },
      }),
    );
  }

  hasUnsavedChanges(): boolean {
    return this.podcastForm.dirty;
  }

  getEpisodeCreationButtonTooltip(): string {
    if (this.hasUnsavedChanges()) {
      return 'Please save your changes before creating an episode';
    }
    return 'Create a new episode';
  }

  getPublicShareUrl(): string {
    const podcast = this.podcastForm.getRawValue();
    if (!podcast.uuid || !podcast.name) {
      return '';
    }
    return this.shareService.buildPodcastUrl(podcast.uuid, podcast.name);
  }

  getPodcastDescription(): string {
    const podcast = this.podcastForm.getRawValue();
    return podcast.description || podcast.prompt || '';
  }
}
