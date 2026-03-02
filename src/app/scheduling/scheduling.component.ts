// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { SchedulingService, Schedule, ScheduleType, SolarEvent } from '../scheduling.service';
import { MessageService } from '../message.service';
import { ToolbarService } from '../layout/toolbar.service';
import { PodcastsService, PodcastsResult } from '../podcast/podcasts.service';
import { PulsesService } from '../pulses/pulses.service';
import { PulseConfig } from '../pulses/pulses.types';
import { EpisodeService, Episode } from '../episode/episode.service';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';
import {
  FriendlyScheduleDialogComponent,
  FriendlyScheduleDialogData,
} from '../shared/scheduling/friendly-schedule-dialog/friendly-schedule-dialog.component';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { parseScheduleArgs } from '../utils/schedule';
import { CommonModule } from '@angular/common';
import { formatScheduleDescription, getJobKindLabel } from '../shared/scheduling/schedule.utils';

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
    MatButton,
    MatIconButton,
    MatIcon,
    MatSlideToggle,
    MatProgressBar,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatDialogModule,
  ],
  templateUrl: './scheduling.component.html',
  styleUrl: './scheduling.component.scss',
})
export class SchedulingComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  private readonly schedulingService = inject(SchedulingService);
  private readonly messageService = inject(MessageService);
  private readonly toolbarService = inject(ToolbarService);
  private readonly podcastsService = inject(PodcastsService);
  private readonly pulsesService = inject(PulsesService);
  private readonly episodeService = inject(EpisodeService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  schedules: Schedule[] = [];
  podcasts: PodcastsResult[] = [];
  pulseConfigs: PulseConfig[] = [];
  episodes: Episode[] = [];
  dataSource = new MatTableDataSource<Schedule>(this.schedules);
  displayedColumns: string[] = ['name', 'jobKind', 'scheduleType', 'resource', 'enabled', 'actions'];
  loading = false;
  loadingPodcasts = false;
  loadingPulseConfigs = false;
  loadingEpisodes = false;

  // Job kinds that can be scheduled - used by the friendly dialog
  schedulableJobKinds = [
    'PUBLISH_LATEST_EPISODE_CHAIN',
    'PUBLISH_RESEARCH_TOPIC_EPISODE_CHAIN',
    'PUBLISH_PULSE_CHAIN',
    'PUBLISH_EPISODE_AUDIO',
  ];

  scheduleTypes = Object.values(ScheduleType);
  solarEvents = Object.values(SolarEvent);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor() {
    if (window.location.hostname === 'localhost') {
      this.schedulableJobKinds.push('TEST_PRINT', 'TEST_RAISE');
    }
  }

  ngOnInit(): void {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);

    this.loadSchedules();
    this.loadPodcasts();
    this.loadPulseConfigs();
    this.loadEpisodes();
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

  loadPulseConfigs() {
    this.loadingPulseConfigs = true;
    this.subscriptions.add(
      this.pulsesService.getPulseConfigs().subscribe({
        next: (response) => {
          this.pulseConfigs = response.pulseConfigs;
          this.loadingPulseConfigs = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load pulse configs: ${err.message}`);
          this.loadingPulseConfigs = false;
        },
      }),
    );
  }

  loadEpisodes() {
    this.loadingEpisodes = true;
    this.subscriptions.add(
      // Load unpublished episodes (isLive: false), sorted by date descending
      this.episodeService.getEpisodes(50, null, 'date', 'DESC', null, null, false).subscribe({
        next: ({ episodes }) => {
          this.episodes = episodes;
          this.loadingEpisodes = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load episodes: ${err.message}`);
          this.loadingEpisodes = false;
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
      const podcasts: { uuid: string; name: string }[] = this.podcasts.map((p) => ({
        uuid: p.uuid,
        name: p.name ?? 'Unnamed Podcast',
      }));

      const pulseConfigs: { uuid: string; name: string }[] = this.pulseConfigs.map((p) => ({
        uuid: p.uuid,
        name: p.name,
      }));

      const episodes: { uuid: string; name: string; podcastName?: string }[] = this.episodes.map((e) => ({
        uuid: e.uuid,
        name: e.title || 'Untitled Episode',
        podcastName: e.podcast?.name,
      }));

      const data: FriendlyScheduleDialogData = {
        schedule: schedule || null,
        context: 'all',
        podcasts,
        pulseConfigs,
        episodes,
      };

      const dialogRef = this.dialog.open(FriendlyScheduleDialogComponent, {
        width: '560px',
        maxWidth: '95vw',
        disableClose: true,
        data,
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
    const podcastUuid = parsedArgs['podcastUuid'];

    if (!podcastUuid) return 'N/A';

    const podcast = this.podcasts.find((p) => p.uuid === podcastUuid);
    return podcast?.name || 'Unknown Podcast';
  }

  getScheduleDescription(schedule: Schedule): string {
    return formatScheduleDescription(schedule);
  }

  formatJobKind(jobKind: string): string {
    return getJobKindLabel(jobKind);
  }

  /**
   * Get resource info for a schedule (podcast, pulse, or episode)
   * Returns an object with type, name, uuid, and icon for chip display
   */
  getResourceInfo(
    schedule: Schedule,
  ): { type: 'podcast' | 'pulse' | 'episode' | null; name: string; uuid: string; icon: string } | null {
    const parsedArgs = parseScheduleArgs(schedule.args);

    // Check for episode
    const episodeUuid = parsedArgs['episodeUuid'] as string | undefined;
    if (episodeUuid) {
      const episodeName = (parsedArgs['episodeName'] as string) || 'Unknown Episode';
      const episode = this.episodes.find((e) => e.uuid === episodeUuid);
      return {
        type: 'episode',
        name: episode?.title || episodeName,
        uuid: episodeUuid,
        icon: 'podcasts',
      };
    }

    // Check for pulse
    const pulseConfigUuid = parsedArgs['pulseConfigUuid'] as string | undefined;
    if (pulseConfigUuid) {
      const pulse = this.pulseConfigs.find((p) => p.uuid === pulseConfigUuid);
      return {
        type: 'pulse',
        name: pulse?.name || 'Unknown Pulse',
        uuid: pulseConfigUuid,
        icon: 'graphic_eq',
      };
    }

    // Check for podcast
    const podcastUuid = parsedArgs['podcastUuid'] as string | undefined;
    if (podcastUuid) {
      const podcast = this.podcasts.find((p) => p.uuid === podcastUuid);
      return {
        type: 'podcast',
        name: podcast?.name || 'Unknown Podcast',
        uuid: podcastUuid,
        icon: 'mic',
      };
    }

    return null;
  }

  /**
   * Navigate to the resource detail page
   */
  navigateToResource(event: Event, resourceInfo: { type: 'podcast' | 'pulse' | 'episode' | null; uuid: string }): void {
    event.stopPropagation();
    if (!resourceInfo?.type) return;

    switch (resourceInfo.type) {
      case 'podcast':
        this.router.navigate(['/media/podcasts', resourceInfo.uuid]);
        break;
      case 'pulse':
        this.router.navigate(['/pulses', resourceInfo.uuid]);
        break;
      case 'episode':
        this.router.navigate(['/media/episodes', resourceInfo.uuid]);
        break;
    }
  }
}
