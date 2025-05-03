// Copyright (c) 2025 Perpetuator LLC
import { Component, ElementRef, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
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
import { Subscription, debounceTime } from 'rxjs';
import { MessageService } from '../message.service';
import { PodcastsService, RssFeedResult } from '../podcasts.service';
import { ToolbarService } from '../toolbar.service';
import { MessageComponent } from '../message/message.component';
import { TeamsResult, TeamsService } from '../teams.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField } from '@angular/material/form-field';
import { MatButton, MatFabButton, MatIconButton } from '@angular/material/button';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
} from '@angular/material/table';
import { MatIcon } from '@angular/material/icon';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelDescription,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatDivider } from '@angular/material/divider';
import { AddRssFeedDialogComponent } from '../add-rss-feed-dialog/add-rss-feed-dialog.component';
import { MatOption, MatSelect, MatSelectTrigger } from '@angular/material/select';
import { PodcastCategoriesComponent } from '../podcast-categories/podcast-categories.component';
import { tierToString, Voice, VoicesService, VoiceTier, voiceToTier } from '../voices.service';

@Component({
  selector: 'app-podcast-detail',
  templateUrl: './podcast-detail.component.html',
  styleUrls: ['./podcast-detail.component.scss'],
  standalone: true,
  imports: [
    MessageComponent,
    MatProgressSpinner,
    ReactiveFormsModule,
    MatFormField,
    MatButton,
    MatTable,
    MatHeaderCell,
    MatCell,
    MatColumnDef,
    MatHeaderCellDef,
    MatCellDef,
    MatHeaderRow,
    MatRow,
    MatRowDef,
    MatIcon,
    MatLabel,
    MatInput,
    MatIconButton,
    MatHeaderRowDef,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatFabButton,
    MatCheckbox,
    MatTooltip,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    MatSelectTrigger,
    FormsModule,
    MatDivider,
    MatCard,
    MatSelect,
    MatOption,
    PodcastCategoriesComponent,
  ],
})
export class PodcastDetailComponent implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  podcastForm: FormGroup;
  private subscriptions = new Subscription();
  protected loading = false;
  protected rssFeedLoading = false;
  protected rssFeedsDisplayedColumns: string[] = ['url', 'actions'];
  private podcastUuid: string;
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

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private podcastsService: PodcastsService,
    private toolbarService: ToolbarService,
    private dialog: MatDialog,
    private clipboard: Clipboard,
    private teamsService: TeamsService,
    private voicesService: VoicesService,
  ) {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (!uuid) {
      throw new Error('Failed to get Podcast ID from route.');
    }
    this.podcastUuid = uuid;

    this.podcastForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      uuid: [{ value: '', disabled: true }],
      team: [null],
      name: [''],
      intro: [''],
      prompt: [''],
      outro: [''],
      enabled: [false],
      slug: [{ value: '', disabled: true }],
      url: [{ value: '', disabled: true }],
      description: [''],
      ownerName: [''],
      ownerEmail: [''],
      ownerLink: [''],
      image: [null],
      imageUrl: [null],
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
    });
  }

  imageUrl: string | null = null;

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);

    this.loading = true;
    this.refreshPodcastData();
    this.imageUrl = this.podcastForm.get('imageUrl')?.value;
    this.subscriptions.add(
      this.podcastForm.get('imageUrl')?.valueChanges.subscribe((value) => {
        this.imageUrl = value;
      }),
    );
    this.loadTeams();
    this.applyVoiceFilters();

    this.subscriptions.add(
      this.podcastForm.valueChanges.pipe(debounceTime(1000)).subscribe(() => {
        // Only update if the form is valid.
        if (this.podcastForm.valid && this.podcastForm.dirty) {
          const {
            uuid,
            team,
            name,
            intro,
            prompt,
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
            return;
          }
          this.podcastsService
            .updatePodcast(
              uuid,
              team ? team.uuid : null,
              name,
              intro,
              prompt,
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
            .subscribe({
              next: (data) => {
                if (!data.success) {
                  this.messageService.error(data.message);
                  return;
                }
                this.messageService.success(`Podcast updated successfully`, 3000);
                this.podcastForm.patchValue(data.podcast);
                this.podcastForm.markAsPristine();
              },
              error: (err) => {
                this.messageService.error(`Failed to update podcast: ${err.message}`);
              },
            });
        }
      }),
    );
  }

  getVoiceDisplayName(voice: Voice): string {
    const tier = voiceToTier(voice);
    return (
      `${voice.displayName ?? 'Name not set'} - ${tierToString(tier) ?? 'Tier not set'}` +
      ` (${Math.round(voice.creditsPerMillionChar / 1000)} CPM)`
    );
  }

  private loadVoices(tiers?: VoiceTier[], enabled?: boolean): void {
    this.loadingVoices = true;
    this.subscriptions.add(
      this.voicesService.getVoices(tiers, enabled).subscribe({
        next: (response) => {
          this.voices = response.voices;
          this.loadingVoices = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load voices: ${err.message}`);
          this.loadingVoices = false;
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

  applyVoiceFilters(): void {
    const selectedTiers = this.voiceFilter.value;
    const enabled = true;
    this.loadVoices(selectedTiers?.length ? selectedTiers : undefined, enabled);
  }

  clearVoiceFilters(): void {
    this.voiceFilter.setValue([]);
    this.loadVoices();
  }

  private loadTeams(): void {
    this.loadingTeams = true;
    this.subscriptions.add(
      this.teamsService.getTeams().subscribe({
        next: (response) => {
          this.teams = response.teams;
          this.loadingTeams = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load teams: ${err.message}`);
          this.loadingTeams = false;
        },
      }),
    );
  }

  compareTeams(o1: TeamsResult | null, o2: TeamsResult | null): boolean {
    return !!o1 && !!o2 && o1.uuid === o2.uuid;
  }

  private refreshPodcastData() {
    this.subscriptions.add(
      this.podcastsService.getPodcastById(this.podcastUuid).subscribe({
        next: (podcast) => {
          // console.log('Voice ID:', podcast.voice);
          // console.log('Team ID:', podcast.team);
          this.podcastForm.patchValue(podcast);
          this.setRssFeeds(podcast.rssFeeds);
          // this.selectedVoiceUuid = podcast.voice?.uuid || null;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.messageService.error(`Failed to retrieve podcast data: ${err.message}`);
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
        }),
      );
    });
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
            this.router.navigate(['/podcasts']);
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

  deletePodcastDialog() {
    const podcastName = this.podcastForm.get('name')?.value;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message:
          "<h3>Removing podcast '" +
          podcastName +
          "' will remove all associated episodes and audio files owned by this podcast. This cannot be undone.</h3>" +
          '<br/><br/><h2>Are you sure you want to proceed?</h2>',
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        // get confirmation from user
        this.deletePodcast();
      }
    });
  }

  private deletePodcast() {
    this.subscriptions.add(
      this.podcastsService.deletePodcast(this.podcastUuid, this.deleteConfirmation).subscribe({
        next: () => {
          this.messageService.success('Podcast deleted successfully');
          this.router.navigate(['/podcasts']);
        },
        error: (err) => {
          this.messageService.error(`Failed to delete podcast: ${err.message}`);
        },
      }),
    );
  }

  onPodcastImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile = file;

      // Preview the image
      const reader = new FileReader();
      reader.onload = () => {
        this.previewImage = reader.result;
      };
      reader.readAsDataURL(this.selectedFile);

      this.uploadPodcastImage(file);
    }
  }

  private uploadPodcastImage(file: File) {
    this.podcastsService.uploadPodcastImage(this.podcastUuid, file).subscribe({
      next: (response) => {
        this.messageService.success('Podcast image uploaded successfully');
        const imageUrl = response.podcast.imageUrl;
        const cacheBustedUrl = imageUrl + (imageUrl?.includes('?') ? '&' : '?') + 'v=' + new Date().getTime();
        this.podcastForm.patchValue({ imageUrl: cacheBustedUrl });
        this.selectedFile = null;
        this.podcastForm.get('image')?.reset();
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
            this.podcastForm.patchValue({ imageUrl: data.podcast.imageUrl });
            this.imageUrl = data.podcast.imageUrl;
            this.podcastForm.markAsPristine();
          },
          error: (err) => {
            this.messageService.error(`Failed to delete podcast image: ${err.message}`);
          },
        });
      }
    });
  }

  get rssFeeds(): FormArray {
    return this.podcastForm.get('rssFeeds') as FormArray;
  }

  openAddRssFeedDialog(): void {
    const dialogRef = this.dialog.open(AddRssFeedDialogComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.addRssFeed(result.url);
      }
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
            }),
          );
          this.updateRssFeeds();
        },
        error: (err) => {
          this.messageService.error(`Failed to update RSS Feeds: ${err.message}`);
        },
      }),
    );
  }

  removeRssFeed(feedId: string): void {
    this.rssFeeds.removeAt(this.rssFeeds.controls.findIndex((control) => control.get('uuid')?.value === feedId));
    this.updateRssFeeds();
  }

  private updateRssFeeds(): void {
    this.rssFeedLoading = true;
    const rssFeedIds = this.rssFeeds.value.map((feed: RssFeedResult) => feed.uuid);
    this.podcastsService.setPodcastRssFeeds(this.podcastUuid, rssFeedIds).subscribe({
      next: (data) => {
        this.podcastForm.patchValue(data.podcast);
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

  protected readonly tierToString = tierToString;
}
