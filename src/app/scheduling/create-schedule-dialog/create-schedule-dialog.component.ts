// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatFormField, MatLabel, MatHint, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCard, MatCardContent } from '@angular/material/card';
import { Subscription } from 'rxjs';
import { SchedulingService, Schedule, ScheduleType, SolarEvent } from '../../scheduling.service';
import { MessageService } from '../../message.service';
import { PodcastsResult } from '../../podcast/podcasts.service';
import { parseScheduleArgs } from '../../utils/schedule';

export interface CreateScheduleDialogData {
  schedule?: Schedule | null;
  podcasts: PodcastsResult[];
  schedulableJobKinds: string[];
  scheduleTypes: ScheduleType[];
  solarEvents: SolarEvent[];
}

@Component({
  selector: 'app-create-schedule-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButton,
    MatButtonModule,
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatInput,
    MatSelect,
    MatOption,
    MatSlideToggle,
    MatIcon,
    MatTooltip,
    MatCard,
    MatCardContent,
  ],
  templateUrl: './create-schedule-dialog.component.html',
  styleUrls: ['./create-schedule-dialog.component.scss'],
})
export class CreateScheduleDialogComponent implements OnDestroy {
  scheduleForm: FormGroup;
  private subscriptions = new Subscription();
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

  get isEditing(): boolean {
    return !!this.data.schedule;
  }

  get formTitle(): string {
    return this.isEditing ? 'Edit Schedule' : 'Create New Schedule';
  }

  get submitButtonText(): string {
    return this.isEditing ? 'Update Schedule' : 'Create Schedule';
  }

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private schedulingService: SchedulingService,
    public dialogRef: MatDialogRef<CreateScheduleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateScheduleDialogData,
  ) {
    this.scheduleForm = this.fb.group({
      name: ['', Validators.required],
      jobKind: ['', Validators.required],
      scheduleType: [ScheduleType.INTERVAL, Validators.required],
      podcastUuid: [''],
      enabled: [true],
      interval: [3600],
      localTime: ['09:00'],
      cronHour: ['9'],
      cronMinute: ['0'],
      cronDayOfWeek: ['*'],
      cronDayOfMonth: ['*'],
      cronMonthOfYear: ['*'],
      clockedTime: [''],
      solarEvent: [SolarEvent.SUNRISE],
      solarLatitude: [40.7128],
      solarLongitude: [-74.006],
    });

    if (this.data.schedule) {
      this.loadScheduleData(this.data.schedule);
    }
  }

  private loadScheduleData(schedule: Schedule) {
    const parsedArgs = parseScheduleArgs(schedule.args);
    const podcastUuid = parsedArgs['podcastUuid'] || '';

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

  onScheduleTypeChange() {
    const scheduleType = this.scheduleForm.get('scheduleType')?.value;

    this.scheduleForm.patchValue({
      interval: scheduleType === ScheduleType.INTERVAL ? 3600 : null,
      cronHour: scheduleType === ScheduleType.CRONTAB ? '9' : '',
      cronMinute: scheduleType === ScheduleType.CRONTAB ? '0' : '',
      cronDayOfWeek: scheduleType === ScheduleType.CRONTAB ? '1-5' : '',
      cronDayOfMonth: scheduleType === ScheduleType.CRONTAB ? '*' : '',
      cronMonthOfYear: scheduleType === ScheduleType.CRONTAB ? '*' : '',
      clockedTime: scheduleType === ScheduleType.CLOCKED ? new Date().toISOString() : '',
      solarEvent: scheduleType === ScheduleType.SOLAR ? SolarEvent.SUNRISE : SolarEvent.SUNRISE,
      solarLatitude: scheduleType === ScheduleType.SOLAR ? 40.7128 : null,
      solarLongitude: scheduleType === ScheduleType.SOLAR ? -74.006 : null,
    });
  }

  onSubmit() {
    if (this.scheduleForm.invalid) {
      this.messageService.error('Please fill in all required fields');
      return;
    }

    const formValue = this.scheduleForm.value;
    const scheduleData: Partial<Schedule> = {
      name: formValue.name,
      jobKind: formValue.jobKind,
      scheduleType: formValue.scheduleType,
      enabled: formValue.enabled,
      args: formValue.podcastUuid ? { podcast_uuid: formValue.podcastUuid } : {},
    };

    switch (formValue.scheduleType) {
      case ScheduleType.INTERVAL: {
        scheduleData.interval = formValue.interval;
        break;
      }
      case ScheduleType.CRONTAB: {
        scheduleData.cronHour = formValue.cronHour;
        scheduleData.cronMinute = formValue.cronMinute;
        scheduleData.cronDayOfWeek = formValue.cronDayOfWeek;
        scheduleData.cronDayOfMonth = formValue.cronDayOfMonth;
        scheduleData.cronMonthOfYear = formValue.cronMonthOfYear;
        break;
      }
      case ScheduleType.CLOCKED: {
        scheduleData.clockedTime = formValue.clockedTime;
        break;
      }
      case ScheduleType.SOLAR: {
        scheduleData.solarEvent = formValue.solarEvent;
        scheduleData.solarLatitude = formValue.solarLatitude;
        scheduleData.solarLongitude = formValue.solarLongitude;
        break;
      }
    }

    if (this.isEditing && this.data.schedule) {
      this.subscriptions.add(
        this.schedulingService.updateSchedule(this.data.schedule.uuid, scheduleData).subscribe({
          next: (response) => {
            this.messageService.success('Schedule updated successfully');
            this.dialogRef.close({ schedule: response.schedule });
          },
          error: (err: { message: string }) => {
            this.messageService.error(`Failed to update schedule: ${err.message}`);
          },
        }),
      );
    } else {
      this.subscriptions.add(
        this.schedulingService.createSchedule(scheduleData).subscribe({
          next: (response) => {
            this.messageService.success('Schedule created successfully');
            this.dialogRef.close({ schedule: response.schedule });
          },
          error: (err: { message: string }) => {
            this.messageService.error(`Failed to create schedule: ${err.message}`);
          },
        }),
      );
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  toggleAdvancedCron() {
    this.showAdvancedCron = !this.showAdvancedCron;
  }

  getUserTimezone(): string {
    return this.userTimezone;
  }

  onLocalTimeChange() {
    const localTime = this.scheduleForm.get('localTime')?.value;
    if (!localTime) return;

    const [hours, minutes] = localTime.split(':').map(Number);
    this.scheduleForm.patchValue({
      cronHour: hours.toString(),
      cronMinute: minutes.toString(),
    });
    this.selectedPreset = '';
  }

  getUtcTimeDisplay(): string {
    const cronHour = this.scheduleForm.get('cronHour')?.value;
    const cronMinute = this.scheduleForm.get('cronMinute')?.value;

    if (!cronHour || !cronMinute) return '--:--';

    if (cronHour.includes('*') || cronMinute.includes('*')) {
      return 'Variable times';
    }

    const hour = cronHour.padStart(2, '0');
    const minute = cronMinute.padStart(2, '0');
    return `${hour}:${minute}`;
  }

  applyPreset(presetValue: string) {
    if (!presetValue) {
      this.selectedPreset = '';
      return;
    }

    this.selectedPreset = presetValue;

    switch (presetValue) {
      case 'daily_9am':
        this.scheduleForm.patchValue({
          localTime: '09:00',
          cronMinute: '0',
          cronHour: this.convertLocalToUtc(9, 0).hour.toString(),
          cronDayOfWeek: '*',
          cronDayOfMonth: '*',
          cronMonthOfYear: '*',
        });
        break;

      case 'daily_6pm':
        this.scheduleForm.patchValue({
          localTime: '18:00',
          cronMinute: '0',
          cronHour: this.convertLocalToUtc(18, 0).hour.toString(),
          cronDayOfWeek: '*',
          cronDayOfMonth: '*',
          cronMonthOfYear: '*',
        });
        break;

      case 'weekdays_9am':
        this.scheduleForm.patchValue({
          localTime: '09:00',
          cronMinute: '0',
          cronHour: this.convertLocalToUtc(9, 0).hour.toString(),
          cronDayOfWeek: '1-5',
          cronDayOfMonth: '*',
          cronMonthOfYear: '*',
        });
        break;

      case 'weekends_10am':
        this.scheduleForm.patchValue({
          localTime: '10:00',
          cronMinute: '0',
          cronHour: this.convertLocalToUtc(10, 0).hour.toString(),
          cronDayOfWeek: '0,6',
          cronDayOfMonth: '*',
          cronMonthOfYear: '*',
        });
        break;

      case 'every_2h':
        this.scheduleForm.patchValue({
          localTime: '',
          cronMinute: '0',
          cronHour: '*/2',
          cronDayOfWeek: '*',
          cronDayOfMonth: '*',
          cronMonthOfYear: '*',
        });
        break;

      case 'every_6h':
        this.scheduleForm.patchValue({
          localTime: '',
          cronMinute: '0',
          cronHour: '*/6',
          cronDayOfWeek: '*',
          cronDayOfMonth: '*',
          cronMonthOfYear: '*',
        });
        break;

      case 'every_30min':
        this.scheduleForm.patchValue({
          localTime: '',
          cronMinute: '*/30',
          cronHour: '*',
          cronDayOfWeek: '*',
          cronDayOfMonth: '*',
          cronMonthOfYear: '*',
        });
        break;

      case 'weekly_monday_9am':
        this.scheduleForm.patchValue({
          localTime: '09:00',
          cronMinute: '0',
          cronHour: this.convertLocalToUtc(9, 0).hour.toString(),
          cronDayOfWeek: '1',
          cronDayOfMonth: '*',
          cronMonthOfYear: '*',
        });
        break;

      case 'monthly_1st_9am':
        this.scheduleForm.patchValue({
          localTime: '09:00',
          cronMinute: '0',
          cronHour: this.convertLocalToUtc(9, 0).hour.toString(),
          cronDayOfWeek: '*',
          cronDayOfMonth: '1',
          cronMonthOfYear: '*',
        });
        break;
    }
  }

  private convertLocalToUtc(localHour: number, localMinute: number): { hour: number; minute: number } {
    const localDate = new Date();
    localDate.setHours(localHour, localMinute, 0, 0);
    return {
      hour: localDate.getUTCHours(),
      minute: localDate.getUTCMinutes(),
    };
  }

  getCronPreview(): string {
    const minute = this.scheduleForm.get('cronMinute')?.value || '*';
    const hour = this.scheduleForm.get('cronHour')?.value || '*';
    const dayOfWeek = this.scheduleForm.get('cronDayOfWeek')?.value || '*';
    const dayOfMonth = this.scheduleForm.get('cronDayOfMonth')?.value || '*';
    const month = this.scheduleForm.get('cronMonthOfYear')?.value || '*';

    let description = 'Runs ';

    if (minute === '*/30') {
      description += 'every 30 minutes';
    } else if (minute === '*/15') {
      description += 'every 15 minutes';
    } else if (hour === '*/2') {
      description += 'every 2 hours';
    } else if (hour === '*/6') {
      description += 'every 6 hours';
    } else {
      const timeStr = this.formatCronTime(hour, minute);
      description += `at ${timeStr}`;

      if (dayOfWeek !== '*') {
        description += ` on ${this.formatDayOfWeek(dayOfWeek)}`;
      }

      if (dayOfMonth !== '*') {
        description += ` on day ${dayOfMonth} of the month`;
      }

      if (month !== '*') {
        description += ` in ${this.formatMonth(month)}`;
      }
    }

    return description + ' (UTC time)';
  }

  getCronExpression(): string {
    const minute = this.scheduleForm.get('cronMinute')?.value || '*';
    const hour = this.scheduleForm.get('cronHour')?.value || '*';
    const dayOfMonth = this.scheduleForm.get('cronDayOfMonth')?.value || '*';
    const month = this.scheduleForm.get('cronMonthOfYear')?.value || '*';
    const dayOfWeek = this.scheduleForm.get('cronDayOfWeek')?.value || '*';

    return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
  }

  formatJobKind(jobKind: string): string {
    return jobKind.replace(/_/g, ' ');
  }

  formatSolarEvent(event: string): string {
    return event.charAt(0).toUpperCase() + event.slice(1).toLowerCase();
  }

  private formatCronTime(hour: string, minute: string): string {
    if (hour === '*' || minute === '*') return 'variable times';

    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);

    if (isNaN(h) || isNaN(m)) return 'variable times';

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private formatDayOfWeek(dayOfWeek: string): string {
    const dayMap: Record<string, string> = {
      '0': 'Sunday',
      '1': 'Monday',
      '2': 'Tuesday',
      '3': 'Wednesday',
      '4': 'Thursday',
      '5': 'Friday',
      '6': 'Saturday',
    };

    if (dayOfWeek === '*') return 'every day';
    if (dayOfWeek === '1-5') return 'weekdays';
    if (dayOfWeek === '0,6') return 'weekends';

    if (dayOfWeek.includes(',')) {
      const days = dayOfWeek
        .split(',')
        .map((d) => dayMap[d.trim()])
        .filter(Boolean);
      return days.join(', ');
    }

    if (dayOfWeek.includes('-')) {
      return `${dayOfWeek} (range)`;
    }

    return dayMap[dayOfWeek] || dayOfWeek;
  }

  private formatMonth(month: string): string {
    const monthMap: Record<string, string> = {
      '1': 'January',
      '2': 'February',
      '3': 'March',
      '4': 'April',
      '5': 'May',
      '6': 'June',
      '7': 'July',
      '8': 'August',
      '9': 'September',
      '10': 'October',
      '11': 'November',
      '12': 'December',
    };

    if (month === '*') return 'every month';

    if (month.includes(',')) {
      const months = month
        .split(',')
        .map((m) => monthMap[m.trim()])
        .filter(Boolean);
      return months.join(', ');
    }

    if (month.includes('-')) {
      const [start, end] = month.split('-');
      return `${monthMap[start]} to ${monthMap[end]}`;
    }

    return monthMap[month] || month;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
