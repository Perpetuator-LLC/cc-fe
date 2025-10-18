// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { SchedulingService, Schedule, ScheduleType, SolarEvent } from '../scheduling.service';
import { MessageService } from '../message.service';
import { ToolbarService } from '../toolbar.service';
import { PodcastsService, PodcastsResult } from '../podcasts.service';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { MessageComponent } from '../message/message.component';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { parseScheduleArgs } from '../utils/schedule';

@Component({
  selector: 'app-scheduling',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatButton,
    MatIconButton,
    MatIcon,
    MatFormField,
    MatLabel,
    MatHint,
    MatInput,
    MatSelect,
    MatOption,
    MatSlideToggle,
    MatProgressBar,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatTooltip,
    MessageComponent,
    SvgIconComponent,
  ],
  templateUrl: './scheduling.component.html',
  styleUrl: './scheduling.component.scss',
})
export class SchedulingComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  schedules: Schedule[] = [];
  podcasts: PodcastsResult[] = [];
  dataSource = new MatTableDataSource<Schedule>(this.schedules);
  displayedColumns: string[] = ['name', 'jobKind', 'scheduleType', 'interval', 'podcast', 'enabled', 'actions'];
  loading = false;
  loadingPodcasts = false;
  showCreateForm = false;
  editingSchedule: Schedule | null = null;

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

  scheduleForm: FormGroup = new FormGroup({});

  schedulableJobKinds = [
    // 'FETCH_NEWS',
    // 'CREATE_EPISODE',
    // 'PUBLISH_EPISODE_AUDIO',
    'PUBLISH_LATEST_EPISODE_CHAIN',
    'PUBLISH_RESEARCH_TOPIC_EPISODE_CHAIN',
    // 'REFRESH_STOCK_LISTINGS',
  ];

  scheduleTypes = Object.values(ScheduleType);
  solarEvents = Object.values(SolarEvent);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private fb: FormBuilder,
    private schedulingService: SchedulingService,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private podcastsService: PodcastsService,
    private dialog: MatDialog,
  ) {
    this.scheduleForm = this.fb.group({
      name: ['', Validators.required],
      jobKind: ['', Validators.required],
      scheduleType: [ScheduleType.INTERVAL, Validators.required],
      podcastUuid: [''],
      enabled: [true],
      // Interval fields
      interval: [3600],
      // Crontab fields - enhanced with all fields
      localTime: ['09:00'], // New field for timezone-aware time input
      cronHour: ['9'],
      cronMinute: ['0'],
      cronDayOfWeek: ['*'],
      cronDayOfMonth: ['*'], // Added missing field
      cronMonthOfYear: ['*'], // Added missing field
      // Clocked fields
      clockedTime: [''],
      // Solar fields
      solarEvent: [SolarEvent.SUNRISE],
      solarLatitude: [40.7128],
      solarLongitude: [-74.006],
    });
    if (window.location.hostname === 'localhost') {
      this.schedulableJobKinds.push('TEST_PRINT', 'TEST_RAISE');
    }
  }

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);

    this.loadSchedules();
    this.loadPodcasts();
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }

  loadSchedules() {
    this.loading = true;
    this.subscriptions.add(
      this.schedulingService.getSchedules().subscribe({
        next: ({ schedules }) => {
          this.schedules = schedules;
          this.dataSource.data = schedules;
          this.loading = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load schedules: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  loadPodcasts() {
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

  onScheduleTypeChange() {
    const scheduleType = this.scheduleForm.get('scheduleType')?.value;

    // Reset form fields based on schedule type
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

  createSchedule() {
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

    // Add schedule type specific fields
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

    this.subscriptions.add(
      this.schedulingService.createSchedule(scheduleData).subscribe({
        next: () => {
          this.messageService.success('Schedule created successfully');
          this.loadSchedules();
          this.cancelCreate();
        },
        error: (err) => {
          this.messageService.error(`Failed to create schedule: ${err.message}`);
        },
      }),
    );
  }

  editSchedule(schedule: Schedule) {
    this.editingSchedule = schedule;
    this.showCreateForm = true;

    // Parse args to get podcast UUID
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

  updateSchedule() {
    if (this.scheduleForm.invalid || !this.editingSchedule) {
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

    // Add schedule type specific fields
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

    this.subscriptions.add(
      this.schedulingService.updateSchedule(this.editingSchedule.uuid, scheduleData).subscribe({
        next: () => {
          this.messageService.success('Schedule updated successfully');
          this.loadSchedules();
          this.cancelCreate();
        },
        error: (err) => {
          this.messageService.error(`Failed to update schedule: ${err.message}`);
        },
      }),
    );
  }

  deleteSchedule(schedule: Schedule) {
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
              this.loadSchedules();
            },
            error: (err) => {
              this.messageService.error(`Failed to delete schedule: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  toggleSchedule(schedule: Schedule, enabled: boolean) {
    this.subscriptions.add(
      this.schedulingService.updateSchedule(schedule.uuid, { enabled }).subscribe({
        next: () => {
          this.messageService.success(`Schedule ${enabled ? 'enabled' : 'disabled'} successfully`);
          this.loadSchedules();
        },
        error: (err) => {
          this.messageService.error(`Failed to update schedule: ${err.message}`);
        },
      }),
    );
  }

  showCreateSchedule() {
    this.showCreateForm = true;
    this.editingSchedule = null;
    this.scheduleForm.reset({
      scheduleType: ScheduleType.INTERVAL,
      enabled: true,
      interval: 3600,
      solarEvent: SolarEvent.SUNRISE,
      solarLatitude: 40.7128,
      solarLongitude: -74.006,
    });
  }

  cancelCreate() {
    this.showCreateForm = false;
    this.editingSchedule = null;
    this.scheduleForm.reset();
  }

  getPodcastName(schedule: Schedule): string {
    const parsedArgs = parseScheduleArgs(schedule.args);
    const podcastUuid = parsedArgs['podcast_uuid'];

    if (!podcastUuid) return 'N/A';

    const podcast = this.podcasts.find((p) => p.uuid === podcastUuid);
    return podcast?.name || 'Unknown Podcast';
  }

  getScheduleDescription(schedule: Schedule): string {
    switch (schedule.scheduleType) {
      case ScheduleType.INTERVAL: {
        const hours = Math.floor((schedule.interval || 0) / 3600);
        const minutes = Math.floor(((schedule.interval || 0) % 3600) / 60);
        return hours > 0 ? `Every ${hours}h ${minutes}m` : `Every ${minutes}m`;
      }
      case ScheduleType.CRONTAB:
        return `${schedule.cronHour}:${schedule.cronMinute} on ${schedule.cronDayOfWeek}`;

      case ScheduleType.CLOCKED:
        return `Once at ${new Date(schedule.clockedTime || '').toLocaleString()}`;

      case ScheduleType.SOLAR:
        return `At ${schedule.solarEvent} (${schedule.solarLatitude}, ${schedule.solarLongitude})`;

      default:
        return 'Unknown';
    }
  }

  getFormTitle(): string {
    return this.editingSchedule ? 'Edit Schedule' : 'Create New Schedule';
  }

  getSubmitButtonText(): string {
    return this.editingSchedule ? 'Update Schedule' : 'Create Schedule';
  }

  onSubmit() {
    if (this.editingSchedule) {
      this.updateSchedule();
    } else {
      this.createSchedule();
    }
  }

  formatJobKind(jobKind: string): string {
    return jobKind.replace(/_/g, ' ');
  }

  formatSolarEvent(event: string): string {
    return event.charAt(0).toUpperCase() + event.slice(1).toLowerCase();
  }

  // Enhanced crontab methods
  toggleAdvancedCron() {
    this.showAdvancedCron = !this.showAdvancedCron;
  }

  getUserTimezone(): string {
    return this.userTimezone;
  }

  onLocalTimeChange() {
    const localTime = this.scheduleForm.get('localTime')?.value;
    if (!localTime) return;

    // Convert local time to UTC for cron fields
    const [hours, minutes] = localTime.split(':').map(Number);
    const localDate = new Date();
    localDate.setHours(hours, minutes, 0, 0);

    // const utcHours = localDate.getUTCHours();
    // const utcMinutes = localDate.getUTCMinutes();

    // Update cron fields with UTC time
    this.scheduleForm.patchValue({
      cronHour: hours.toString(),
      cronMinute: minutes.toString(),
      // cronHour: utcHours.toString(),
      // cronMinute: utcMinutes.toString(),
    });

    // Clear preset selection when manually changing time
    this.selectedPreset = '';
  }

  getUtcTimeDisplay(): string {
    const cronHour = this.scheduleForm.get('cronHour')?.value;
    const cronMinute = this.scheduleForm.get('cronMinute')?.value;

    if (!cronHour || !cronMinute) return '--:--';

    // Handle step values and wildcards
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
    // const now = new Date();
    // const currentHour = now.getHours();

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

    // Generate human-readable description
    let description = 'Runs ';

    // Handle frequency
    if (minute === '*/30') {
      description += 'every 30 minutes';
    } else if (minute === '*/15') {
      description += 'every 15 minutes';
    } else if (hour === '*/2') {
      description += 'every 2 hours';
    } else if (hour === '*/6') {
      description += 'every 6 hours';
    } else {
      // Specific time
      const timeStr = this.formatCronTime(hour, minute);
      description += `at ${timeStr}`;

      // Add day constraints
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

    // Handle comma-separated values
    if (dayOfWeek.includes(',')) {
      const days = dayOfWeek
        .split(',')
        .map((d) => dayMap[d.trim()])
        .filter(Boolean);
      return days.join(', ');
    }

    // Handle ranges
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
}
