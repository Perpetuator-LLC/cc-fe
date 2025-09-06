// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { SchedulingService, DynamicSchedule, ScheduleType, SolarEvent } from '../scheduling.service';
import { MessageService } from '../message.service';
import { ToolbarService } from '../toolbar.service';
import { PodcastsService, PodcastsResult } from '../podcasts.service';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MessageComponent } from '../message/message.component';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';

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
    MatInput,
    MatSelect,
    MatOption,
    MatSlideToggle,
    MatProgressBar,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MessageComponent,
    SvgIconComponent,
  ],
  templateUrl: './scheduling.component.html',
  styleUrl: './scheduling.component.scss',
})
export class SchedulingComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  schedules: DynamicSchedule[] = [];
  podcasts: PodcastsResult[] = [];
  dataSource = new MatTableDataSource<DynamicSchedule>(this.schedules);
  displayedColumns: string[] = ['name', 'jobKind', 'scheduleType', 'interval', 'podcast', 'enabled', 'actions'];
  loading = false;
  loadingPodcasts = false;
  showCreateForm = false;
  editingSchedule: DynamicSchedule | null = null;

  scheduleForm: FormGroup;

  jobKinds = [
    'FETCH_NEWS',
    'CREATE_EPISODE',
    'PUBLISH_EPISODE_AUDIO',
    'PUBLISH_LATEST_EPISODE_CHAIN',
    'REFRESH_STOCK_LISTINGS',
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
      // Crontab fields
      cronHour: [''],
      cronMinute: [''],
      cronDayOfWeek: [''],
      // Clocked fields
      clockedTime: [''],
      // Solar fields
      solarEvent: [SolarEvent.SUNRISE],
      solarLatitude: [40.7128],
      solarLongitude: [-74.006],
    });
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
      this.schedulingService.getDynamicSchedules().subscribe({
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
    const scheduleData: Partial<DynamicSchedule> = {
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
      this.schedulingService.createDynamicSchedule(scheduleData).subscribe({
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

  editSchedule(schedule: DynamicSchedule) {
    this.editingSchedule = schedule;
    this.showCreateForm = true;

    // Parse args to get podcast UUID
    const podcastUuid =
      schedule.args && typeof schedule.args === 'object'
        ? (schedule.args as Record<string, string>)['podcast_uuid']
        : '';

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
    const scheduleData: Partial<DynamicSchedule> = {
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
      this.schedulingService.updateDynamicSchedule(this.editingSchedule.uuid, scheduleData).subscribe({
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

  deleteSchedule(schedule: DynamicSchedule) {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Delete Schedule',
        message: `Are you sure you want to delete the schedule "${schedule.name}"? This action cannot be undone.`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.subscriptions.add(
          this.schedulingService.deleteDynamicSchedule(schedule.uuid).subscribe({
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

  toggleSchedule(schedule: DynamicSchedule, enabled: boolean) {
    this.subscriptions.add(
      this.schedulingService.updateDynamicSchedule(schedule.uuid, { enabled }).subscribe({
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

  getPodcastName(schedule: DynamicSchedule): string {
    if (!schedule.args || typeof schedule.args !== 'object') return 'N/A';

    const podcastUuid = (schedule.args as Record<string, string>)['podcast_uuid'];
    if (!podcastUuid) return 'N/A';

    const podcast = this.podcasts.find((p) => p.uuid === podcastUuid);
    return podcast?.name || 'Unknown Podcast';
  }

  getScheduleDescription(schedule: DynamicSchedule): string {
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
}
