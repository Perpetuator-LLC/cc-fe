// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Job,
  JobKind,
  JobService,
  JobStatus,
  JobResult, // Add this import
  kindToString,
  statusToString,
  stringToJobKind,
  stringToJobStatus,
} from '../job.service';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToolbarService } from '../toolbar.service';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MessageService } from '../message.service';
import { MessageComponent } from '../message/message.component';
import { RouterLink } from '@angular/router';
import { PodcastsService, PodcastsResult } from '../podcasts.service';
import { EpisodeService } from '../episode.service';
import { JobDisplayService } from '../job-display.service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

interface EnrichedJob extends Job {
  podcastName?: string;
  episodeName?: string;
}

interface Episode {
  uuid: string;
  title?: string;
}

@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [
    MatTooltipModule,
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    DatePipe,
    MatIcon,
    MatIconButton,
    MatButton,
    MessageComponent,
    DecimalPipe,
    NgClass,
    RouterLink,
    MatSelectModule,
    MatFormFieldModule,
  ],
  templateUrl: './jobs-list.component.html',
  styleUrl: './jobs-list.component.scss',
})
export class JobsListComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  jobs: EnrichedJob[] = [];
  dataSource = new MatTableDataSource<EnrichedJob>(this.jobs);
  displayedColumns: string[] = ['kind', 'message', 'cost', 'createdAt', 'updatedAt', 'status'];
  totalJobs = 0;
  pageSize = 10;
  cursors: (string | null)[] = [null];
  sortDirection = 'DESC';
  sortActive = 'createdAt';
  hasNextPage = false;
  currentCursor: string | null = null;
  isLoadingMore = false;

  // New status filter property
  statusFilter: string | null = null;

  // Available status options for the dropdown
  statusOptions = [
    { value: null, label: 'All Statuses' },
    { value: JobStatus.PENDING, label: 'Pending' },
    { value: JobStatus.RUNNING, label: 'Running' },
    { value: JobStatus.COMPLETED, label: 'Completed' },
    { value: JobStatus.FAILED, label: 'Failed' },
  ];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private jobService: JobService,
    private toolbarService: ToolbarService,
    private messageService: MessageService,
    private podcastsService: PodcastsService,
    private episodeService: EpisodeService,
    private jobDisplayService: JobDisplayService,
  ) {}

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loadJobs();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadJobs(after: string | null = null, pageIndex = 0, append = false) {
    if (append) {
      this.isLoadingMore = true;
    }

    // Build statuses array based on filter
    const statuses = this.statusFilter ? [this.statusFilter] : [];

    this.subscriptions.add(
      this.jobService.getJobs(statuses, [], [], this.pageSize, after, this.sortActive, this.sortDirection).subscribe({
        next: ({ jobs, pageInfo }) => {
          this.enrichJobsWithNames(jobs)
            .then((enrichedJobs) => {
              if (append) {
                this.jobs = [...this.jobs, ...enrichedJobs];
              } else {
                this.jobs = enrichedJobs;
              }
              this.dataSource.data = this.jobs;
              this.hasNextPage = pageInfo.hasNextPage || false;
              this.currentCursor = pageInfo.endCursor ?? null;
              this.cursors[pageIndex + 1] = pageInfo.endCursor ?? null;
              this.totalJobs = pageInfo.hasNextPage ? (pageIndex + 2) * this.pageSize : (pageIndex + 1) * this.pageSize;
              this.isLoadingMore = false;
            })
            .catch((error) => {
              this.messageService.error('Failed to enrich jobs with names: ' + error.toString());
              // Still show jobs even if enrichment fails
              const jobsToAdd = jobs.map((job) => ({ ...job }));
              if (append) {
                this.jobs = [...this.jobs, ...jobsToAdd];
              } else {
                this.jobs = jobsToAdd;
              }
              this.dataSource.data = this.jobs;
              this.hasNextPage = pageInfo.hasNextPage || false;
              this.currentCursor = pageInfo.endCursor ?? null;
              this.cursors[pageIndex + 1] = pageInfo.endCursor ?? null;
              this.totalJobs = pageInfo.hasNextPage ? (pageIndex + 2) * this.pageSize : (pageIndex + 1) * this.pageSize;
              this.isLoadingMore = false;
            });
        },
        error: (error) => {
          this.messageService.error('Failed to load jobs: ' + error.toString());
          this.isLoadingMore = false;
        },
      }),
    );
  }

  // Enrich jobs with podcast and episode names using GraphQL queries
  private async enrichJobsWithNames(jobs: Job[]): Promise<EnrichedJob[]> {
    // Extract unique UUIDs from all jobs
    const podcastUuids = new Set<string>();
    const episodeUuids = new Set<string>();

    jobs.forEach((job) => {
      const result = this.parseJobResult(job);
      if (result?.podcast_uuid) {
        podcastUuids.add(result.podcast_uuid);
      }
      if (result?.episode_uuid) {
        episodeUuids.add(result.episode_uuid);
      }
    });

    // Create observables for fetching data
    const queries = [];

    if (podcastUuids.size > 0) {
      queries.push(this.fetchPodcastNames(Array.from(podcastUuids)));
    }

    if (episodeUuids.size > 0) {
      queries.push(this.fetchEpisodeNames(Array.from(episodeUuids)));
    }

    // If no UUIDs to fetch, return jobs as-is
    if (queries.length === 0) {
      return jobs.map((job) => ({ ...job }));
    }

    try {
      const results = await forkJoin(queries).toPromise();

      // Create lookup maps
      const podcastNameMap = new Map<string, string>();
      const episodeNameMap = new Map<string, string>();

      if (results) {
        results.forEach((result: { podcasts?: PodcastsResult[]; episodes?: Episode[] }) => {
          if (result.podcasts) {
            result.podcasts.forEach((podcast: PodcastsResult) => {
              podcastNameMap.set(podcast.uuid, podcast.name || 'Unnamed Podcast');
            });
          }
          if (result.episodes) {
            result.episodes.forEach((episode: Episode) => {
              episodeNameMap.set(episode.uuid, episode.title || 'Untitled Episode');
            });
          }
        });
      }

      // Enrich jobs with the fetched names
      return jobs.map((job) => {
        const enrichedJob: EnrichedJob = { ...job };
        const result = this.parseJobResult(job);

        if (result?.podcast_uuid && podcastNameMap.has(result.podcast_uuid)) {
          enrichedJob.podcastName = podcastNameMap.get(result.podcast_uuid);
        }

        if (result?.episode_uuid && episodeNameMap.has(result.episode_uuid)) {
          enrichedJob.episodeName = episodeNameMap.get(result.episode_uuid);
        }

        return enrichedJob;
      });
    } catch (error) {
      console.warn('Failed to fetch podcast/episode names:', error);
      return jobs.map((job) => ({ ...job }));
    }
  }

  // Fetch multiple podcast names efficiently
  private fetchPodcastNames(uuids: string[]) {
    // Use the existing getPodcasts method with multiple queries or create a batch query
    const queries = uuids.map((uuid) =>
      this.podcastsService
        .getPodcastById(uuid)
        .pipe
        // Handle individual errors gracefully
        // catchError(() => of({ uuid, name: 'Podcast' } as PodcastsResult))
        (),
    );

    return forkJoin(queries).pipe(
      // Transform to the expected format
      map((podcasts) => ({ podcasts })),
    );
  }

  // Fetch multiple episode names efficiently
  private fetchEpisodeNames(uuids: string[]) {
    const queries = uuids.map((uuid) =>
      this.episodeService
        .getEpisodeById(uuid)
        .pipe
        // Handle individual errors gracefully
        // catchError(() => of({ uuid, title: 'Episode' }))
        (),
    );

    return forkJoin(queries).pipe(
      // Transform to the expected format
      map((episodes) => ({ episodes })),
    );
  }

  deleteJob(uuid: string) {
    this.subscriptions.add(
      this.jobService.deleteJobs([uuid]).subscribe({
        next: () => {
          this.jobs = this.jobs.filter((job) => job.uuid !== uuid);
          this.messageService.success('Job deleted.');
        },
        error: (err: { message: string }) => {
          this.messageService.error(`Failed to delete job: ${err.message}`);
        },
      }),
    );
  }

  retryJob(uuid: string) {
    this.subscriptions.add(
      this.jobService.retryJobs([uuid]).subscribe({
        next: (data) => {
          console.log('retryJob success:', data);
          this.jobs = [...data.jobs, ...this.jobs.filter((job) => job.uuid !== uuid)];
          this.dataSource.data = this.jobs;
        },
        error: (err: { message: string }) => {
          console.error(`Failed to retry job: ${err.message}`);
        },
        complete: () => {
          console.debug('Job retry complete');
        },
      }),
    );
  }

  // Method to handle status filter change
  onStatusFilterChange(newStatus: string | null): void {
    this.statusFilter = newStatus;
    this.loadJobs(); // Reload jobs with new filter
  }

  // Get status label for display
  getStatusLabel(status: string): string {
    const option = this.statusOptions.find((opt) => opt.value === status);
    return option ? option.label : 'Unknown';
  }

  // Group jobs by date for timeline view - apply client-side filtering if needed
  get groupedJobs() {
    if (!this.jobs) return [];

    let filteredJobs = this.jobs;

    // Apply client-side filtering if a specific status is selected
    if (this.statusFilter) {
      filteredJobs = this.jobs.filter((job) => stringToJobStatus(job.status) === stringToJobStatus(this.statusFilter!));
    }

    const groups: { label: string; jobs: Job[] }[] = [];
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const dateLabel = (dateStr: string) => {
      const date = new Date(dateStr);
      if (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      ) {
        return (
          'Today, ' +
          date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        );
      }
      if (
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()
      ) {
        return (
          'Yesterday, ' +
          date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        );
      }
      return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };

    const jobsByDate = filteredJobs.reduce((acc: Record<string, Job[]>, job) => {
      const dateKey = job.createdAt.split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(job);
      return acc;
    }, {});

    Object.keys(jobsByDate)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .forEach((dateKey) => {
        groups.push({
          label: dateLabel(dateKey),
          jobs: jobsByDate[dateKey].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        });
      });

    return groups;
  }

  statusClass(status: string): string {
    switch (stringToJobStatus(status)) {
      case JobStatus.PENDING:
        return 'job-pending';
      case JobStatus.RUNNING:
        return 'job-running';
      case JobStatus.COMPLETED:
        return 'job-success';
      case JobStatus.FAILED:
        return 'job-failed';
      default:
        return '';
    }
  }

  iconForJob(kind: string): string {
    switch (stringToJobKind(kind)) {
      case JobKind.FETCH_NEWS:
        return 'cloud_download';
      case JobKind.EXTRACT_NEWS:
        return 'auto_fix_high';
      case JobKind.SUMMARIZE_NEWS:
        return 'summarize';
      case JobKind.CREATE_EPISODE:
        return 'mic';
      case JobKind.SELECT_UNUSED_NEWS:
        return 'check_circle';
      case JobKind.UPDATE_EPISODE_AUDIO:
        return 'audiotrack';
      case JobKind.PUBLISH_EPISODE_AUDIO:
        return 'cloud_upload';
      default:
        return 'work';
    }
  }

  // Parse job result JSON safely - now result is already a JSON object
  parseJobResult(job: Job): JobResult | null {
    return job.result; // No need to JSON.parse anymore since it's already an object
  }

  // Get formatted message for job display
  getJobMessage(job: Job): string {
    // Show error if failed
    if (job.error) {
      return job.error;
    }

    const result = job.result;
    if (result?.message) {
      return result.message;
    }

    // Fallback to stringified result
    return result ? JSON.stringify(result) : 'No message available';
  }

  // Check if job result has podcast UUID
  hasPodcastUuid(job: Job): boolean {
    return job.result?.podcast_uuid != null;
  }

  // Check if job result has episode UUID
  hasEpisodeUuid(job: Job): boolean {
    return job.result?.episode_uuid != null;
  }

  // Check if job result has news UUIDs (hidden for now)
  hasNewsUuids(job: Job): boolean {
    return job.result?.news_uuids != null && Array.isArray(job.result.news_uuids);
  }

  // Get podcast UUID from job result
  getPodcastUuid(job: Job): string | null {
    return job.result?.podcast_uuid || null;
  }

  // Get episode UUID from job result
  getEpisodeUuid(job: Job): string | null {
    return job.result?.episode_uuid || null;
  }

  // Get podcast name from enriched job
  getPodcastName(job: EnrichedJob): string {
    return job.podcastName || 'Podcast';
  }

  // Get episode name from enriched job
  getEpisodeName(job: EnrichedJob): string {
    return job.episodeName || 'Episode';
  }

  loadMoreJobs(): void {
    if (this.hasNextPage && this.currentCursor && !this.isLoadingMore) {
      this.loadJobs(this.currentCursor, 0, true);
    }
  }

  protected readonly kindToString = kindToString;
  protected readonly statusToString = statusToString;
  protected readonly stringToJobStatus = stringToJobStatus;
  protected readonly JobStatus = JobStatus;
}
