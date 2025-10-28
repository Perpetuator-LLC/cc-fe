// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, TemplateRef, ViewChild, OnDestroy, HostListener } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Episode, EpisodeService, EpisodeVersion } from '../episode.service';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { MessageService } from '../message.service';
import { ToolbarService } from '../toolbar.service';
import { MessageComponent } from '../message/message.component';
import { MatCard, MatCardHeader, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { DatePipe, NgClass } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { Subscription } from 'rxjs';
import { Job, JobService, JobStatus, JobKind, stringToJobKind } from '../job.service';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { toObservable } from '@angular/core/rxjs-interop';
import { FetchPolicy } from '@apollo/client';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';
import { SchedulingService, Schedule } from '../scheduling.service';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { LoadingService } from '../loading.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

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
    MessageComponent,
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
    MatOption,
    MatSlideToggle,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
  ],
  templateUrl: './episode-detail.component.html',
  styleUrl: './episode-detail.component.scss',
})
export class EpisodeDetailComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  episodeForm: FormGroup;
  audioSrc: string | null = null;
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
  ) {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (!uuid) {
      throw new Error('Failed to get Episode ID from route.');
    }
    this.episodeUuid = uuid;

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
      podcast: this.fb.group({
        id: [{ value: '', disabled: true }],
        uuid: [{ value: '', disabled: true }],
        name: [{ value: '', disabled: true }],
      }),
    });
    this.subscriptions.add(
      toObservable(this.jobService.jobs).subscribe({
        next: (jobs) => {
          this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.COMPLETED).forEach((job) => {
            if ([JobKind.UPDATE_EPISODE_AUDIO].includes(stringToJobKind(job.kind))) {
              this.loadEpisodeData('network-only');
            } else if (
              [
                JobKind.VALIDATE_EPISODE,
                JobKind.VALIDATE_EPISODE_COMPLIANCE,
                JobKind.VALIDATE_EPISODE_FACTS,
                JobKind.VALIDATE_EPISODE_LENGTH,
              ].includes(stringToJobKind(job.kind))
            ) {
              this.loadEpisodeData('network-only');
            } else if ([JobKind.CREATE_EPISODE].includes(stringToJobKind(job.kind))) {
              // Extract episode UUID from job result JSON object
              const episodeUuid = job.result?.episode_uuid;
              if (episodeUuid) {
                this.subscriptions.add(
                  this.episodeService.getEpisodeById(episodeUuid).subscribe({
                    next: (episode) => {
                      const newEpisodeUrl = `/episode/${episodeUuid}`;
                      this.messageService.success(
                        `New episode: <a href="${newEpisodeUrl}">${episode.title}</a>`,
                        null,
                        true,
                      );
                    },
                    error: (error) => {
                      this.messageService.error(`Failed to get new episode: ${error.message}`);
                    },
                  }),
                );
              }
            }
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
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);

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
          this.episodeForm.patchValue(episode);

          const newsFormArray = this.episodeForm.get('news') as FormArray;
          newsFormArray.clear();
          for (const newsSummary of episode.news) {
            newsFormArray.push(this.fb.group(newsSummary));
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
            this.audioSrc = episode.audioUrl;
          }

          this.initialFormValues = this.getEditableFormValues();
          this.hasUnsavedChanges = false;

          this.loadingService.hide();
        },
        error: (err) => {
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
    this.episodeForm.value.isLive = isLive;
    this.updateEpisode();
  }

  downloadAudio(): void {
    if (this.audioSrc) {
      const a = document.createElement('a');
      a.href = this.audioSrc;
      a.download = `episode_${this.episodeUuid}.mp3`; // Set the download file name
      a.click(); // Programmatically trigger the download
    }
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
    const formValues = this.episodeForm.getRawValue() as Episode;
    this.subscriptions.add(
      this.episodeService
        .updateEpisode(formValues.uuid, formValues.title, formValues.description, formValues.content, formValues.isLive)
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
              this.router.navigate(['/episodes']); // Navigate back to episodes list
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
              this.episodeForm.patchValue(response.episode);

              const versionsFormArray = this.episodeForm.get('versions') as FormArray;
              versionsFormArray.clear();
              for (const version of response.episode.versions) {
                versionsFormArray.push(this.fb.group(version));
              }

              this.selectedVersionNumber = null;
              this.selectedVersion = null;
              this.loadingService.hide();
            },
            error: (err) => {
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

  markdownToHtml(markdown: string): SafeHtml {
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
    this.hasUnsavedChanges =
      currentValues.title !== this.initialFormValues.title ||
      currentValues.description !== this.initialFormValues.description ||
      currentValues.content !== this.initialFormValues.content ||
      currentValues.isLive !== this.initialFormValues.isLive;
  }

  canDeactivate(): boolean {
    if (this.hasUnsavedChanges) {
      return confirm('You have unsaved changes. Are you sure you want to leave this page?');
    }
    return true;
  }

  isGenerateAudioDisabled(): boolean {
    return this.audioSrc !== null || this.hasUnsavedChanges;
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
    if (this.audioSrc) {
      return 'Audio already exists for current version';
    }
    return 'Generate audio for this episode';
  }
}
