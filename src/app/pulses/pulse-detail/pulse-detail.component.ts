// Copyright (c) 2026 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, debounceTime, filter, switchMap } from 'rxjs';
import { MessageService } from '../../message.service';
import { PulsesService } from '../pulses.service';
import { PulseConfig, ContentSource, AlertTrigger, Pulse } from '../pulses.types';
import { ToolbarService } from '../../layout/toolbar.service';
import { LoadingService } from '../../layout/loading.service';
import { ShareService } from '../../share.service';
import { JobService } from '../../jobs/job.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../confirmation-dialog/confirmation-dialog.component';
import { MatTabsModule } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
import { AddContentSourceDialogComponent } from '../add-content-source-dialog/add-content-source-dialog.component';
import { AddAlertTriggerDialogComponent } from '../add-alert-trigger-dialog/add-alert-trigger-dialog.component';
import {
  CreateRecordingDialogComponent,
  CreateRecordingDialogData,
} from '../create-recording-dialog/create-recording-dialog.component';
import {
  EditContentSourceDialogComponent,
  EditContentSourceDialogData,
} from '../edit-content-source-dialog/edit-content-source-dialog.component';
import { AddRssFeedDialogComponent } from '../../podcast/add-rss-feed-dialog/add-rss-feed-dialog.component';
import { Job } from '../../jobs/job.service';
import { Voice } from '../../podcast/voices.service';
import { AudioPlayerService, AudioTrack } from '../../shared/audio-player/audio-player.service';
import { PulseVoiceTabComponent } from './elements/pulse-voice-tab/pulse-voice-tab.component';
import { ScheduleListComponent } from '../../shared/scheduling/schedule-list/schedule-list.component';
import { UserService, UserPreferences } from '../../user/user.service';
import { LatestPulseCardComponent } from './elements/latest-pulse-card/latest-pulse-card.component';
import { PulseAlertTriggersTabComponent } from './elements/pulse-alert-triggers-tab/pulse-alert-triggers-tab.component';
import { PulseContentSourcesTabComponent } from './elements/pulse-content-sources-tab/pulse-content-sources-tab.component';
import { PulseDetailHeaderComponent } from './elements/pulse-detail-header/pulse-detail-header.component';
import { PulseRecordingsTabComponent } from './elements/pulse-recordings-tab/pulse-recordings-tab.component';
import { PulseSettingsTabComponent } from './elements/pulse-settings-tab/pulse-settings-tab.component';

@Component({
  selector: 'app-pulse-detail',
  templateUrl: './pulse-detail.component.html',
  styleUrls: ['./pulse-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinner,
    MatIcon,
    MatTabsModule,
    PulseVoiceTabComponent,
    ScheduleListComponent,
    LatestPulseCardComponent,
    PulseAlertTriggersTabComponent,
    PulseContentSourcesTabComponent,
    PulseDetailHeaderComponent,
    PulseRecordingsTabComponent,
    PulseSettingsTabComponent,
  ],
})
export class PulseDetailComponent implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  pulseForm: FormGroup;
  private subscriptions = new Subscription();
  protected loading = true;
  protected pulseConfigUuid: string;
  protected selectedTabIndex = 0;
  protected generatingPulse = false;
  protected selectedPulseUuid: string | null = null;

  // Phone verification status for SMS toggle
  phoneVerified = false;
  phoneNumber: string | null = null;
  loadingPreferences = true;

  // Data
  pulseConfig: PulseConfig | null = null;
  contentSources: ContentSource[] = [];
  alertTriggers: AlertTrigger[] = [];
  pulses: Pulse[] = [];

  // Latest pulse for header display
  get latestPulse(): Pulse | null {
    if (this.pulses.length === 0) return null;
    return this.pulses[0]; // Already sorted by createdAt desc
  }
  showTranscript = false;

  // Combined symbols from all content sources (company sources + resolved watchlists)
  // For now, only includes directly added company symbols
  // TODO: Request BE computed field for full list including watchlist symbols
  get allSymbols(): string[] {
    const symbols = new Set<string>();
    for (const source of this.contentSources) {
      if (source.sourceType === 'company' && source.symbol) {
        symbols.add(source.symbol);
      }
      // Watchlist symbols would need to be resolved from the backend
      // For now we can show a placeholder
    }
    return Array.from(symbols).sort();
  }

  // Options
  toneOptions = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'formal', label: 'Formal' },
    { value: 'conversational', label: 'Conversational' },
  ];

  private readonly tabNames = ['settings', 'content', 'alerts', 'voice', 'schedule', 'recordings'];

  // Content source columns
  contentSourceColumns = ['sourceType', 'sourceDetail', 'priority', 'isActive', 'actions'];

  // Alert trigger columns
  alertTriggerColumns = ['alertType', 'details', 'isActive', 'actions'];

  // Dependencies
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly toolbarService = inject(ToolbarService);
  private readonly pulsesService = inject(PulsesService);
  private readonly loadingService = inject(LoadingService);
  protected readonly shareService = inject(ShareService);
  private readonly dialog = inject(MatDialog);
  private readonly jobService = inject(JobService);
  private readonly audioPlayerService = inject(AudioPlayerService);
  private readonly userService = inject(UserService);

  constructor() {
    const uuidParam = this.route.snapshot.paramMap.get('uuid');
    if (!uuidParam) {
      throw new Error('Failed to get Pulse Config ID from route.');
    }
    this.pulseConfigUuid = this.shareService.extractIdFromSlugParam(uuidParam);

    this.pulseForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      isActive: [true],
      targetDurationMinutes: [3, [Validators.required, Validators.min(1), Validators.max(10)]],
      tone: ['professional'],
      customInstructions: [''],
      includeIntro: [true],
      includeOutro: [true],
      introText: [''],
      outroText: [''],
      deliveryMethod: ['in_app'],
      smsNotificationEnabled: [false],
      emailNotificationEnabled: [false],
      scheduleFrequency: ['daily'],
      scheduleTime: ['07:00'],
      scheduleTimezone: ['America/New_York'],
      newsLookbackHours: [24, [Validators.min(1), Validators.max(168)]],
    });
  }

  ngOnInit(): void {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
    this.messageService.clearMessages();

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

    this.loadPulseConfig();
    this.loadPulseHistory();
    this.loadUserPreferences();
    this.setupAutoSave();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadPulseConfig(): void {
    this.loading = true;
    this.loadingService.show();

    this.subscriptions.add(
      this.pulsesService.getPulseConfig(this.pulseConfigUuid).subscribe({
        next: (config) => {
          this.pulseConfig = config;
          this.contentSources = config.contentSources || [];
          this.alertTriggers = config.alertTriggers || [];

          this.pulseForm.patchValue({
            name: config.name,
            description: config.description,
            isActive: config.isActive,
            targetDurationMinutes: config.targetDurationMinutes,
            tone: config.tone,
            customInstructions: config.customInstructions || '',
            includeIntro: config.includeIntro,
            includeOutro: config.includeOutro,
            introText: config.introText || '',
            outroText: config.outroText || '',
            deliveryMethod: config.deliveryMethod,
            smsNotificationEnabled: config.smsNotificationEnabled || false,
            emailNotificationEnabled: config.emailNotificationEnabled || false,
            scheduleFrequency: config.scheduleFrequency,
            scheduleTime: config.scheduleTime || '07:00',
            scheduleTimezone: config.scheduleTimezone,
            newsLookbackHours: config.newsLookbackHours,
          });

          this.pulseForm.markAsPristine();
          this.loading = false;
          this.loadingService.hide();
        },
        error: (err) => {
          this.loading = false;
          this.loadingService.hide();
          this.messageService.error(`Failed to load pulse config: ${err.message}`);
        },
      }),
    );
  }

  private loadPulseHistory(): void {
    this.subscriptions.add(
      this.pulsesService.getPulses(this.pulseConfigUuid, undefined, undefined, 20).subscribe({
        next: (response) => {
          this.pulses = response.pulses;
        },
        error: (err) => {
          this.messageService.error(`Failed to load pulse history: ${err.message}`);
        },
      }),
    );
  }

  /**
   * Load user preferences to check phone verification status
   */
  private loadUserPreferences(): void {
    this.loadingPreferences = true;
    this.subscriptions.add(
      this.userService.getUserPreferences().subscribe({
        next: (preferences: UserPreferences) => {
          this.phoneNumber = preferences.sms.phoneNumber || null;
          this.phoneVerified = preferences.sms.isVerified || false;
          this.loadingPreferences = false;

          // Disable SMS toggle if phone not verified
          if (!this.phoneVerified) {
            this.pulseForm.get('smsNotificationEnabled')?.disable();
          } else {
            this.pulseForm.get('smsNotificationEnabled')?.enable();
          }
        },
        error: () => {
          this.loadingPreferences = false;
          // Disable SMS toggle on error
          this.pulseForm.get('smsNotificationEnabled')?.disable();
        },
      }),
    );
  }

  private setupAutoSave(): void {
    this.subscriptions.add(
      this.pulseForm.valueChanges
        .pipe(
          debounceTime(1500),
          filter(() => this.pulseForm.valid && this.pulseForm.dirty),
          switchMap((formValue) => {
            return this.pulsesService.updatePulseConfig(this.pulseConfigUuid, formValue);
          }),
        )
        .subscribe({
          next: () => {
            this.pulseForm.markAsPristine();
            this.messageService.info('Changes saved');
          },
          error: (err) => {
            this.messageService.error(`Failed to save changes: ${err.message}`);
          },
        }),
    );
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    const tabName = this.tabNames[index];
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabName },
      queryParamsHandling: 'merge',
    });
  }

  // Content Sources
  addContentSource(): void {
    const dialogRef = this.dialog.open(AddContentSourceDialogComponent, {
      width: '500px',
      data: { pulseConfigUuid: this.pulseConfigUuid },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.contentSources = [...this.contentSources, result];
      }
    });
  }

  editContentSource(source: ContentSource): void {
    const dialogRef = this.dialog.open(EditContentSourceDialogComponent, {
      width: '500px',
      data: {
        pulseConfigUuid: this.pulseConfigUuid,
        source,
      } as EditContentSourceDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Replace the old source with the new one
        this.contentSources = this.contentSources.map((s) => (s.uuid === source.uuid ? result : s));
      }
    });
  }

  addBulkRssFeeds(): void {
    const dialogRef = this.dialog.open(AddRssFeedDialogComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe((result: { urls: string[] } | undefined) => {
      if (result?.urls?.length) {
        this.addRssFeedsSequentially(result.urls);
      }
    });
  }

  private addRssFeedsSequentially(urls: string[], index = 0): void {
    if (index >= urls.length) {
      this.messageService.success(`Added ${urls.length} RSS feed(s)`);
      return;
    }

    const url = urls[index];
    this.pulsesService
      .addContentSource(this.pulseConfigUuid, {
        sourceType: 'rss_feed',
        rssUrl: url,
        priority: 50,
      })
      .subscribe({
        next: (result) => {
          this.contentSources = [...this.contentSources, result.contentSource];
          this.addRssFeedsSequentially(urls, index + 1);
        },
        error: (err) => {
          this.messageService.error(`Failed to add ${url}: ${err.message}`);
          // Continue with next URL
          this.addRssFeedsSequentially(urls, index + 1);
        },
      });
  }

  removeContentSource(uuid: string): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Remove Content Source',
        message: 'Are you sure you want to remove this content source?',
        confirmText: 'Remove',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.subscriptions.add(
          this.pulsesService.removeContentSource(uuid).subscribe({
            next: () => {
              this.contentSources = this.contentSources.filter((s) => s.uuid !== uuid);
              this.messageService.success('Content source removed');
            },
            error: (err) => {
              this.messageService.error(`Failed to remove content source: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  // Alert Triggers
  addAlertTrigger(): void {
    const dialogRef = this.dialog.open(AddAlertTriggerDialogComponent, {
      width: '500px',
      data: { pulseConfigUuid: this.pulseConfigUuid },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.alertTriggers = [...this.alertTriggers, result];
      }
    });
  }

  removeAlertTrigger(uuid: string): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Remove Alert Trigger',
        message: 'Are you sure you want to remove this alert trigger?',
        confirmText: 'Remove',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.subscriptions.add(
          this.pulsesService.removeAlertTrigger(uuid).subscribe({
            next: () => {
              this.alertTriggers = this.alertTriggers.filter((t) => t.uuid !== uuid);
              this.messageService.success('Alert trigger removed');
            },
            error: (err) => {
              this.messageService.error(`Failed to remove alert trigger: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  // Generate Pulse
  generatePulse(): void {
    this.generatingPulse = true;

    this.subscriptions.add(
      this.pulsesService.generatePulse(this.pulseConfigUuid).subscribe({
        next: (result) => {
          this.generatingPulse = false;
          this.messageService.info('Pulse generation started...');

          // Track all jobs in the chain
          if (result.jobUuids && result.jobUuids.length > 0) {
            result.jobUuids.forEach((jobUuid, index) => {
              this.jobService.addJob({
                uuid: jobUuid,
                kind: this.getJobKindForChainIndex(index),
                status: index === 0 ? 'pending' : 'pending',
                createdAt: new Date().toISOString(),
              } as Job);
            });
          } else if (result.jobUuid) {
            // Fallback for single job (legacy)
            this.jobService.addJob({
              uuid: result.jobUuid,
              kind: 'generate_pulse',
              status: 'pending',
              createdAt: new Date().toISOString(),
            } as Job);
          }
        },
        error: (err) => {
          this.generatingPulse = false;
          this.messageService.error(`Failed to generate pulse: ${err.message}`);
        },
      }),
    );
  }

  /**
   * Get job kind for pulse chain index
   * Order: fetch_news -> research -> transcript -> validate -> audio -> deliver
   */
  private getJobKindForChainIndex(index: number): string {
    const kinds = [
      'fetch_pulse_news',
      'research_pulse_content',
      'create_pulse_transcript',
      'validate_pulse',
      'generate_pulse_audio',
      'deliver_pulse',
    ];
    return kinds[index] || 'generate_pulse';
  }

  // Delete pulse config
  deletePulseConfig(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete Pulse Configuration',
        message: 'Are you sure you want to delete this pulse configuration? This action cannot be undone.',
        confirmText: 'Delete',
        danger: true,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.subscriptions.add(
          this.pulsesService.deletePulseConfig(this.pulseConfigUuid).subscribe({
            next: () => {
              this.messageService.success('Pulse configuration deleted');
              this.router.navigate(['/media/pulses']);
            },
            error: (err) => {
              this.messageService.error(`Failed to delete pulse config: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  playPulse(pulse: Pulse): void {
    if (!pulse.audioUrl) {
      this.messageService.error('Audio not yet available');
      return;
    }

    const track: AudioTrack = {
      id: pulse.uuid,
      title: pulse.title,
      subtitle: this.pulseConfig?.name || 'Pulse',
      audioUrl: pulse.audioUrl,
      duration: pulse.audioDurationSeconds,
      type: 'pulse',
      sourceRoute: `/media/pulses/${this.pulseConfigUuid}`,
    };
    this.audioPlayerService.play(track);
  }

  /**
   * Create an AudioTrack from a Pulse
   */
  private createTrackFromPulse(pulse: Pulse): AudioTrack {
    return {
      id: pulse.uuid,
      title: pulse.title,
      subtitle: this.pulseConfig?.name || 'Pulse',
      audioUrl: pulse.audioUrl!,
      duration: pulse.audioDurationSeconds,
      type: 'pulse',
      sourceRoute: `/media/pulses/${this.pulseConfigUuid}`,
    };
  }

  /**
   * Add pulse to play next in queue
   */
  addToQueueNext(pulse: Pulse): void {
    if (!pulse.audioUrl) {
      this.messageService.warning('No audio available for this pulse');
      return;
    }
    const track = this.createTrackFromPulse(pulse);
    this.audioPlayerService.playNext(track);
    this.messageService.success('Added to play next');
  }

  /**
   * Add pulse to end of queue
   */
  addToQueue(pulse: Pulse): void {
    if (!pulse.audioUrl) {
      this.messageService.warning('No audio available for this pulse');
      return;
    }
    const track = this.createTrackFromPulse(pulse);
    this.audioPlayerService.addToQueue(track);
    this.messageService.success('Added to queue');
  }

  toggleTranscript(): void {
    this.showTranscript = !this.showTranscript;
  }

  // ==================== UPDATES (PULSE HISTORY) METHODS ====================

  /**
   * Navigate to recording detail page
   * Uses /media/recordings/:uuid route so sidebar highlights "Recordings"
   */
  viewRecording(pulse: Pulse): void {
    this.router.navigate(['/media/recordings', pulse.uuid], {
      queryParams: { pulse: this.pulseConfigUuid },
    });
  }

  /**
   * Copy pulse transcript to clipboard
   */
  copyTranscript(pulse: Pulse): void {
    if (!pulse.transcript) {
      this.messageService.error('No transcript available');
      return;
    }

    navigator.clipboard.writeText(pulse.transcript).then(
      () => this.messageService.success('Transcript copied to clipboard'),
      () => this.messageService.error('Failed to copy transcript'),
    );
  }

  /**
   * Create a new recording from custom text
   */
  createRecording(): void {
    const dialogRef = this.dialog.open(CreateRecordingDialogComponent, {
      width: '600px',
      data: {
        pulseConfigUuid: this.pulseConfigUuid,
      } as CreateRecordingDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Reload pulse history to show the new recording
        this.loadPulseHistory();
      }
    });
  }

  // ==================== VOICE METHODS ====================

  /**
   * Handle voice selection from shared voice selector component
   */
  onVoiceSelected(voice: Voice): void {
    if (!this.pulseConfig) return;

    this.subscriptions.add(
      this.pulsesService.updatePulseConfig(this.pulseConfigUuid, { voiceUuid: voice.uuid }).subscribe({
        next: (result) => {
          this.pulseConfig = result.pulseConfig;
          this.messageService.success(`Voice changed to ${voice.displayName || voice.externalId}`);
        },
        error: (err) => {
          this.messageService.error(`Failed to update voice: ${err.message}`);
        },
      }),
    );
  }
}
