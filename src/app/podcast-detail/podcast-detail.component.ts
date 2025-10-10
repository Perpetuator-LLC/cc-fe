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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
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
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { SchedulingService, Schedule } from '../scheduling.service';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { ScheduleModalComponent, ScheduleModalData } from '../schedule-modal/schedule-modal.component';
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
import { AddVoiceDialogComponent } from '../add-voice-dialog/add-voice-dialog.component';
import { UserService } from '../user.service';
import { RefreshVoicesDialogComponent } from '../refresh-voices-dialog/refresh-voices-dialog.component';
import { MatTabsModule } from '@angular/material/tabs';
import { DeletePodcastDialogComponent } from './delete-podcast-dialog/delete-podcast-dialog.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-podcast-detail',
  templateUrl: './podcast-detail.component.html',
  styleUrls: ['./podcast-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule, // <-- Added to enable *ngIf
    MessageComponent,
    MatProgressSpinner,
    MatProgressBarModule,
    ReactiveFormsModule,
    MatFormField,
    MatFormFieldModule,
    MatButton,
    MatMenuModule,
    MatButtonModule,
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
    MatTabsModule,
    DeletePodcastDialogComponent,
    SvgIconComponent,
    MatSlideToggle,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
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
  protected lastSubmittedCategories: Record<string, string[]> = {};
  private pendingSubmitCategories: Record<string, string[]> = {};
  voiceSearchControl = new FormControl<string>('');
  private tierFilteredVoices: Voice[] = [];
  protected filteredVoices: Voice[] = [];
  isEditing = false;
  schedules: Schedule[] = [];

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
    protected userService: UserService,
    private schedulingService: SchedulingService,
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
      createdAt: [{ value: '', disabled: true }],
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

    this.subscriptions.add(
      this.voiceSearchControl.valueChanges.pipe(debounceTime(1000)).subscribe((searchTerm) => {
        this.applyVoiceSearch(searchTerm);
      }),
    );
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

    // Live updates disabled - data will only be saved when save button is clicked

    this.applyVoiceFilters();
    this.loadSchedules();
  }

  loadSchedules(): void {
    this.subscriptions.add(
      this.schedulingService.getSchedulesForPodcast(this.podcastUuid).subscribe({
        next: (schedules) => {
          this.schedules = schedules;
        },
        error: (err) => {
          this.messageService.error(`Failed to fetch schedules: ${err.message}`);
        },
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
    let filteredList: Voice[];

    if (!lowerCaseSearchTerm) {
      filteredList = [...this.tierFilteredVoices];
    } else {
      filteredList = this.tierFilteredVoices.filter((voice) =>
        (voice.displayName || '').toLowerCase().includes(lowerCaseSearchTerm),
      );
    }

    // Move selected voice to the top of the list
    const selectedVoice = this.podcastForm.get('voice')?.value;
    if (selectedVoice) {
      const selectedIndex = filteredList.findIndex((voice) => voice.uuid === selectedVoice.uuid);
      if (selectedIndex > 0) {
        const [selectedVoiceItem] = filteredList.splice(selectedIndex, 1);
        filteredList.unshift(selectedVoiceItem);
      }
    }

    this.filteredVoices = filteredList;
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
    this.subscriptions.add(
      this.podcastsService.getPodcastById(this.podcastUuid).subscribe({
        next: (podcast) => {
          // console.log('Podcast data received:', podcast);
          // console.log('Voice ID:', podcast.voice);
          // console.log('Team ID:', podcast.team);
          this.podcastForm.patchValue(podcast);
          this.setRssFeeds(podcast.rssFeeds);
          // this.selectedVoiceUuid = podcast.voice?.uuid || null;
          this.lastSubmittedCategories = podcast.categories as Record<string, string[]>;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.messageService.error(`Failed to retrieve podcast data: ${err.message}`);
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

  deletePodcastDialog(): void {
    const dialogRef = this.dialog.open(DeletePodcastDialogComponent, {
      width: '500px',
      data: { podcastName: this.podcastForm.get('name')?.value },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.podcastsService.deletePodcast(this.podcastUuid, this.deleteConfirmation).subscribe({
          next: () => {
            this.messageService.success('Podcast deleted successfully');
            this.router.navigate(['/podcasts']);
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

  // Scheduling methods
  getScheduleDescription(schedule: Schedule): string {
    switch (schedule.scheduleType) {
      case 'INTERVAL': {
        const hours = Math.floor((schedule.interval || 0) / 3600);
        const minutes = Math.floor(((schedule.interval || 0) % 3600) / 60);
        return hours > 0 ? `Every ${hours}h ${minutes}m` : `Every ${minutes}m`;
      }
      case 'CRONTAB':
        return `${schedule.cronHour}:${schedule.cronMinute} on ${schedule.cronDayOfWeek}`;

      case 'CLOCKED':
        return `Once at ${new Date(schedule.clockedTime || '').toLocaleString()}`;

      case 'SOLAR':
        return `At ${schedule.solarEvent} (${schedule.solarLatitude}, ${schedule.solarLongitude})`;

      default:
        return schedule.interval ? `Every ${schedule.interval}s` : 'Unknown';
    }
  }

  toggleScheduleEnabled(schedule: Schedule, enabled: boolean): void {
    this.subscriptions.add(
      this.schedulingService.updateSchedule(schedule.uuid, { enabled }).subscribe({
        next: () => {
          this.messageService.success(`Schedule ${enabled ? 'enabled' : 'disabled'} successfully`);
          // Update local schedule state
          const index = this.schedules.findIndex((s) => s.uuid === schedule.uuid);
          if (index !== -1) {
            this.schedules[index] = { ...this.schedules[index], enabled };
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to update schedule: ${err.message}`);
        },
      }),
    );
  }

  editSchedule(schedule: Schedule): void {
    const dialogRef = this.dialog.open(ScheduleModalComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        schedule: schedule,
        mode: 'edit',
      } as ScheduleModalData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Update the local schedules array with the updated schedule
        const index = this.schedules.findIndex((s) => s.uuid === result.uuid);
        if (index !== -1) {
          this.schedules[index] = result;
        }
        this.messageService.success('Schedule updated successfully');
      }
    });
  }

  deleteSchedule(schedule: Schedule): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete Schedule',
        message: `Are you sure you want to delete the schedule "${schedule.name}"? This action cannot be undone.`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.subscriptions.add(
          this.schedulingService.deleteSchedule(schedule.uuid).subscribe({
            next: () => {
              this.messageService.success('Schedule deleted successfully');
              // Remove from local schedules array
              this.schedules = this.schedules.filter((s) => s.uuid !== schedule.uuid);
            },
            error: (err) => {
              this.messageService.error(`Failed to delete schedule: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  createNewSchedule(): void {
    const dialogRef = this.dialog.open(ScheduleModalComponent, {
      width: '800px',
      maxHeight: '90vh',
      disableClose: false,
      data: {
        podcastUuid: this.podcastUuid,
        mode: 'create',
      } as ScheduleModalData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Add the new schedule to the local schedules array
        this.schedules.push(result);
        this.messageService.success('Schedule created successfully');
      }
    });
  }

  formatJobKind(jobKind: string): string {
    return jobKind.replace(/_/g, ' ');
  }
}
