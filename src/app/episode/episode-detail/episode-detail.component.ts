// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, TemplateRef, ViewChild, OnDestroy, HostListener } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Episode, EpisodeService, EpisodeVersion } from '../episode.service';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { MatCard, MatCardHeader, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { DatePipe, NgClass } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { Subscription } from 'rxjs';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { toObservable } from '@angular/core/rxjs-interop';
import { FetchPolicy } from '@apollo/client';
import { SvgIconComponent } from '../../svg-icon/svg-icon.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDeleteDialogComponent } from '../../confirm-delete-dialog/confirm-delete-dialog.component';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { EpisodeVersionControlComponent } from '../episode-version-control/episode-version-control.component';
import { ShareButtonsComponent } from '../../share-buttons/share-buttons.component';
import { Job, JobKind, JobService, JobStatus, stringToJobKind } from '../../jobs/job.service';
import { Schedule, SchedulingService } from '../../scheduling.service';
import { MessageService } from '../../message.service';
import { ToolbarService } from '../../toolbar.service';
import { LoadingService } from '../../loading.service';
import { ShareService } from '../../share.service';

interface EditableFormValues {
  title: string;
  description: string;
  content: string;
  isLive: boolean;
}

@Component({
  selector: 'app-episode-detail',
  standalone: true,
  imports: [
    FormsModule,

    MatCardContent,
    MatCard,
    MatLabel,
    MatFormField,
    DatePipe,
    NgClass,
    MatTooltip,
    MatButton,
    MatIconButton,
    MatInput,
    MatIcon,
    MatCheckbox,
    ReactiveFormsModule,
    RouterLink,
    SvgIconComponent,
    MatCardHeader,
    MatTabsModule,
    MatExpansionModule,
    MatSelectModule,
    MatSlideToggle,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    EpisodeVersionControlComponent,
    ShareButtonsComponent,
  ],
  templateUrl: './episode-detail.component.html',
  styleUrl: './episode-detail.component.scss',
})
export class EpisodeDetailComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  episodeForm: FormGroup;
  audioSrc: string | null = null;
  liveAudioSrc: string | null = null;
  liveAudioVersionNumber: number | null = null;
  audioIsCustomUpload = false;
  topic: { uuid: string; title: string } | null = null;
  wordCount = 0;
  charCount = 0;
  jobs: Job[] = [];
  schedules: Schedule[] = [];
  isGridView = false;
  selectedVersionNumber: number | null = null;
  selectedVersion: EpisodeVersion | null = null;
  currentVersionCreator: string | null = null;
  currentVersionCreatedAt: string | null = null;
  currentVersionValidationNotes: string | null = null;
  currentVersionChangeType: string | null = null;
  hasUnsavedChanges = false;
  private initialFormValues: EditableFormValues | null = null;
  private hasAcknowledgedLiveEditWarning = false;
  private isRestoring = false;
  private isUpdatingFromBackend = false;

  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  private episodeUuid: string;

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      $event.preventDefault();
      $event.returnValue = true;
    }
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private episodeService: EpisodeService,
    private jobService: JobService,
    private router: Router,
    private dialog: MatDialog,
    private schedulingService: SchedulingService,
    private loadingService: LoadingService,
    private sanitizer: DomSanitizer,
    protected shareService: ShareService,
  ) {
    const uuidParam = this.route.snapshot.paramMap.get('uuid');
    if (!uuidParam) {
      throw new Error('Failed to get Episode ID from route.');
    }
    // Extract UUID from slug (handles both 'uuid' and 'uuid-slug-name' formats)
    this.episodeUuid = this.shareService.extractIdFromSlugParam(uuidParam);

    this.episodeForm = this.fb.group({
      id: [{ value: '', disabled: true }, Validators.required],
      uuid: [{ value: '', disabled: true }, Validators.required],
      isLive: [false, Validators.required],
      title: ['', Validators.required],
      description: ['', Validators.required],
      content: ['', Validators.required],
      currentVersionNumber: [1],
      versions: this.fb.array([]),
      date: ['', Validators.required],
      audioBase64: ['', Validators.required],
      podcastDate: ['', Validators.required],
      telegramDate: ['', Validators.required],
      news: this.fb.array([]),
      researchUrls: [[]],
      podcast: this.fb.group({
        id: [{ value: '', disabled: true }],
        uuid: [{ value: '', disabled: true }],
        name: [{ value: '', disabled: true }],
        enabled: [{ value: false, disabled: true }],
      }),
    });
    this.subscriptions.add(
      toObservable(this.jobService.jobs).subscribe({
        next: (jobs) => {
          this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.COMPLETED).forEach((job) => {
            const jobKind = stringToJobKind(job.kind);
            // Reload episode data when relevant jobs complete (no messages - job-status-bar handles it)
            if ([JobKind.UPDATE_EPISODE_AUDIO].includes(jobKind)) {
              this.loadEpisodeData('network-only');
            } else if (
              [
                JobKind.VALIDATE_EPISODE,
                JobKind.VALIDATE_EPISODE_COMPLIANCE,
                JobKind.VALIDATE_EPISODE_FACTS,
                JobKind.VALIDATE_EPISODE_LENGTH,
              ].includes(jobKind)
            ) {
              this.loadEpisodeData('network-only');
            }
            // No need to show messages for episode creation - job-status-bar handles it globally
          });
          this.jobs = jobs;
        },
        error: (error) => {
          this.messageService.error(`Failed to load jobs signal: ${error.message}`);
        },
      }),
    );
  }

  toggleView(isGrid: boolean) {
    this.isGridView = isGrid;
  }

  ngOnInit(): void {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);

    this.loadEpisodeData();

    this.subscriptions.add(
      this.episodeForm.valueChanges.subscribe(() => {
        this.checkForUnsavedChanges();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.loadingService.hide();
    this.toolbarService.clearToolbarComponent();
  }

  private loadEpisodeData(fetchPolicy: FetchPolicy = 'cache-first'): void {
    this.loadingService.show();

    this.subscriptions.add(
      this.episodeService.getEpisodeById(this.episodeUuid, fetchPolicy).subscribe({
        next: (episode) => {
          // Set flag to suppress live edit warning during backend updates
          this.isUpdatingFromBackend = true;

          // Parse researchUrls if it's a JSON string
          const parsedEpisode = { ...episode };
          if (episode.researchUrls) {
            if (typeof episode.researchUrls === 'string') {
              try {
                parsedEpisode.researchUrls = JSON.parse(episode.researchUrls);
              } catch (e) {
                console.warn('Failed to parse researchUrls:', e);
                parsedEpisode.researchUrls = [];
              }
            } else if (!Array.isArray(episode.researchUrls)) {
              parsedEpisode.researchUrls = [];
            }
          } else {
            parsedEpisode.researchUrls = [];
          }

          this.episodeForm.patchValue(parsedEpisode);

          const newsFormArray = this.episodeForm.get('news') as FormArray;
          newsFormArray.clear();
          for (const newsSummary of episode.news) {
            // Use FormControl to preserve the full object structure including nested rssFeeds array
            newsFormArray.push(this.fb.control(newsSummary));
          }

          const versionsFormArray = this.episodeForm.get('versions') as FormArray;
          versionsFormArray.clear();
          for (const version of episode.versions) {
            versionsFormArray.push(this.fb.group(version));
          }

          // Set current version creator and creation date
          const currentVersion = episode.versions.find((v) => v.versionNumber === episode.currentVersionNumber);
          if (currentVersion) {
            this.currentVersionCreator = currentVersion.createdBy?.username || null;
            this.currentVersionCreatedAt = currentVersion.createdAt || null;
            this.currentVersionValidationNotes = currentVersion.validationNotes || null;
            this.currentVersionChangeType = currentVersion.changeType || null;
            this.audioSrc = currentVersion.audioUrl || null;
          } else {
            this.audioSrc = null;
          }

          // Track the live/published audio (from episode.audioUrl)
          // If episode.audioUrl is set, use that (it's the officially published audio)
          // Otherwise, if episode is live but audioUrl is null, find the most recent version with audio
          if (episode.audioUrl) {
            this.liveAudioSrc = episode.audioUrl;
          } else if (episode.isLive) {
            // Find the most recent version (highest version number) that has audio
            const versionsWithAudio = episode.versions
              .filter((v) => v.audioUrl)
              .sort((a, b) => b.versionNumber - a.versionNumber);
            this.liveAudioSrc = versionsWithAudio.length > 0 ? versionsWithAudio[0].audioUrl || null : null;
          } else {
            this.liveAudioSrc = null;
          }

          // Find which version has the live audio URL
          if (this.liveAudioSrc) {
            const liveAudioVersion = episode.versions.find((v) => v.audioUrl === this.liveAudioSrc);
            this.liveAudioVersionNumber = liveAudioVersion?.versionNumber || null;
          } else {
            this.liveAudioVersionNumber = null;
          }

          // Set topic and audio custom upload status from episode
          this.topic = episode.topic || null;
          this.audioIsCustomUpload = episode.audioIsCustomUpload || false;

          this.initialFormValues = this.getEditableFormValues();
          this.hasUnsavedChanges = false;
          this.hasAcknowledgedLiveEditWarning = false;

          // Clear the flag after all updates are complete
          this.isUpdatingFromBackend = false;

          this.loadingService.hide();
        },
        error: (err) => {
          // Clear flag on error too
          this.isUpdatingFromBackend = false;
          this.loadingService.hide();
          this.messageService.error(`Failed to fetch episode: ${err.message}`);
        },
      }),
    );

    this.subscriptions.add(
      this.episodeForm.get('content')?.valueChanges.subscribe((value: string) => {
        this.wordCount = this.countWords(value);
        this.charCount = value.length;
      }),
    );

    this.subscriptions.add(
      this.schedulingService.getSchedulesForPodcast(this.episodeUuid).subscribe({
        next: (schedules) => {
          this.schedules = schedules;
        },
        error: (err) => {
          this.messageService.error(`Failed to fetch schedules: ${err.message}`);
        },
      }),
    );
  }

  private countWords(text: string): number {
    return text ? text.trim().split(/\s+/).length : 0;
  }

  publishAudio(): void {
    this.messageService.info('Audio file publishing...');
    this.subscriptions.add(
      this.episodeService.publishAudio(this.episodeUuid).subscribe({
        next: (response) => {
          this.messageService.success('Audio file published successfully.');
          this.episodeForm.patchValue(response.episode);
        },
        error: (err) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  onIsLiveChange(isLive: boolean) {
    // Only prevent SETTING episode as live (checking the box) without audio
    // Allow UNSETTING (unchecking) even without audio
    if (isLive && !this.hasAnyVersionWithAudio()) {
      this.messageService.warning('Cannot set episode as live without audio. Please generate audio first.');
      // Revert the checkbox to unchecked
      this.episodeForm.patchValue({ isLive: false }, { emitEvent: false });
      return;
    }

    // Mark form as dirty to enable Update button, but don't auto-save
    this.episodeForm.markAsDirty();
  }

  downloadAudio(): void {
    if (this.audioSrc) {
      const a = document.createElement('a');
      a.href = this.audioSrc;
      a.download = `episode_${this.episodeUuid}.mp3`; // Set the download file name
      a.click(); // Programmatically trigger the download
    }
  }

  onAudioFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.handleAudioFile(file);
    }
  }

  private handleAudioFile(file: File): void {
    if (file.type !== 'audio/mpeg' && file.type !== 'audio/mp3') {
      this.messageService.error('Please upload an MP3 file');
      return;
    }

    const maxSizeInBytes = 52428800; // 50MB
    if (file.size > maxSizeInBytes) {
      this.messageService.error('File size exceeds the maximum limit of 50MB. Please upload a smaller file.');
      return;
    }

    this.uploadAudio(file);
  }

  private uploadAudio(file: File): void {
    this.loadingService.show();
    this.subscriptions.add(
      this.episodeService.uploadEpisodeAudio(this.episodeUuid, file).subscribe({
        next: () => {
          this.messageService.success('Audio uploaded successfully');
          this.loadEpisodeData('network-only');
          this.loadingService.hide();
        },
        error: (err) => {
          this.messageService.error(`Failed to upload audio: ${err.message}`);
          this.loadingService.hide();
        },
      }),
    );
  }

  generateAudio(): void {
    this.subscriptions.add(
      this.episodeService.generateAudio(this.episodeUuid).subscribe({
        next: (data) => {
          if (!data.success) {
            this.messageService.error(data.message);
            return;
          }
          if (!data.job) {
            this.messageService.error('No job returned for audio generation.');
            return;
          }
          this.messageService.info('Generating audio file...');
          this.jobService.addJob(data.job);
        },
        error: (err) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  updateEpisode(): void {
    if (!this.hasUnsavedChanges || !this.initialFormValues) {
      return;
    }

    const formValues = this.episodeForm.getRawValue() as Episode;
    const currentValues = this.getEditableFormValues();

    // Optimization: Only send fields that have actually changed to reduce payload size
    // Example: When toggling isLive, don't send 4KB+ of content that hasn't changed
    const changedTitle = currentValues.title !== this.initialFormValues.title ? currentValues.title : undefined;
    const changedDescription =
      currentValues.description !== this.initialFormValues.description ? currentValues.description : undefined;
    const changedContent = currentValues.content !== this.initialFormValues.content ? currentValues.content : undefined;
    const changedIsLive = currentValues.isLive !== this.initialFormValues.isLive ? currentValues.isLive : undefined;

    this.subscriptions.add(
      this.episodeService
        .updateEpisode(formValues.uuid, changedTitle, changedDescription, changedContent, changedIsLive)
        .subscribe({
          next: (response) => {
            if (!response.success) {
              this.messageService.error(response.message);
              return;
            }
            this.messageService.success('Episode updated successfully.');
            this.loadEpisodeData('network-only');
          },
          error: (err) => {
            this.messageService.error(err.message);
          },
        }),
    );
  }

  deleteEpisode(): void {
    const episodeTitle = this.episodeForm.get('title')?.value || 'this episode';

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Delete Episode',
        message: `Are you sure you want to delete "${episodeTitle}"? This action cannot be undone.`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.subscriptions.add(
          this.episodeService.deleteEpisode(this.episodeUuid).subscribe({
            next: (response) => {
              this.messageService.success(response.message);
              this.router.navigate(['/e']); // Navigate back to episodes list
            },
            error: (err) => {
              this.messageService.error(`Failed to delete episode: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  addSchedule(): void {
    // This method should navigate to create schedule or open a dialog
    // since schedules are managed separately, not as part of the episode form
    this.createNewSchedule();
  }

  removeSchedule(index: number): void {
    // This method should delete a specific schedule
    // since schedules are managed separately, not as part of the episode form
    if (index >= 0 && index < this.schedules.length) {
      this.deleteSchedule(this.schedules[index]);
    }
  }

  saveSchedules(): void {
    this.subscriptions.add(
      this.schedulingService.savePodcastSchedules(this.episodeUuid, this.schedules).subscribe({
        next: (response) => {
          if (!response.success) {
            this.messageService.error(response.message);
            return;
          }
          this.messageService.success('Schedules saved successfully.');
          this.schedules = response.schedules;
        },
        error: (err) => {
          this.messageService.error(err.message);
        },
      }),
    );
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
    // Navigate to scheduling page or open edit dialog
    // TODO: Implement edit schedule functionality
    console.log('Edit schedule requested for:', schedule.name);
    this.messageService.info('Edit schedule functionality coming soon');
  }

  deleteSchedule(schedule: Schedule): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
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
    // Navigate to scheduling page or open create dialog
    this.messageService.info('Create schedule functionality coming soon');
  }

  formatJobKind(jobKind: string): string {
    return jobKind.replace(/_/g, ' ');
  }

  // Version history methods
  get historyVersions() {
    const versions = this.episodeForm.get('versions')?.value || [];
    const currentVersionNumber = this.episodeForm.get('currentVersionNumber')?.value;
    return versions.filter((v: EpisodeVersion) => v.versionNumber !== currentVersionNumber);
  }

  onVersionSelect(versionNumber: number | null): void {
    const versions = this.episodeForm.get('versions')?.value || [];
    this.selectedVersion = versions.find((v: EpisodeVersion) => v.versionNumber === versionNumber) || null;
    this.selectedVersionNumber = versionNumber;
  }

  copyVersionContent(): void {
    if (!this.selectedVersion) {
      this.messageService.warning('No version selected');
      return;
    }

    const content = this.selectedVersion.content;
    navigator.clipboard.writeText(content).then(
      () => {
        this.messageService.success('Version content copied to clipboard');
      },
      (err) => {
        this.messageService.error('Failed to copy content: ' + err);
      },
    );
  }

  copyCurrentContent(): void {
    const content = this.episodeForm.get('content')?.value || '';
    if (!content) {
      this.messageService.warning('No content to copy');
      return;
    }

    navigator.clipboard.writeText(content).then(
      () => {
        this.messageService.success('Current content copied to clipboard');
      },
      (err) => {
        this.messageService.error('Failed to copy content: ' + err);
      },
    );
  }

  restoreVersion(): void {
    if (!this.selectedVersionNumber) {
      this.messageService.warning('No version selected to restore');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Restore Version',
        message:
          `Are you sure you want to restore version ${this.selectedVersionNumber}? ` +
          `This will create a new version with the content from version ${this.selectedVersionNumber}.`,
        confirmButtonText: 'Restore',
        confirmButtonColor: 'accent',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed && this.selectedVersionNumber) {
        this.loadingService.show();
        this.subscriptions.add(
          this.episodeService.revertEpisodeVersion(this.episodeUuid, this.selectedVersionNumber).subscribe({
            next: (response) => {
              this.messageService.success(`Version ${this.selectedVersionNumber} restored successfully`);

              // Set flag to suppress live edit warning during restore
              this.isRestoring = true;

              // Update form with restored episode data
              this.episodeForm.patchValue(response.episode);

              // Update versions array
              const versionsFormArray = this.episodeForm.get('versions') as FormArray;
              versionsFormArray.clear();
              for (const version of response.episode.versions) {
                versionsFormArray.push(this.fb.group(version));
              }

              // Update audio to match the restored version
              const currentVersion = response.episode.versions.find(
                (v) => v.versionNumber === response.episode.currentVersionNumber,
              );
              if (currentVersion) {
                this.audioSrc = currentVersion.audioUrl || null;
                this.currentVersionCreator = currentVersion.createdBy?.username || null;
                this.currentVersionCreatedAt = currentVersion.createdAt || null;
                this.currentVersionValidationNotes = currentVersion.validationNotes || null;
                this.currentVersionChangeType = currentVersion.changeType || null;
              } else {
                this.audioSrc = null;
              }

              // Update live audio tracking (same logic as loadEpisodeData)
              if (response.episode.audioUrl) {
                this.liveAudioSrc = response.episode.audioUrl;
              } else if (response.episode.isLive) {
                // Find the most recent version (highest version number) that has audio
                const versionsWithAudio = response.episode.versions
                  .filter((v) => v.audioUrl)
                  .sort((a, b) => b.versionNumber - a.versionNumber);
                this.liveAudioSrc = versionsWithAudio.length > 0 ? versionsWithAudio[0].audioUrl || null : null;
              } else {
                this.liveAudioSrc = null;
              }

              // Find which version has the live audio URL
              if (this.liveAudioSrc) {
                const liveAudioVersion = response.episode.versions.find((v) => v.audioUrl === this.liveAudioSrc);
                this.liveAudioVersionNumber = liveAudioVersion?.versionNumber || null;
              } else {
                this.liveAudioVersionNumber = null;
              }

              // Update topic and audio custom upload status
              this.topic = response.episode.topic || null;
              this.audioIsCustomUpload = response.episode.audioIsCustomUpload || false;

              // Mark form as pristine and update initial values to prevent dirty state warning
              this.episodeForm.markAsPristine();
              this.episodeForm.markAsUntouched();
              this.initialFormValues = this.getEditableFormValues();
              this.hasUnsavedChanges = false;

              // Clear version selection
              this.selectedVersionNumber = null;
              this.selectedVersion = null;

              // Clear restoring flag after all updates are complete
              this.isRestoring = false;

              this.loadingService.hide();
            },
            error: (err) => {
              // Clear restoring flag on error too
              this.isRestoring = false;
              this.loadingService.hide();
              this.messageService.error(`Failed to restore version: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  getChangeTypeLabel(changeType: string): string {
    const labels: Record<string, string> = {
      created: 'Created',
      validated: 'Validated',
      edited: 'Edited',
      regenerated: 'Regenerated',
    };
    return labels[changeType] || changeType;
  }

  getChangeTypeIcon(changeType: string): string {
    const icons: Record<string, string> = {
      created: 'add_circle',
      validated: 'verified',
      edited: 'edit',
      regenerated: 'refresh',
    };
    return icons[changeType] || 'help';
  }

  validateEpisode(): void {
    this.messageService.info('Starting episode validation...');
    this.loadingService.show();

    this.subscriptions.add(
      this.episodeService.validateEpisodeManual(this.episodeUuid).subscribe({
        next: (response) => {
          this.jobService.addJob(response.job);
          this.messageService.success('Episode validation started. Job will complete in the background.');
          this.loadingService.hide();
        },
        error: (err) => {
          this.loadingService.hide();
          this.messageService.error(`Failed to start validation: ${err.message}`);
        },
      }),
    );
  }

  regenerateEpisode(): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Regenerate Episode',
        message:
          'Are you sure you want to regenerate this episode? ' +
          'This will create a new version with fresh content from the source articles.',
        confirmButtonText: 'Regenerate',
        confirmButtonColor: 'accent',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.messageService.info('Starting episode regeneration...');
        this.loadingService.show();

        this.subscriptions.add(
          this.episodeService.regenerateEpisode(this.episodeUuid).subscribe({
            next: (response) => {
              this.jobService.addJob(response.job);
              this.messageService.success('Episode regeneration started. Job will complete in the background.');
              this.loadingService.hide();
            },
            error: (err) => {
              this.loadingService.hide();
              this.messageService.error(`Failed to start regeneration: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  isVersionFullyValidated(version: EpisodeVersion): boolean {
    return version.validatedCompliance && version.validatedFacts && version.validatedLength;
  }

  isCurrentVersionFullyValidated(): boolean {
    const currentVersionNumber = this.episodeForm.get('currentVersionNumber')?.value;
    const versions = this.episodeForm.get('versions')?.value;
    if (!currentVersionNumber || !versions || versions.length === 0) return false;

    const currentVersion = versions.find((v: EpisodeVersion) => v.versionNumber === currentVersionNumber);
    if (!currentVersion) return false;

    return this.isVersionFullyValidated(currentVersion);
  }

  getCurrentVersionValidationTooltip(): string {
    const currentVersionNumber = this.episodeForm.get('currentVersionNumber')?.value;
    const versions = this.episodeForm.get('versions')?.value;
    if (!currentVersionNumber || !versions || versions.length === 0) return 'No version information';

    const currentVersion = versions.find((v: EpisodeVersion) => v.versionNumber === currentVersionNumber);
    if (!currentVersion) return 'Current version not found';

    return this.getValidationTooltip(currentVersion);
  }

  getValidationTooltip(version: EpisodeVersion): string {
    const parts: string[] = [];
    parts.push(`Facts: ${version.validatedFacts ? '✓' : '✗'}`);
    parts.push(`Length: ${version.validatedLength ? '✓' : '✗'}`);
    parts.push(`Compliance: ${version.validatedCompliance ? '✓' : '✗'}`);

    const status = this.isVersionFullyValidated(version) ? 'Validated' : 'Not Validated';
    return `${status}\n - ${parts.join('\n - ')}`;
  }

  getVersionWordCount(version: EpisodeVersion): number {
    return this.countWords(version.content);
  }

  getVersionCharCount(version: EpisodeVersion): number {
    return version.content.length;
  }

  markdownToHtml(markdown: string | null): SafeHtml {
    if (!markdown) return '';
    const html = marked.parse(markdown, { async: false }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private getEditableFormValues(): EditableFormValues {
    const formValues = this.episodeForm.getRawValue();
    return {
      title: formValues.title,
      description: formValues.description,
      content: formValues.content,
      isLive: formValues.isLive,
    };
  }

  private checkForUnsavedChanges(): void {
    if (!this.initialFormValues) {
      return;
    }
    const currentValues = this.getEditableFormValues();
    const hasChanges =
      currentValues.title !== this.initialFormValues.title ||
      currentValues.description !== this.initialFormValues.description ||
      currentValues.content !== this.initialFormValues.content ||
      currentValues.isLive !== this.initialFormValues.isLive;

    // Check if user is editing content fields (not just toggling isLive)
    const hasContentChanges =
      currentValues.title !== this.initialFormValues.title ||
      currentValues.description !== this.initialFormValues.description ||
      currentValues.content !== this.initialFormValues.content;

    // If user is making content changes for the first time on a live episode with audio, warn them
    // BUT NOT during restore operations (restore dialog already warns them)
    // AND NOT during backend updates (validation, regeneration jobs completing)
    const isFirstContentChange = hasContentChanges && !this.hasUnsavedChanges && !this.hasAcknowledgedLiveEditWarning;
    const shouldShowWarning =
      isFirstContentChange && !this.isRestoring && !this.isUpdatingFromBackend && this.shouldWarnAboutLiveEdit();
    if (shouldShowWarning) {
      this.showLiveEditWarning();
    }

    this.hasUnsavedChanges = hasChanges;
  }

  public shouldWarnAboutLiveEdit(): boolean {
    const isLive = this.episodeForm.get('isLive')?.value;
    // ONLY warn if the CURRENT version has audio
    // If current version has no audio (audioSrc is null), it means user already made edits
    // and we've already warned them - no need to warn again on subsequent edits
    const currentVersionHasAudio = this.audioSrc !== null;
    return isLive && currentVersionHasAudio;
  }

  private showLiveEditWarning(): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Editing Live Episode',
        message:
          'You are about to edit a live episode with published audio.\n\n' +
          'The current audio file will remain live until you generate a new audio version. ' +
          'When audio is generated for the current version it will automatically replace it.\n\n' +
          'Any edits you make can be saved but will not match the live audio until you regenerate it.',
        confirmButtonText: 'Continue Editing',
        confirmButtonColor: 'primary',
        cancelButtonText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.hasAcknowledgedLiveEditWarning = true;
      } else {
        // User cancelled, revert the changes
        this.episodeForm.patchValue(this.initialFormValues || {}, { emitEvent: false });
        this.hasUnsavedChanges = false;
      }
    });
  }

  canDeactivate(): boolean {
    if (this.hasUnsavedChanges) {
      return confirm('You have unsaved changes. Are you sure you want to leave this page?');
    }
    return true;
  }

  isGenerateAudioDisabled(): boolean {
    // Allow generation if:
    // - No audio exists, OR
    // - Audio is a custom upload (user can override it)
    // But NOT if there are unsaved changes
    if (this.hasUnsavedChanges) {
      return true;
    }
    // Allow if no audio OR if audio is custom (can be overridden)
    return this.audioSrc !== null && !this.audioIsCustomUpload;
  }

  getUpdateButtonTooltip(): string {
    if (this.hasUnsavedChanges) {
      return 'Save your changes';
    }
    return 'No changes to save';
  }

  getGenerateAudioTooltip(): string {
    if (this.hasUnsavedChanges) {
      return 'You have unsaved changes. Please save before generating audio';
    }
    if (this.audioSrc && this.audioIsCustomUpload) {
      return 'Generate audio from transcript (will replace custom uploaded audio)';
    }
    if (this.audioSrc) {
      return 'Audio already exists for current version';
    }
    return 'Generate audio for this episode';
  }

  hasCurrentVersionAudio(): boolean {
    return this.audioSrc !== null;
  }

  hasLiveAudioFromDifferentVersion(): boolean {
    // This method determines if we should show a separate "Live on RSS Feed" audio player
    // We only show it when the published audio is different from the current version's audio

    const isLive = this.episodeForm.get('isLive')?.value;

    // Don't show if the episode is not marked as live
    if (!isLive) {
      return false;
    }

    // Don't show if there's no live audio at all
    if (!this.liveAudioSrc) {
      return false;
    }

    // Don't show if current version audio matches the live audio (they're the same)
    if (this.audioSrc === this.liveAudioSrc) {
      return false;
    }

    // Show the live audio section when:
    // 1. Episode is marked as live, AND
    // 2. Current version has no audio (user edited transcript after publishing), OR
    // 3. Current version has different audio than what's live (user generated new audio but hasn't published)
    return true;
  }

  getLiveAudioVersionText(): string {
    if (this.liveAudioVersionNumber !== null) {
      return `Version ${this.liveAudioVersionNumber}`;
    }
    return 'Previous version';
  }

  /**
   * Checks if ANY version of the episode has audio
   * Used to determine if the "Live" checkbox should be shown
   */
  hasAnyVersionWithAudio(): boolean {
    const versions = this.episodeForm.get('versions')?.value || [];
    return versions.some((version: EpisodeVersion) => version.audioUrl !== null && version.audioUrl !== undefined);
  }

  getPublicShareUrl(): string {
    const episode = this.episodeForm.getRawValue();
    if (!episode.uuid || !episode.title) {
      return '';
    }
    return this.shareService.buildEpisodeUrl(episode.uuid, episode.title);
  }

  getEpisodeDescription(): string {
    const episode = this.episodeForm.getRawValue();
    return episode.description || '';
  }
}
