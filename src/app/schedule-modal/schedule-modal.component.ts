// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatHint, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { SchedulingService, Schedule, ScheduleType, SolarEvent } from '../scheduling.service';
import { PodcastsService, PodcastsResult } from '../podcasts.service';
import { MessageService } from '../message.service';
import { parseScheduleArgs } from '../utils/schedule';

export interface ScheduleModalData {
  schedule?: Schedule;
  podcastUuid?: string;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-schedule-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatButton,
    MatIcon,
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatInput,
    MatSelect,
    MatOption,
    MatSlideToggle,
    MatProgressBar,
    MatTooltip,
  ],
  templateUrl: './schedule-modal.component.html',
  styleUrl: './schedule-modal.component.scss',
})
export class ScheduleModalComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  scheduleForm: FormGroup;
  podcasts: PodcastsResult[] = [];
  loading = false;
  loadingPodcasts = false;

  // Crontab enhancement properties
  showAdvancedCron = false;
  selectedPreset = '';
  userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  crontabPresets = [
    { value: 'daily_9am', label: 'Daily at 9:00 AM' },
    { value: 'daily_6pm', label: 'Daily at 6:00 PM' },
    { value: 'weekdays_9am', label: 'Weekdays at 9:00 AM' },
    { value: 'weekends_10am', label: 'Weekends at 10:00 AM' },
    { value: 'every_2h', label: 'Every 2 Hours' },
    { value: 'every_6h', label: 'Every 6 Hours' },
    { value: 'every_30min', label: 'Every 30 Minutes' },
    { value: 'weekly_monday_9am', label: 'Weekly on Monday at 9:00 AM' },
    { value: 'monthly_1st_9am', label: 'Monthly on 1st at 9:00 AM' },
  ];

  schedulableJobKinds = ['PUBLISH_LATEST_EPISODE_CHAIN'];

  scheduleTypes = Object.values(ScheduleType);
  solarEvents = Object.values(SolarEvent);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ScheduleModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ScheduleModalData,
    private schedulingService: SchedulingService,
    private podcastsService: PodcastsService,
    private messageService: MessageService,
  ) {
    this.scheduleForm = this.fb.group({
      name: ['', Validators.required],
      jobKind: ['PUBLISH_LATEST_EPISODE_CHAIN', Validators.required],
      scheduleType: [ScheduleType.INTERVAL, Validators.required],
      podcastUuid: [this.data.podcastUuid || ''],
      enabled: [true],
      interval: [3600],
      cronHour: [9],
      cronMinute: [0],
      cronDayOfWeek: ['*'],
      cronDayOfMonth: ['*'],
      cronMonthOfYear: ['*'],
      clockedTime: [''],
      solarEvent: [SolarEvent.SUNRISE],
      solarLatitude: [40.7128],
      solarLongitude: [-74.006],
    });
  }

  ngOnInit(): void {
    this.loadPodcasts();

    if (this.data.mode === 'edit' && this.data.schedule) {
      this.populateFormForEdit();
    } else if (this.data.podcastUuid) {
      // Pre-select podcast if provided
      this.scheduleForm.patchValue({
        podcastUuid: this.data.podcastUuid,
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadPodcasts(): void {
    this.loadingPodcasts = true;
    this.subscriptions.add(
      this.podcastsService.getPodcasts().subscribe({
        next: (response) => {
          this.podcasts = response.podcasts;
          this.loadingPodcasts = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load podcasts: ${err.message}`);
          this.loadingPodcasts = false;
        },
      }),
    );
  }

  private populateFormForEdit(): void {
    if (!this.data.schedule) return;

    const schedule = this.data.schedule;
    const parsedArgs = parseScheduleArgs(schedule.args);
    const podcastUuid = parsedArgs['podcast_uuid'] || '';

    this.scheduleForm.patchValue({
      name: schedule.name,
      jobKind: schedule.jobKind,
      scheduleType: schedule.scheduleType || ScheduleType.INTERVAL,
      podcastUuid: podcastUuid,
      enabled: schedule.enabled,
      interval: schedule.interval,
      cronHour: schedule.cronHour,
      cronMinute: schedule.cronMinute,
      cronDayOfWeek: schedule.cronDayOfWeek,
      cronDayOfMonth: schedule.cronDayOfMonth,
      cronMonthOfYear: schedule.cronMonthOfYear,
      clockedTime: schedule.clockedTime,
      solarEvent: schedule.solarEvent,
      solarLatitude: schedule.solarLatitude,
      solarLongitude: schedule.solarLongitude,
    });
  }

  onSubmit(): void {
    if (this.scheduleForm.invalid) {
      this.messageService.error('Please fill in all required fields');
      return;
    }

    this.loading = true;
    const formValue = this.scheduleForm.value;

    if (this.data.mode === 'edit' && this.data.schedule) {
      this.updateSchedule(formValue);
    } else {
      this.createSchedule(formValue);
    }
  }

  private createSchedule(formValue: Record<string, unknown>): void {
    const scheduleData: Partial<Schedule> = {
      name: formValue['name'] as string,
      jobKind: formValue['jobKind'] as string,
      scheduleType: formValue['scheduleType'] as ScheduleType,
      enabled: formValue['enabled'] as boolean,
      args: {
        podcast_uuid: formValue['podcastUuid'] as string,
      },
      interval: formValue['interval'] as number,
      cronHour: String(formValue['cronHour']),
      cronMinute: String(formValue['cronMinute']),
      cronDayOfWeek: formValue['cronDayOfWeek'] as string,
      cronDayOfMonth: formValue['cronDayOfMonth'] as string,
      cronMonthOfYear: formValue['cronMonthOfYear'] as string,
      clockedTime:
        formValue['clockedTime'] && formValue['clockedTime'] !== '' ? (formValue['clockedTime'] as string) : undefined,
      solarEvent: formValue['solarEvent'] as SolarEvent,
      solarLatitude: formValue['solarLatitude'] as number,
      solarLongitude: formValue['solarLongitude'] as number,
    };

    this.subscriptions.add(
      this.schedulingService.createSchedule(scheduleData).subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.success('Schedule created successfully');
            this.dialogRef.close(response.schedule);
          } else {
            this.messageService.error(response.message);
          }
          this.loading = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to create schedule: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  private updateSchedule(formValue: Record<string, unknown>): void {
    if (!this.data.schedule) return;

    const scheduleData: Partial<Schedule> = {
      name: formValue['name'] as string,
      jobKind: formValue['jobKind'] as string,
      scheduleType: formValue['scheduleType'] as ScheduleType,
      enabled: formValue['enabled'] as boolean,
      args: {
        podcast_uuid: formValue['podcastUuid'] as string,
      },
      interval: formValue['interval'] as number,
      cronHour: String(formValue['cronHour']),
      cronMinute: String(formValue['cronMinute']),
      cronDayOfWeek: formValue['cronDayOfWeek'] as string,
      cronDayOfMonth: formValue['cronDayOfMonth'] as string,
      cronMonthOfYear: formValue['cronMonthOfYear'] as string,
      clockedTime:
        formValue['clockedTime'] && formValue['clockedTime'] !== '' ? (formValue['clockedTime'] as string) : undefined,
      solarEvent: formValue['solarEvent'] as SolarEvent,
      solarLatitude: formValue['solarLatitude'] as number,
      solarLongitude: formValue['solarLongitude'] as number,
    };

    this.subscriptions.add(
      this.schedulingService.updateSchedule(this.data.schedule.uuid, scheduleData).subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.success('Schedule updated successfully');
            this.dialogRef.close(response.schedule);
          } else {
            this.messageService.error(response.message);
          }
          this.loading = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to update schedule: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onScheduleTypeChange(): void {
    // Reset form fields when schedule type changes
    const scheduleType = this.scheduleForm.get('scheduleType')?.value;

    if (scheduleType === ScheduleType.INTERVAL) {
      this.scheduleForm.patchValue({
        cronHour: 9,
        cronMinute: 0,
        cronDayOfWeek: '*',
        cronDayOfMonth: '*',
        cronMonthOfYear: '*',
        clockedTime: '',
        solarEvent: SolarEvent.SUNRISE,
        solarLatitude: 40.7128,
        solarLongitude: -74.006,
      });
    }
  }

  applyPreset(preset: string): void {
    if (!preset) return;

    const presets: Record<
      string,
      {
        cronHour: number | string;
        cronMinute: number | string;
        cronDayOfWeek: string;
        cronDayOfMonth: string;
        cronMonthOfYear: string;
      }
    > = {
      daily_9am: { cronHour: 9, cronMinute: 0, cronDayOfWeek: '*', cronDayOfMonth: '*', cronMonthOfYear: '*' },
      daily_6pm: { cronHour: 18, cronMinute: 0, cronDayOfWeek: '*', cronDayOfMonth: '*', cronMonthOfYear: '*' },
      weekdays_9am: { cronHour: 9, cronMinute: 0, cronDayOfWeek: '1-5', cronDayOfMonth: '*', cronMonthOfYear: '*' },
      weekends_10am: { cronHour: 10, cronMinute: 0, cronDayOfWeek: '0,6', cronDayOfMonth: '*', cronMonthOfYear: '*' },
      every_2h: { cronHour: '*/2', cronMinute: 0, cronDayOfWeek: '*', cronDayOfMonth: '*', cronMonthOfYear: '*' },
      every_6h: { cronHour: '*/6', cronMinute: 0, cronDayOfWeek: '*', cronDayOfMonth: '*', cronMonthOfYear: '*' },
      every_30min: { cronHour: '*', cronMinute: '*/30', cronDayOfWeek: '*', cronDayOfMonth: '*', cronMonthOfYear: '*' },
      weekly_monday_9am: { cronHour: 9, cronMinute: 0, cronDayOfWeek: '1', cronDayOfMonth: '*', cronMonthOfYear: '*' },
      monthly_1st_9am: { cronHour: 9, cronMinute: 0, cronDayOfWeek: '*', cronDayOfMonth: '1', cronMonthOfYear: '*' },
    };

    const presetConfig = presets[preset];
    if (presetConfig) {
      this.scheduleForm.patchValue(presetConfig);
    }
  }

  getFormTitle(): string {
    return this.data.mode === 'edit' ? 'Edit Schedule' : 'Create Schedule';
  }

  formatJobKind(jobKind: string): string {
    return jobKind.replace(/_/g, ' ');
  }

  formatSolarEvent(event: SolarEvent): string {
    return event
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  getCronPreview(): string {
    const formValue = this.scheduleForm.value;
    const { cronHour, cronMinute, cronDayOfWeek } = formValue;

    if (cronHour === '*' || cronMinute === '*') {
      return 'Every hour';
    }

    const hour = cronHour === '*' ? 'every hour' : `${cronHour}:${cronMinute.toString().padStart(2, '0')}`;
    const day = cronDayOfWeek === '*' ? 'every day' : `on ${cronDayOfWeek}`;

    return `At ${hour} ${day}`;
  }

  getCronExpression(): string {
    const formValue = this.scheduleForm.value;
    const { cronMinute, cronHour, cronDayOfMonth, cronMonthOfYear, cronDayOfWeek } = formValue;
    return `${cronMinute} ${cronHour} ${cronDayOfMonth} ${cronMonthOfYear} ${cronDayOfWeek}`;
  }

  onTimeChange(event: Event): void {
    const time = (event.target as HTMLInputElement).value;
    if (time) {
      const [hours, minutes] = time.split(':');
      this.scheduleForm.patchValue({
        cronHour: parseInt(hours, 10),
        cronMinute: parseInt(minutes, 10),
      });
    }
  }
}
