// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { SchedulingService, Schedule, ScheduleType, SolarEvent } from '../scheduling.service';
import { MessageService } from '../message.service';
import { ToolbarService } from '../layout/toolbar.service';
import { PodcastsService, PodcastsResult } from '../podcast/podcasts.service';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';
import { CreateScheduleDialogComponent } from './create-schedule-dialog/create-schedule-dialog.component';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { parseScheduleArgs } from '../utils/schedule';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scheduling',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatButton,
    MatIconButton,
    MatIcon,
    MatSlideToggle,
    MatProgressBar,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatDialogModule,
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
    private schedulingService: SchedulingService,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private podcastsService: PodcastsService,
    private dialog: MatDialog,
  ) {
    if (window.location.hostname === 'localhost') {
      this.schedulableJobKinds.push('TEST_PRINT', 'TEST_RAISE');
    }
  }

  ngOnInit(): void {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);

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
      this.podcastsService.getPodcastsForFilter().subscribe({
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


  editSchedule(schedule: Schedule) {
    this.openScheduleDialog(schedule);
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
    this.openScheduleDialog();
  }

  private openScheduleDialog(schedule?: Schedule) {
    try {
      const dialogRef = this.dialog.open(CreateScheduleDialogComponent, {
        width: '800px',
        maxWidth: '90vw',
        disableClose: true,
        data: {
          schedule: schedule || null,
          podcasts: this.podcasts || [],
          schedulableJobKinds: this.schedulableJobKinds,
          scheduleTypes: this.scheduleTypes,
          solarEvents: this.solarEvents,
        },
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result && result.schedule) {
          this.loadSchedules();
        }
      });
    } catch (error) {
      console.error('Error opening schedule dialog:', error);
      this.messageService.error('Failed to open schedule dialog');
    }
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

  formatJobKind(jobKind: string): string {
    return jobKind.replace(/_/g, ' ');
  }

}
