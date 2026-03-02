// Copyright (c) 2026 Perpetuator LLC
import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { Subscription } from 'rxjs';
import { Schedule, SchedulingService } from '../../../scheduling.service';
import { MessageService } from '../../../message.service';
import {
  COMMON_TIMEZONES,
  DayOfWeek,
  DayPattern,
  DAYS_OF_WEEK,
  FriendlyJobType,
  FriendlyScheduleInput,
  FriendlyScheduleType,
  ScheduleContext,
} from '../schedule.types';
import {
  friendlyToSchedule,
  getDaysForPattern,
  getJobTypesForContext,
  getUserTimezone,
  scheduleToFriendly,
} from '../schedule.utils';

export interface FriendlyScheduleDialogData {
  schedule?: Schedule | null;
  context: ScheduleContext;
  // Pre-selected entity UUIDs
  podcastUuid?: string;
  pulseConfigUuid?: string;
  episodeUuid?: string;
  // Episode name for display
  episodeName?: string;
  // For podcast context, we need the list to choose from
  podcasts?: { uuid: string; name: string }[];
  // For pulse context
  pulseConfigs?: { uuid: string; name: string }[];
  // For episode release (unpublished episodes, newest first)
  episodes?: { uuid: string; name: string; podcastName?: string }[];
}

@Component({
  selector: 'app-friendly-schedule-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './friendly-schedule-dialog.component.html',
  styleUrls: ['./friendly-schedule-dialog.component.scss'],
})
export class FriendlyScheduleDialogComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly schedulingService = inject(SchedulingService);
  private readonly messageService = inject(MessageService);
  private readonly dialogRef = inject(MatDialogRef<FriendlyScheduleDialogComponent>);
  protected readonly data = inject<FriendlyScheduleDialogData>(MAT_DIALOG_DATA);

  private subscriptions = new Subscription();

  scheduleForm: FormGroup;
  jobTypes: FriendlyJobType[] = [];
  daysOfWeek = DAYS_OF_WEEK;
  timezones = COMMON_TIMEZONES;
  userTimezone = getUserTimezone();

  // State
  saving = false;

  // Date picker min date (today)
  minDate = new Date();

  get isEditing(): boolean {
    return !!this.data.schedule;
  }

  get selectedJobType(): FriendlyJobType | undefined {
    const jobKind = this.scheduleForm?.get('jobKind')?.value;
    return this.jobTypes.find((jt) => jt.value === jobKind);
  }

  get isEpisodeRelease(): boolean {
    const jobKind = this.scheduleForm?.get('jobKind')?.value;
    return jobKind === 'PUBLISH_EPISODE_AUDIO' || this.data.context === 'episode';
  }

  get dialogTitle(): string {
    if (this.isEditing) {
      return 'Edit Schedule';
    }
    switch (this.data.context) {
      case 'podcast':
        return 'Schedule Podcast Episodes';
      case 'pulse':
        return 'Schedule Pulse Recording';
      case 'episode':
        return 'Schedule Episode Release';
      default:
        return 'Create Schedule';
    }
  }

  get submitButtonText(): string {
    return this.isEditing ? 'Update Schedule' : 'Create Schedule';
  }

  get showPodcastSelect(): boolean {
    // Show podcast select for podcast-related job types
    const jobKind = this.scheduleForm?.get('jobKind')?.value;
    const isPodcastJob =
      jobKind === 'PUBLISH_LATEST_EPISODE_CHAIN' || jobKind === 'PUBLISH_RESEARCH_TOPIC_EPISODE_CHAIN';
    // Show if it's a podcast job AND we have podcasts to show AND not locked
    return isPodcastJob && (this.data.podcasts?.length ?? 0) > 0 && !this.isPodcastLocked;
  }

  get showPodcastDisplay(): boolean {
    // Show podcast display when we have a pre-selected/locked podcast
    const jobKind = this.scheduleForm?.get('jobKind')?.value;
    const isPodcastJob =
      jobKind === 'PUBLISH_LATEST_EPISODE_CHAIN' || jobKind === 'PUBLISH_RESEARCH_TOPIC_EPISODE_CHAIN';
    return isPodcastJob && this.isPodcastLocked;
  }

  get isPodcastLocked(): boolean {
    // Lock the podcast select when we're in podcast context with a pre-selected podcast
    return !!this.data.podcastUuid;
  }

  get selectedPodcastName(): string {
    const podcastUuid = this.scheduleForm?.get('podcastUuid')?.value || this.data.podcastUuid;
    if (!podcastUuid) return '';
    const podcast = this.data.podcasts?.find((p) => p.uuid === podcastUuid);
    return podcast?.name || 'Selected Podcast';
  }

  get showPulseSelect(): boolean {
    // Show pulse select for pulse-related job types
    const jobKind = this.scheduleForm?.get('jobKind')?.value;
    const isPulseJob = jobKind === 'PUBLISH_PULSE_CHAIN';
    // Show if it's a pulse job AND we have pulse configs to show AND not locked
    return isPulseJob && (this.data.pulseConfigs?.length ?? 0) > 0 && !this.isPulseLocked;
  }

  get showPulseDisplay(): boolean {
    // Show pulse display when we have a pre-selected/locked pulse
    const jobKind = this.scheduleForm?.get('jobKind')?.value;
    const isPulseJob = jobKind === 'PUBLISH_PULSE_CHAIN';
    return isPulseJob && this.isPulseLocked;
  }

  get isPulseLocked(): boolean {
    // Lock the pulse select when we're in pulse context with a pre-selected pulse
    return !!this.data.pulseConfigUuid;
  }

  get selectedPulseName(): string {
    const pulseUuid = this.scheduleForm?.get('pulseConfigUuid')?.value || this.data.pulseConfigUuid;
    if (!pulseUuid) return '';
    const pulse = this.data.pulseConfigs?.find((p) => p.uuid === pulseUuid);
    return pulse?.name || 'Selected Pulse';
  }

  get showEpisodeSelect(): boolean {
    // Show episode select for episode release job types
    const jobKind = this.scheduleForm?.get('jobKind')?.value;
    const isEpisodeJob = jobKind === 'PUBLISH_EPISODE_AUDIO';
    // Show if it's an episode job AND we have episodes to show AND we're not already locked to an episode
    return isEpisodeJob && (this.data.episodes?.length ?? 0) > 0 && !this.data.episodeUuid;
  }

  get isEpisodeLocked(): boolean {
    // Lock the episode select when we're in episode context with a pre-selected episode
    return !!this.data.episodeUuid;
  }

  get selectedEpisodeName(): string {
    // Get the name of the currently selected episode
    const episodeUuid = this.scheduleForm?.get('episodeUuid')?.value || this.data.episodeUuid;
    if (!episodeUuid) return '';

    // First check if it's from data (pre-selected)
    if (this.data.episodeName && this.data.episodeUuid === episodeUuid) {
      return this.data.episodeName;
    }

    // Otherwise find from episodes list
    const episode = this.data.episodes?.find((e) => e.uuid === episodeUuid);
    return episode?.name || '';
  }

  get isRecurring(): boolean {
    return this.scheduleForm.get('scheduleType')?.value === 'recurring' && !this.isEpisodeRelease;
  }

  get showDaySelector(): boolean {
    return this.isRecurring && this.scheduleForm.get('dayPattern')?.value === 'custom';
  }

  constructor() {
    this.jobTypes = getJobTypesForContext(this.data.context);

    // Set default job kind based on context
    const defaultJobKind = this.jobTypes.length > 0 ? this.jobTypes[0].value : '';

    // Set default schedule type based on context
    const defaultScheduleType: FriendlyScheduleType = this.data.context === 'episode' ? 'one-time' : 'recurring';

    // Set default date/time for one-time schedules (1 hour from now)
    const defaultDate = new Date();
    defaultDate.setHours(defaultDate.getHours() + 1);
    defaultDate.setMinutes(0);
    defaultDate.setSeconds(0);
    const hours = defaultDate.getHours().toString().padStart(2, '0');
    const minutes = defaultDate.getMinutes().toString().padStart(2, '0');
    const defaultTime = `${hours}:${minutes}`;

    // Build form
    this.scheduleForm = this.fb.group({
      name: ['', Validators.required],
      jobKind: [defaultJobKind, Validators.required],
      scheduleType: [defaultScheduleType, Validators.required],
      dayPattern: ['weekdays' as DayPattern],
      selectedDays: [[0, 1, 2, 3, 4] as DayOfWeek[]],
      time: ['09:00'],
      scheduledDate: [defaultDate],
      scheduledTime: [defaultTime],
      timezone: [this.findMatchingTimezone(this.userTimezone)],
      enabled: [true],
      podcastUuid: [this.data.podcastUuid || ''],
      pulseConfigUuid: [this.data.pulseConfigUuid || ''],
      episodeUuid: [this.data.episodeUuid || ''],
    });

    // If editing, load existing schedule data
    if (this.data.schedule) {
      this.loadScheduleData(this.data.schedule);
    }

    // Generate default name and force one-time for episode release
    this.scheduleForm.get('jobKind')?.valueChanges.subscribe((jobKind) => {
      if (!this.isEditing) {
        const jobType = this.jobTypes.find((jt) => jt.value === jobKind);
        if (jobType) {
          this.scheduleForm.patchValue({ name: jobType.label });
        }
      }
      // Force one-time for episode release
      if (jobKind === 'PUBLISH_EPISODE_AUDIO') {
        this.scheduleForm.patchValue({ scheduleType: 'one-time' });
      }
    });

    // Update selected days when pattern changes
    this.scheduleForm.get('dayPattern')?.valueChanges.subscribe((pattern) => {
      if (pattern !== 'custom') {
        this.scheduleForm.patchValue({ selectedDays: getDaysForPattern(pattern) });
      }
    });

    // Set initial name if not editing
    if (!this.isEditing && defaultJobKind) {
      const jobType = this.jobTypes.find((jt) => jt.value === defaultJobKind);
      if (jobType) {
        this.scheduleForm.patchValue({ name: jobType.label });
      }
    }
  }

  private findMatchingTimezone(tz: string): string {
    const found = this.timezones.find((t) => t.value === tz);
    return found ? found.value : 'America/New_York';
  }

  private loadScheduleData(schedule: Schedule) {
    const friendly = scheduleToFriendly(schedule);

    // Parse scheduledDateTime into separate date and time
    let scheduledDate: Date | null = null;
    let scheduledTime = '09:00';
    if (friendly.scheduledDateTime) {
      const dt = new Date(friendly.scheduledDateTime);
      scheduledDate = dt;
      scheduledTime = `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
    }

    this.scheduleForm.patchValue({
      name: friendly.name,
      jobKind: friendly.jobKind,
      scheduleType: friendly.scheduleType,
      dayPattern: friendly.dayPattern || 'weekdays',
      selectedDays: friendly.selectedDays || [0, 1, 2, 3, 4],
      time: friendly.time || '09:00',
      scheduledDate,
      scheduledTime,
      timezone: this.findMatchingTimezone(friendly.timezone),
      enabled: friendly.enabled,
      podcastUuid: friendly.podcastUuid || this.data.podcastUuid || '',
      pulseConfigUuid: friendly.pulseConfigUuid || this.data.pulseConfigUuid || '',
    });
  }

  toggleDay(day: DayOfWeek) {
    const selectedDays = [...(this.scheduleForm.get('selectedDays')?.value || [])];
    const index = selectedDays.indexOf(day);

    if (index > -1) {
      selectedDays.splice(index, 1);
    } else {
      selectedDays.push(day);
      selectedDays.sort();
    }

    this.scheduleForm.patchValue({
      selectedDays,
      dayPattern: 'custom',
    });
  }

  isDaySelected(day: DayOfWeek): boolean {
    const selectedDays = this.scheduleForm.get('selectedDays')?.value || [];
    return selectedDays.includes(day);
  }

  onSubmit() {
    if (this.scheduleForm.invalid) {
      this.messageService.error('Please fill in all required fields');
      return;
    }

    if (this.saving) return;
    this.saving = true;

    const formValue = this.scheduleForm.value;

    // Determine effective schedule type (episode release is always one-time)
    const effectiveScheduleType: FriendlyScheduleType = this.isEpisodeRelease ? 'one-time' : formValue.scheduleType;

    // For one-time schedules, combine date and time into datetime
    let scheduledDateTime: string | undefined;
    if (effectiveScheduleType === 'one-time') {
      if (formValue.scheduledDate && formValue.scheduledTime) {
        const date = new Date(formValue.scheduledDate);
        const [hours, minutes] = formValue.scheduledTime.split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);
        scheduledDateTime = date.toISOString();
      } else if (formValue.scheduledDate) {
        // If only date is set, use 9 AM as default
        const date = new Date(formValue.scheduledDate);
        date.setHours(9, 0, 0, 0);
        scheduledDateTime = date.toISOString();
      } else {
        // Default to 1 hour from now if not set
        const defaultDate = new Date();
        defaultDate.setHours(defaultDate.getHours() + 1);
        defaultDate.setMinutes(0);
        defaultDate.setSeconds(0);
        scheduledDateTime = defaultDate.toISOString();
      }
    }

    // Build friendly input
    // Determine episodeUuid - use form value if available, otherwise use data prop
    const episodeUuid = formValue.episodeUuid || this.data.episodeUuid;
    // Get episode name for display purposes
    let episodeName = this.data.episodeName;
    if (episodeUuid && !episodeName) {
      const episode = this.data.episodes?.find((e) => e.uuid === episodeUuid);
      episodeName = episode?.name;
    }

    const input: FriendlyScheduleInput = {
      name: formValue.name,
      jobKind: formValue.jobKind,
      scheduleType: effectiveScheduleType,
      dayPattern: formValue.dayPattern,
      selectedDays: formValue.selectedDays,
      time: formValue.time,
      scheduledDateTime,
      timezone: formValue.timezone,
      enabled: formValue.enabled,
      podcastUuid: formValue.podcastUuid || this.data.podcastUuid,
      pulseConfigUuid: formValue.pulseConfigUuid || this.data.pulseConfigUuid,
      episodeUuid,
      episodeName,
    };

    // Convert to backend schedule format
    const scheduleData = friendlyToSchedule(input);

    if (this.isEditing && this.data.schedule) {
      this.subscriptions.add(
        this.schedulingService.updateSchedule(this.data.schedule.uuid, scheduleData).subscribe({
          next: (response) => {
            this.saving = false;
            this.messageService.success('Schedule updated successfully');
            this.dialogRef.close({ schedule: response.schedule });
          },
          error: (err: { message: string }) => {
            this.saving = false;
            this.messageService.error(`Failed to update schedule: ${err.message}`);
          },
        }),
      );
    } else {
      this.subscriptions.add(
        this.schedulingService.createSchedule(scheduleData).subscribe({
          next: (response) => {
            this.saving = false;
            this.messageService.success('Schedule created successfully');
            this.dialogRef.close({ schedule: response.schedule });
          },
          error: (err: { message: string }) => {
            this.saving = false;
            this.messageService.error(`Failed to create schedule: ${err.message}`);
          },
        }),
      );
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
