// Copyright (c) 2026 Perpetuator LLC
import { Component, inject, Input, OnDestroy, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { Schedule, SchedulingService } from '../../../scheduling.service';
import { MessageService } from '../../../message.service';
import { ConfirmDeleteDialogComponent } from '../../../confirm-delete-dialog/confirm-delete-dialog.component';
import {
  FriendlyScheduleDialogComponent,
  FriendlyScheduleDialogData,
} from '../friendly-schedule-dialog/friendly-schedule-dialog.component';
import { ScheduleContext } from '../schedule.types';
import {
  cronDayToSelectedDays,
  cronToTime,
  detectDayPattern,
  formatScheduleDescription,
  getJobKindIcon,
  getJobKindLabel,
  getNextRunDisplay,
} from '../schedule.utils';
import { DAYS_OF_WEEK, DayOfWeek } from '../schedule.types';
import { ScheduleType } from '../../../scheduling.service';
import { parseScheduleArgs } from '../../../utils/schedule';

/** Pre-computed display fields attached to each schedule row. */
interface ScheduleDisplay {
  icon: string;
  jobLabel: string;
  description: string;
  nextRun: string;
  episodeInfo: { uuid: string; name: string } | null;
  podcastInfo: { uuid: string; name: string } | null;
  pulseInfo: { uuid: string; name: string } | null;
}
type ScheduleWithDisplay = Schedule & ScheduleDisplay;

@Component({
  selector: 'app-schedule-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatMenuModule,
    MatProgressBarModule,
    MatDialogModule,
  ],
  templateUrl: './schedule-list.component.html',
  styleUrls: ['./schedule-list.component.scss'],
})
export class ScheduleListComponent implements OnInit, OnDestroy {
  private readonly schedulingService = inject(SchedulingService);
  private readonly messageService = inject(MessageService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  private subscriptions = new Subscription();

  /**
   * Context for the schedule list - affects which job types are available
   */
  @Input() context: ScheduleContext = 'all';

  /**
   * Filter schedules by podcast UUID
   */
  @Input() podcastUuid?: string;

  /**
   * Podcast name for display (when pre-selected)
   */
  @Input() podcastName?: string;

  /**
   * Filter schedules by pulse config UUID
   */
  @Input() pulseConfigUuid?: string;

  /**
   * Filter schedules by episode UUID
   */
  @Input() episodeUuid?: string;

  /**
   * List of podcasts for the dropdown (when context allows selection)
   */
  @Input() podcasts: { uuid: string; name: string }[] = [];

  /**
   * List of pulse configs for the dropdown (when context allows selection)
   */
  @Input() pulseConfigs: { uuid: string; name: string }[] = [];

  /**
   * Whether to show the "Create" button
   */
  @Input() showCreateButton = true;

  /**
   * Label for empty state
   */
  @Input() emptyStateMessage = 'No schedules configured yet';

  /**
   * Emitted when schedules are loaded or changed
   */
  @Output() schedulesChanged = new EventEmitter<Schedule[]>();

  schedules: Schedule[] = [];
  /** Filtered schedules enriched with pre-computed display fields. */
  filteredSchedules: ScheduleWithDisplay[] = [];
  dataSource = new MatTableDataSource<ScheduleWithDisplay>([]);
  loading = false;

  displayedColumns: string[] = ['icon', 'name', 'description', 'nextRun', 'enabled', 'actions'];

  /**
   * Determines if user can add more schedules.
   * For episode context, only one release schedule is allowed.
   */
  get canAddSchedule(): boolean {
    if (!this.showCreateButton) return false;
    // Episode context only allows one schedule
    if (this.context === 'episode' && this.filteredSchedules.length > 0) {
      return false;
    }
    return true;
  }

  ngOnInit() {
    this.loadSchedules();
  }

  loadSchedules() {
    this.loading = true;

    // Build filter for client-side filtering
    const filters: { podcastUuid?: string; pulseConfigUuid?: string; episodeUuid?: string } = {};
    if (this.podcastUuid) filters.podcastUuid = this.podcastUuid;
    if (this.pulseConfigUuid) filters.pulseConfigUuid = this.pulseConfigUuid;
    if (this.episodeUuid) filters.episodeUuid = this.episodeUuid;

    this.subscriptions.add(
      this.schedulingService.getSchedules(Object.keys(filters).length > 0 ? filters : undefined).subscribe({
        next: ({ schedules }) => {
          this.schedules = schedules;
          this.applyFilter();
          this.loading = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load schedules: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  private enrichSchedule(s: Schedule): ScheduleWithDisplay {
    return {
      ...s,
      icon: this.getJobIcon(s),
      jobLabel: this.getJobLabel(s),
      description: this.getScheduleDescription(s),
      nextRun: this.getNextRun(s),
      episodeInfo: this.getEpisodeInfo(s),
      podcastInfo: this.getPodcastInfo(s),
      pulseInfo: this.getPulseInfo(s),
    };
  }

  private applyFilter() {
    const filtered = this.schedules.filter((schedule) => {
      const args = parseScheduleArgs(schedule.args);

      // Filter by podcast
      if (this.podcastUuid) {
        return args['podcastUuid'] === this.podcastUuid;
      }

      // Filter by pulse config
      if (this.pulseConfigUuid) {
        return args['pulseConfigUuid'] === this.pulseConfigUuid;
      }

      // Filter by episode
      if (this.episodeUuid) {
        return args['episodeUuid'] === this.episodeUuid;
      }

      // Filter by context
      if (this.context === 'podcast') {
        return !!args['podcastUuid'];
      }
      if (this.context === 'pulse') {
        return !!args['pulseConfigUuid'];
      }
      if (this.context === 'episode') {
        return !!args['episodeUuid'];
      }

      // 'all' context shows everything
      return true;
    });

    this.filteredSchedules = filtered.map((s) => this.enrichSchedule(s));
    this.dataSource.data = this.filteredSchedules;
    this.schedulesChanged.emit(filtered);
  }

  getScheduleDescription(schedule: Schedule): string {
    return formatScheduleDescription(schedule);
  }

  getJobIcon(schedule: Schedule): string {
    return getJobKindIcon(schedule.jobKind);
  }

  getJobLabel(schedule: Schedule): string {
    return getJobKindLabel(schedule.jobKind);
  }

  getNextRun(schedule: Schedule): string {
    return getNextRunDisplay(schedule);
  }

  /**
   * Get episode info from schedule args for display
   */
  getEpisodeInfo(schedule: Schedule): { uuid: string; name: string } | null {
    const args = parseScheduleArgs(schedule.args);
    const episodeUuid = args['episodeUuid'] as string | undefined;

    if (!episodeUuid) {
      return null;
    }

    // Try to get episode name from args, or use a fallback
    const episodeName = (args['episodeName'] as string) || 'Episode';
    return { uuid: episodeUuid, name: episodeName };
  }

  /**
   * Get podcast info from schedule args for display
   */
  getPodcastInfo(schedule: Schedule): { uuid: string; name: string } | null {
    const args = parseScheduleArgs(schedule.args);
    const podcastUuid = args['podcastUuid'] as string | undefined;

    if (!podcastUuid) {
      return null;
    }

    // Try to find podcast name from our podcasts list, or use fallback
    const podcast = this.podcasts?.find((p) => p.uuid === podcastUuid);
    return { uuid: podcastUuid, name: podcast?.name || 'Podcast' };
  }

  /**
   * Get pulse info from schedule args for display
   */
  getPulseInfo(schedule: Schedule): { uuid: string; name: string } | null {
    const args = parseScheduleArgs(schedule.args);
    const pulseUuid = args['pulseConfigUuid'] as string | undefined;

    if (!pulseUuid) {
      return null;
    }

    // Try to find pulse name from our pulseConfigs list, or use fallback
    const pulse = this.pulseConfigs?.find((p) => p.uuid === pulseUuid);
    return { uuid: pulseUuid, name: pulse?.name || 'Pulse' };
  }

  /**
   * Navigate to episode detail page
   */
  navigateToEpisode(event: Event, episodeUuid: string) {
    event.stopPropagation();
    this.router.navigate(['/media/episodes', episodeUuid]);
  }

  /**
   * Navigate to podcast detail page
   */
  navigateToPodcast(event: Event, podcastUuid: string) {
    event.stopPropagation();
    this.router.navigate(['/media/podcasts', podcastUuid]);
  }

  /**
   * Navigate to pulse detail page
   */
  navigateToPulse(event: Event, pulseUuid: string) {
    event.stopPropagation();
    this.router.navigate(['/media/pulses', pulseUuid]);
  }

  toggleSchedule(schedule: Schedule, enabled: boolean) {
    this.subscriptions.add(
      this.schedulingService.updateSchedule(schedule.uuid, { enabled }).subscribe({
        next: () => {
          this.messageService.success(`Schedule ${enabled ? 'enabled' : 'paused'}`);
          // Update local state — re-enrich the row so display fields stay in sync.
          const index = this.filteredSchedules.findIndex((s) => s.uuid === schedule.uuid);
          if (index !== -1) {
            const updated = { ...this.filteredSchedules[index], enabled };
            this.filteredSchedules[index] = this.enrichSchedule(updated);
            this.dataSource.data = [...this.filteredSchedules];
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to update schedule: ${err.message}`);
        },
      }),
    );
  }

  createSchedule() {
    this.openScheduleDialog();
  }

  editSchedule(schedule: Schedule) {
    this.openScheduleDialog(schedule);
  }

  deleteSchedule(schedule: Schedule) {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Delete Schedule',
        message: `Are you sure you want to delete "${schedule.name}"? This action cannot be undone.`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.subscriptions.add(
          this.schedulingService.deleteSchedule(schedule.uuid).subscribe({
            next: () => {
              this.messageService.success('Schedule deleted');
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

  private openScheduleDialog(schedule?: Schedule) {
    // Resolve podcast name from input or podcasts array
    const podcastName = this.podcastName || this.podcasts?.find((p) => p.uuid === this.podcastUuid)?.name;

    const data: FriendlyScheduleDialogData = {
      schedule: schedule || null,
      context: this.context,
      podcastUuid: this.podcastUuid,
      podcastName,
      pulseConfigUuid: this.pulseConfigUuid,
      episodeUuid: this.episodeUuid,
      podcasts: this.podcasts,
      pulseConfigs: this.pulseConfigs,
    };

    const dialogRef = this.dialog.open(FriendlyScheduleDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      disableClose: true,
      data,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.schedule) {
        this.loadSchedules();
      }
    });
  }

  readonly daysOfWeek = DAYS_OF_WEEK;

  isCrontabSchedule(schedule: Schedule): boolean {
    return schedule.scheduleType === ScheduleType.CRONTAB;
  }

  getScheduleDays(schedule: Schedule): DayOfWeek[] {
    return cronDayToSelectedDays(schedule.cronDayOfWeek || '*');
  }

  isDayActive(schedule: Schedule, dayValue: number): boolean {
    return this.getScheduleDays(schedule).includes(dayValue as DayOfWeek);
  }

  getScheduleTime(schedule: Schedule): string {
    const time = cronToTime(schedule.cronHour || '9', schedule.cronMinute || '0');
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  }

  getDayPatternLabel(schedule: Schedule): string {
    const days = this.getScheduleDays(schedule);
    const pattern = detectDayPattern(days);
    switch (pattern) {
      case 'daily':
        return 'Daily';
      case 'weekdays':
        return 'Weekdays';
      case 'weekends':
        return 'Weekends';
      default:
        return days.map((d) => DAYS_OF_WEEK[d].short).join(', ');
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
