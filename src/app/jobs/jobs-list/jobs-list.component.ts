// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, ElementRef, inject, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { forkJoin, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Job,
  JobResult,
  JobService,
  JobStatus,
  kindToString,
  statusToString,
  stringToJobStatus,
  iconForJob,
} from '../job.service';
import { JobsWebSocketService } from '../jobs-websocket.service';
import { ToolbarService } from '../../layout/toolbar.service';
import { MatIcon } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MessageService } from '../../message.service';
import { Router } from '@angular/router';
import { PodcastsResult, PodcastsService } from '../../podcast/podcasts.service';
import { EpisodeService } from '../../episode/episode.service';
import { JobDisplayService } from '../../job-display.service';
import { ResearchService, Topic } from '../../topics/research.service';
import { PulsesService } from '../../pulses/pulses.service';
import { PulseConfig } from '../../pulses/pulses.types';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LoadingService } from '../../layout/loading.service';
import { JobsListEmptyComponent } from './jobs-list-empty/jobs-list-empty.component';
import { JobsListFilterComponent } from './jobs-list-filter/jobs-list-filter.component';
import { JobsListChainComponent } from './jobs-list-chain/jobs-list-chain.component';
import { JobsListItemComponent } from './jobs-list-item/jobs-list-item.component';

/**
 * Pre-computed display state for an EnrichedJob. Built once per job in
 * `enrichJobsWithNames` so the template can read static property accesses
 * instead of calling methods on every change-detection tick.
 */
interface JobDisplay {
  iconName: string;
  statusClass: string;
  kindLabel: string;
  cleanMessage: string;
  cleanError: string;
  isFailedOrPending: boolean;
  symbolTooltip: string;
  // Resource flags + UUIDs/names (mirrors JobDisplayService getters)
  hasPodcast: boolean;
  podcastUuid: string | null;
  podcastName: string;
  hasEpisode: boolean;
  episodeUuid: string | null;
  episodeName: string;
  hasTopic: boolean;
  topicUuid: string | null;
  topicName: string;
  hasPulseConfig: boolean;
  pulseConfigUuid: string | null;
  pulseConfigName: string;
  hasBlog: boolean;
  blogUuid: string | null;
  blogName: string;
  hasArticle: boolean;
  articleUuid: string | null;
  articleTitle: string;
  hasSymbol: boolean;
  symbol: string | null;
}

interface EnrichedJob extends Job {
  podcastName?: string;
  episodeName?: string;
  topicName?: string;
  pulseConfigName?: string;
  /** Pre-computed display state. Set during enrichment. */
  display: JobDisplay;
  /** Discriminator for the timeline union (standalone job branch). */
  isChainGroup: false;
}

/** Aggregated resources from all jobs in a chain */
interface ChainResources {
  podcasts: { uuid: string; name: string }[];
  episodes: { uuid: string; name: string }[];
  topics: { uuid: string; name: string }[];
  pulseConfigs: { uuid: string; name: string }[];
  symbols: { symbol: string; job: EnrichedJob; tooltip: string }[];
}

/** Pre-computed display state for a JobChainGroup. */
interface ChainDisplay {
  title: string;
  icon: string;
  statusClass: string;
  hasResources: boolean;
}

/** Represents a group of jobs in a chain, or a single standalone job */
interface JobChainGroup {
  /** Discriminator for the timeline union (chain branch). */
  isChainGroup: true;
  chainId: string | null;
  jobs: EnrichedJob[];
  expanded: boolean;
  // Aggregated stats
  totalCost: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  status: string; // Overall status: completed, running, pending, failed
  firstJobKind: string;
  lastJobKind: string;
  createdAt: string;
  updatedAt: string;
  // Pre-computed resources
  resources: ChainResources;
  /** Pre-computed display state. */
  display: ChainDisplay;
}

/** Discriminated union used for the timeline items array. */
type TimelineItem = EnrichedJob | JobChainGroup;

interface Episode {
  uuid: string;
  title?: string;
}

@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    MatIcon,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    JobsListEmptyComponent,
    JobsListFilterComponent,
    JobsListChainComponent,
    JobsListItemComponent,
  ],
  templateUrl: './jobs-list.component.html',
  styleUrl: './jobs-list.component.scss',
})
export class JobsListComponent implements OnInit, OnDestroy {
  private readonly jobService = inject(JobService);
  private readonly jobsWebSocketService = inject(JobsWebSocketService);
  private readonly toolbarService = inject(ToolbarService);
  private readonly messageService = inject(MessageService);
  private readonly podcastsService = inject(PodcastsService);
  private readonly episodeService = inject(EpisodeService);
  private readonly jobDisplayService = inject(JobDisplayService);
  private readonly researchService = inject(ResearchService);
  private readonly pulsesService = inject(PulsesService);
  private readonly loadingService = inject(LoadingService);
  private readonly router = inject(Router);

  private subscriptions: Subscription = new Subscription();
  private intersectionObserver: IntersectionObserver | null = null;
  private _jobs: EnrichedJob[] = [];
  /**
   * Setter rebuilds `groupedJobs` so the template always renders fresh
   * pre-computed display state without needing a CD-tick recomputation.
   */
  get jobs(): EnrichedJob[] {
    return this._jobs;
  }
  set jobs(value: EnrichedJob[]) {
    this._jobs = value;
    this.rebuildGroupedJobs();
  }
  dataSource = new MatTableDataSource<EnrichedJob>([]);
  displayedColumns: string[] = ['kind', 'message', 'cost', 'createdAt', 'updatedAt', 'status'];
  totalJobs = 0;
  pageSize = 10;
  cursors: (string | null)[] = [null];
  sortDirection = 'DESC';
  sortActive = 'updatedAt';
  hasNextPage = false;
  currentCursor: string | null = null;
  isLoadingMore = false;
  isInitialLoading = true;
  loading = false;

  // New status filter property
  statusFilter: string | null = null;
  /** Pre-computed label for the current `statusFilter`. Updated whenever the filter changes. */
  statusFilterLabel = '';

  // Track which job chains are expanded
  expandedChains = new Set<string>();

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
  @ViewChild('scrollSentinel') scrollSentinel!: ElementRef<HTMLDivElement>;

  constructor() {
    // Subscribe to real-time job updates via WebSocket
    this.subscriptions.add(
      this.jobsWebSocketService.jobUpdated$.subscribe((job: Job) => {
        this.handleRealtimeJobUpdate('job.updated', job);
      }),
    );

    // Subscribe to job completed events
    this.subscriptions.add(
      this.jobsWebSocketService.jobCompleted$.subscribe((job: Job) => {
        this.handleRealtimeJobUpdate('job.completed', job);
      }),
    );

    // Subscribe to job failed events
    this.subscriptions.add(
      this.jobsWebSocketService.jobFailed$.subscribe((job: Job) => {
        this.handleRealtimeJobUpdate('job.failed', job);
      }),
    );
  }

  ngOnInit(): void {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
    this.loadJobs();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.loadingService.hide();
    this.cleanupInfiniteScroll();
  }

  /**
   * Set up IntersectionObserver for infinite scrolling
   * Called after data loads to ensure sentinel element exists
   */
  private setupInfiniteScroll(): void {
    // Clean up existing observer first
    this.cleanupInfiniteScroll();

    // Delay to ensure DOM is updated after data load
    setTimeout(() => {
      if (this.scrollSentinel?.nativeElement) {
        this.intersectionObserver = new IntersectionObserver(
          (entries) => {
            const [entry] = entries;
            if (entry.isIntersecting && this.hasNextPage && !this.isLoadingMore && !this.loading) {
              this.loadMoreJobs();
            }
          },
          {
            root: null, // Use viewport as root
            rootMargin: '200px', // Start loading 200px before reaching the sentinel
            threshold: 0,
          },
        );
        this.intersectionObserver.observe(this.scrollSentinel.nativeElement);
      }
    }, 200);
  }

  /**
   * Clean up IntersectionObserver
   */
  private cleanupInfiniteScroll(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
  }

  /**
   * Handle real-time job updates from WebSocket
   * Updates the jobs list if the job is on the current page
   */
  private handleRealtimeJobUpdate(type: string, job: Job): void {
    const existingIndex = this.jobs.findIndex((j) => j.uuid === job.uuid);

    if (existingIndex >= 0) {
      // Job exists in current view - update it
      this.enrichJobsWithNames([job])
        .then((enrichedJobs) => {
          const enrichedJob = enrichedJobs[0];
          const updatedJobs = [...this.jobs];
          updatedJobs[existingIndex] = enrichedJob;
          this.jobs = updatedJobs;
          this.dataSource.data = this.jobs;
        })
        .catch((error) => {
          console.warn('Failed to enrich updated job:', error);
          const updatedJobs = [...this.jobs];
          updatedJobs[existingIndex] = this.toEnrichedJob(job);
          this.jobs = updatedJobs;
          this.dataSource.data = this.jobs;
        });
    } else if (type === 'jobs.created' && !this.currentCursor) {
      // New job created and we're on the first page - add it to the top
      this.enrichJobsWithNames([job])
        .then((enrichedJobs) => {
          this.jobs = [enrichedJobs[0], ...this.jobs];
          this.dataSource.data = this.jobs;
          this.totalJobs++;
        })
        .catch((error) => {
          console.warn('Failed to enrich new job:', error);
          this.jobs = [this.toEnrichedJob(job), ...this.jobs];
          this.dataSource.data = this.jobs;
          this.totalJobs++;
        });
    }
  }

  loadJobs(append = false) {
    if (append) {
      this.isLoadingMore = true;
    } else {
      this.loading = true;
      this.loadingService.show();
    }

    // Build statuses array based on filter
    const statuses = this.statusFilter ? [this.statusFilter] : [];

    // For "load more", request additional items by increasing the total count
    // jobsGrouped doesn't support cursor pagination, so we increase firstTopLevel
    const requestCount = append ? this.totalJobs + this.pageSize : this.pageSize;

    this.subscriptions.add(
      this.jobService.getJobsGrouped(requestCount, statuses, []).subscribe({
        next: (jobs) => {
          this.enrichJobsWithNames(jobs)
            .then((enrichedJobs) => {
              this.jobs = enrichedJobs;
              this.dataSource.data = this.jobs;
              // Check if there might be more jobs (backend returned exactly what we asked for)
              this.hasNextPage = jobs.length >= requestCount;
              this.totalJobs = jobs.length;
              this.isLoadingMore = false;
              this.isInitialLoading = false;
              this.loading = false;
              if (!append) {
                this.loadingService.hide();
              }
              // Set up infinite scroll observer after data loads
              this.setupInfiniteScroll();
            })
            .catch((error) => {
              this.messageService.error('Failed to enrich jobs with names: ' + error.toString());
              this.jobs = jobs.map((job) => this.toEnrichedJob(job));
              this.dataSource.data = this.jobs;
              this.hasNextPage = jobs.length >= requestCount;
              this.totalJobs = jobs.length;
              this.isLoadingMore = false;
              this.isInitialLoading = false;
              this.loading = false;
              if (!append) {
                this.loadingService.hide();
              }
              // Set up infinite scroll observer after data loads
              this.setupInfiniteScroll();
            });
        },
        error: (error) => {
          this.messageService.error('Failed to load jobs: ' + error.toString());
          this.isLoadingMore = false;
          this.isInitialLoading = false;
          this.loading = false;
          if (!append) {
            this.loadingService.hide();
          }
        },
      }),
    );
  }

  // Enrich jobs with podcast and episode names using GraphQL queries
  private async enrichJobsWithNames(jobs: Job[]): Promise<EnrichedJob[]> {
    // Extract unique UUIDs from all jobs
    const podcastUuids = new Set<string>();
    const episodeUuids = new Set<string>();
    const topicUuids = new Set<string>();
    const pulseConfigUuids = new Set<string>();

    jobs.forEach((job) => {
      const podcastUuid = this.jobDisplayService.getPodcastUuid(job);
      const episodeUuid = this.jobDisplayService.getEpisodeUuid(job);
      const topicUuid = this.jobDisplayService.getTopicUuid(job);
      const pulseConfigUuid = this.getPulseConfigUuid(job);

      if (podcastUuid) {
        podcastUuids.add(podcastUuid);
      }
      if (episodeUuid) {
        episodeUuids.add(episodeUuid);
      }
      if (topicUuid) {
        topicUuids.add(topicUuid);
      }
      if (pulseConfigUuid) {
        pulseConfigUuids.add(pulseConfigUuid);
      }
    });

    // Create observables for fetching data
    interface FetchResult {
      podcasts?: PodcastsResult[];
      episodes?: Episode[];
      topics?: Topic[];
      pulseConfigs?: PulseConfig[];
    }
    const queries: Observable<FetchResult>[] = [];

    if (podcastUuids.size > 0) {
      queries.push(this.fetchPodcastNames(Array.from(podcastUuids)));
    }

    if (episodeUuids.size > 0) {
      queries.push(this.fetchEpisodeNames(Array.from(episodeUuids)));
    }

    if (topicUuids.size > 0) {
      queries.push(this.fetchTopicNames(Array.from(topicUuids)));
    }

    if (pulseConfigUuids.size > 0) {
      queries.push(this.fetchPulseConfigNames(Array.from(pulseConfigUuids)));
    }

    // If no UUIDs to fetch, return jobs with empty enrichment + computed display.
    if (queries.length === 0) {
      return jobs.map((job) => this.toEnrichedJob(job));
    }

    try {
      const results = await forkJoin(queries).toPromise();

      // Create lookup maps
      const podcastNameMap = new Map<string, string>();
      const episodeNameMap = new Map<string, string>();
      const topicNameMap = new Map<string, string>();
      const pulseConfigNameMap = new Map<string, string>();

      if (results) {
        results.forEach(
          (result: {
            podcasts?: PodcastsResult[];
            episodes?: Episode[];
            topics?: Topic[];
            pulseConfigs?: PulseConfig[];
          }) => {
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
            if (result.topics) {
              result.topics.forEach((topic: Topic) => {
                topicNameMap.set(topic.uuid, topic.title || 'Untitled Topic');
              });
            }
            if (result.pulseConfigs) {
              result.pulseConfigs.forEach((pulseConfig: PulseConfig) => {
                pulseConfigNameMap.set(pulseConfig.uuid, pulseConfig.name || 'Unnamed Pulse');
              });
            }
          },
        );
      }

      // Enrich jobs with the fetched names + pre-computed display state.
      return jobs.map((job) => {
        const podcastUuid = this.jobDisplayService.getPodcastUuid(job);
        const episodeUuid = this.jobDisplayService.getEpisodeUuid(job);
        const topicUuid = this.jobDisplayService.getTopicUuid(job);
        const pulseConfigUuid = this.jobDisplayService.getPulseConfigUuid(job);

        const extras: Partial<EnrichedJob> = {};
        if (podcastUuid && podcastNameMap.has(podcastUuid)) {
          extras.podcastName = podcastNameMap.get(podcastUuid);
        }
        if (episodeUuid && episodeNameMap.has(episodeUuid)) {
          extras.episodeName = episodeNameMap.get(episodeUuid);
        }
        if (topicUuid && topicNameMap.has(topicUuid)) {
          extras.topicName = topicNameMap.get(topicUuid);
        }
        if (pulseConfigUuid && pulseConfigNameMap.has(pulseConfigUuid)) {
          extras.pulseConfigName = pulseConfigNameMap.get(pulseConfigUuid);
        }

        return this.toEnrichedJob(job, extras);
      });
    } catch (error) {
      console.warn('Failed to fetch podcast/episode/topic/pulse names:', error);
      return jobs.map((job) => this.toEnrichedJob(job));
    }
  }

  /**
   * Build an EnrichedJob from a raw Job by attaching optional enrichment
   * fields and computing the static `display` block once. Called from
   * `enrichJobsWithNames` and the websocket update path.
   */
  private toEnrichedJob(job: Job, extras: Partial<EnrichedJob> = {}): EnrichedJob {
    return {
      ...job,
      ...extras,
      isChainGroup: false,
      display: this.buildJobDisplay(job, extras),
    };
  }

  /** Compute all derived display state for a single job. */
  private buildJobDisplay(job: Job, extras: Partial<EnrichedJob> = {}): JobDisplay {
    const jds = this.jobDisplayService;
    const jobStatus = stringToJobStatus(job.status);
    return {
      iconName: iconForJob(job.kind),
      statusClass: this.statusClassFor(job.status),
      kindLabel: kindToString(job.kind),
      cleanMessage: this.computeCleanJobMessage(job),
      cleanError: this.computeCleanErrorMessage(job.error || ''),
      isFailedOrPending: jobStatus === JobStatus.FAILED || jobStatus === JobStatus.PENDING,
      symbolTooltip: this.computeSymbolTooltip(job),
      hasPodcast: jds.hasPodcastUuid(job),
      podcastUuid: jds.getPodcastUuid(job),
      podcastName: extras.podcastName || 'Podcast',
      hasEpisode: jds.hasEpisodeUuid(job),
      episodeUuid: jds.getEpisodeUuid(job),
      episodeName: extras.episodeName || 'Episode',
      hasTopic: jds.hasTopicUuid(job),
      topicUuid: jds.getTopicUuid(job),
      topicName: extras.topicName || 'Topic',
      hasPulseConfig: jds.hasPulseConfigUuid(job),
      pulseConfigUuid: jds.getPulseConfigUuid(job),
      pulseConfigName: extras.pulseConfigName || 'Pulse',
      hasBlog: jds.hasBlogUuid(job),
      blogUuid: jds.getBlogUuid(job),
      blogName: jds.getBlogName(job) || 'Blog',
      hasArticle: jds.hasArticleUuid(job),
      articleUuid: jds.getArticleUuid(job),
      articleTitle: jds.getArticleTitle(job) || 'Article',
      hasSymbol: jds.hasSymbol(job),
      symbol: jds.getSymbol(job),
    };
  }

  private statusClassFor(status: string): string {
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

  private chainStatusClassFor(status: string): string {
    switch (status) {
      case 'completed':
        return 'job-success';
      case 'running':
        return 'job-running';
      case 'failed':
        return 'job-failed';
      default:
        return 'job-pending';
    }
  }

  /** Pure version (no service access) of getCleanErrorMessage. */
  private computeCleanErrorMessage(errorMessage: string): string {
    if (!errorMessage) return '';
    return errorMessage.replace(/^(Error:|ERROR:|error:)\s*/i, '').trim();
  }

  /** Pure version (no service access) of getCleanJobMessage. */
  private computeCleanJobMessage(job: Job): string {
    const message = this.jobDisplayService.getJobMessage(job);
    if (this.isErrorMessage(message)) {
      return this.computeCleanErrorMessage(message);
    }
    return message;
  }

  /** Pure version of getSymbolTooltip. */
  private computeSymbolTooltip(job: Job): string {
    const fqn = this.jobDisplayService.getFqn(job);
    const interval = this.jobDisplayService.getInterval(job);
    const parts: string[] = [];
    if (fqn) parts.push(`FQN: ${fqn}`);
    if (interval) parts.push(`Interval: ${interval}`);
    parts.push('Click to view chart');
    return parts.join('\n');
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

  // Fetch multiple topic names efficiently
  private fetchTopicNames(uuids: string[]) {
    const queries = uuids.map((uuid) =>
      this.researchService
        .getTopicById(uuid)
        .pipe
        // Handle individual errors gracefully
        // catchError(() => of({ uuid, title: 'Topic' }))
        (),
    );

    return forkJoin(queries).pipe(
      // Transform to the expected format
      map((topics) => ({ topics })),
    );
  }

  // Fetch multiple pulse config names efficiently
  private fetchPulseConfigNames(uuids: string[]) {
    const queries = uuids.map((uuid) =>
      this.pulsesService.getPulseConfig(uuid).pipe(
        // Handle individual errors gracefully
        map((config) => config),
      ),
    );

    return forkJoin(queries).pipe(
      // Transform to the expected format
      map((pulseConfigs) => ({ pulseConfigs })),
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
          // console.log('retryJob success:', data);
          this.jobs = [
            ...data.jobs.map((job) => this.toEnrichedJob(job)),
            ...this.jobs.filter((job) => job.uuid !== uuid),
          ];
          this.dataSource.data = this.jobs;
        },
        error: (err: { message: string }) => {
          console.error(`Failed to retry job: ${err.message}`);
        },
        // complete: () => {
        //   console.debug('Job retry complete');
        // },
      }),
    );
  }

  // Method to handle status filter change
  onStatusFilterChange(newStatus: string | null): void {
    this.statusFilter = newStatus;
    this.statusFilterLabel = this.getStatusLabel(newStatus);
    this.isInitialLoading = true; // Show loading when filter changes
    this.loadJobs(); // Reload jobs with new filter
  }

  /** Resolve a status code into its human label. Called from the filter setter, never from templates. */
  private getStatusLabel(status: string | null): string {
    const option = this.statusOptions.find((opt) => opt.value === status);
    return option ? option.label : 'Unknown';
  }

  // Toggle chain expansion
  toggleChainExpanded(chainId: string): void {
    if (this.expandedChains.has(chainId)) {
      this.expandedChains.delete(chainId);
    } else {
      this.expandedChains.add(chainId);
    }
    // Rebuild so `display.expanded` reflects the new state.
    this.rebuildGroupedJobs();
  }

  // Check if a chain is expanded
  isChainExpanded(chainId: string): boolean {
    return this.expandedChains.has(chainId);
  }

  // Create a JobChainGroup from a list of jobs with the same chainId
  private createChainGroup(chainId: string | null, jobs: EnrichedJob[]): JobChainGroup {
    // Sort jobs by chainPosition if available, otherwise by createdAt
    const sortedJobs = [...jobs].sort((a, b) => {
      if (a.chainPosition != null && b.chainPosition != null) {
        return a.chainPosition - b.chainPosition;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const totalCost = sortedJobs.reduce((sum, job) => sum + (job.cost || 0), 0);
    const completedJobs = sortedJobs.filter((j) => stringToJobStatus(j.status) === JobStatus.COMPLETED).length;
    const failedJobs = sortedJobs.filter((j) => stringToJobStatus(j.status) === JobStatus.FAILED).length;
    const runningJobs = sortedJobs.filter((j) => stringToJobStatus(j.status) === JobStatus.RUNNING).length;

    // Determine overall status
    let status = 'pending';
    if (failedJobs > 0) {
      status = 'failed';
    } else if (completedJobs === sortedJobs.length) {
      status = 'completed';
    } else if (runningJobs > 0) {
      status = 'running';
    }

    // Pre-compute resources from all jobs
    const resources = this.computeChainResources(sortedJobs);

    const firstJobKind = sortedJobs[0]?.kind || '';
    const lastJobKind = sortedJobs[sortedJobs.length - 1]?.kind || '';
    const totalJobs = sortedJobs.length;
    const display: ChainDisplay = {
      title: this.computeChainTitle(firstJobKind, lastJobKind, totalJobs),
      icon: iconForJob(firstJobKind),
      statusClass: this.chainStatusClassFor(status),
      hasResources:
        resources.podcasts.length > 0 ||
        resources.episodes.length > 0 ||
        resources.topics.length > 0 ||
        resources.pulseConfigs.length > 0 ||
        resources.symbols.length > 0,
    };

    return {
      isChainGroup: true,
      chainId,
      jobs: sortedJobs,
      expanded: chainId ? this.expandedChains.has(chainId) : true,
      totalCost,
      totalJobs,
      completedJobs,
      failedJobs,
      status,
      firstJobKind,
      lastJobKind,
      createdAt: sortedJobs[0]?.createdAt || '',
      updatedAt: sortedJobs.reduce(
        (latest, job) => (new Date(job.updatedAt) > new Date(latest) ? job.updatedAt : latest),
        sortedJobs[0]?.updatedAt || '',
      ),
      resources,
      display,
    };
  }

  /** Pure title computation extracted from getChainTitle for pre-computing. */
  private computeChainTitle(firstJobKind: string, lastJobKind: string, totalJobs: number): string {
    if (totalJobs === 1) {
      return kindToString(firstJobKind);
    }
    const firstKind = kindToString(firstJobKind);
    const lastKind = kindToString(lastJobKind);
    if (firstKind === lastKind) {
      return `${firstKind} (${totalJobs} jobs)`;
    }
    return `${firstKind} → ${lastKind}`;
  }

  // Compute aggregated resources from chain jobs
  private computeChainResources(jobs: EnrichedJob[]): ChainResources {
    const podcasts = new Map<string, string>();
    const episodes = new Map<string, string>();
    const topics = new Map<string, string>();
    const pulseConfigs = new Map<string, string>();
    const symbols = new Map<string, EnrichedJob>();

    for (const job of jobs) {
      const podcastUuid = this.getPodcastUuid(job);
      if (podcastUuid && !podcasts.has(podcastUuid)) {
        podcasts.set(podcastUuid, this.getPodcastName(job));
      }

      const episodeUuid = this.getEpisodeUuid(job);
      if (episodeUuid && !episodes.has(episodeUuid)) {
        episodes.set(episodeUuid, this.getEpisodeName(job));
      }

      const topicUuid = this.getTopicUuid(job);
      if (topicUuid && !topics.has(topicUuid)) {
        topics.set(topicUuid, this.getTopicName(job));
      }

      const pulseConfigUuid = this.getPulseConfigUuid(job);
      if (pulseConfigUuid && !pulseConfigs.has(pulseConfigUuid)) {
        pulseConfigs.set(pulseConfigUuid, this.getPulseConfigName(job));
      }

      const symbol = this.getSymbol(job);
      if (symbol && !symbols.has(symbol)) {
        symbols.set(symbol, job);
      }
    }

    return {
      podcasts: Array.from(podcasts.entries()).map(([uuid, name]) => ({ uuid, name })),
      episodes: Array.from(episodes.entries()).map(([uuid, name]) => ({ uuid, name })),
      topics: Array.from(topics.entries()).map(([uuid, name]) => ({ uuid, name })),
      pulseConfigs: Array.from(pulseConfigs.entries()).map(([uuid, name]) => ({ uuid, name })),
      symbols: Array.from(symbols.entries()).map(([symbol, job]) => ({
        symbol,
        job,
        tooltip: this.computeSymbolTooltip(job),
      })),
    };
  }

  /** Cached output of buildGroupedJobs — rebuilt only when jobs/filter/expansion changes. */
  groupedJobs: { label: string; items: TimelineItem[] }[] = [];

  /**
   * Rebuild the `groupedJobs` cache. Call this from any code path that
   * changes the inputs: data load, websocket update, filter change, or
   * chain expand/collapse.
   */
  private rebuildGroupedJobs(): void {
    this.groupedJobs = this.buildGroupedJobs();
  }

  // Group jobs by date, then by chain for timeline view
  private buildGroupedJobs(): { label: string; items: TimelineItem[] }[] {
    if (!this.jobs) return [];

    let filteredJobs = this.jobs;

    // Apply client-side filtering if a specific status is selected
    if (this.statusFilter) {
      filteredJobs = this.jobs.filter((job) => stringToJobStatus(job.status) === stringToJobStatus(this.statusFilter!));
    }

    const groups: { label: string; items: TimelineItem[] }[] = [];
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

    // Group jobs by date first
    // First, build complete chains using chainJobs field
    const processedChainIds = new Set<string>();
    const allChainJobs = new Map<string, EnrichedJob[]>();

    // Process jobs and collect complete chains from chainJobs field
    filteredJobs.forEach((job) => {
      if (job.chainId && !processedChainIds.has(job.chainId)) {
        processedChainIds.add(job.chainId);
        // Use chainJobs if available (complete chain from backend)
        if (job.chainJobs && job.chainJobs.length > 0) {
          allChainJobs.set(job.chainId, job.chainJobs as EnrichedJob[]);
        }
      }
    });

    // Group by date, using complete chains
    const jobsByDate = filteredJobs.reduce((acc: Record<string, EnrichedJob[]>, job) => {
      const updatedDate = new Date(job.updatedAt);
      const localDateStr = updatedDate.toLocaleDateString();
      if (!acc[localDateStr]) {
        acc[localDateStr] = [];
      }
      acc[localDateStr].push(job);
      return acc;
    }, {});

    // Process each date group
    Object.keys(jobsByDate)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .forEach((dateKey) => {
        const dateJobs = jobsByDate[dateKey];

        // Group jobs by chainId within this date
        const chainGroups = new Map<string, EnrichedJob[]>();
        const standaloneJobs: EnrichedJob[] = [];
        const seenChainIds = new Set<string>();

        dateJobs.forEach((job) => {
          if (job.chainId) {
            // Only process each chain once per date
            if (!seenChainIds.has(job.chainId)) {
              seenChainIds.add(job.chainId);
              // Use complete chain from chainJobs if available
              const completeChain = allChainJobs.get(job.chainId);
              if (completeChain && completeChain.length > 0) {
                chainGroups.set(job.chainId, completeChain);
              } else {
                // Fallback: collect jobs with this chainId from the current date
                const chainJobsInDate = dateJobs.filter((j) => j.chainId === job.chainId);
                chainGroups.set(job.chainId, chainJobsInDate);
              }
            }
          } else {
            standaloneJobs.push(job);
          }
        });

        // Create items array with chain groups and standalone jobs
        const items: TimelineItem[] = [];

        // Add chain groups
        chainGroups.forEach((jobs, chainId) => {
          items.push(this.createChainGroup(chainId, jobs));
        });

        // Add standalone jobs
        standaloneJobs.forEach((job) => {
          items.push(job);
        });

        // Sort items by updatedAt (most recent first)
        items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        groups.push({
          label: dateLabel(dateKey),
          items,
        });
      });

    return groups;
  }

  // Type guard to check if an item is a JobChainGroup
  isChainGroup(item: JobChainGroup | EnrichedJob): item is JobChainGroup {
    return 'chainId' in item && 'totalJobs' in item && 'jobs' in item;
  }

  // Get chain status class
  chainStatusClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'job-success';
      case 'running':
        return 'job-running';
      case 'failed':
        return 'job-failed';
      default:
        return 'job-pending';
    }
  }

  // Get chain progress percentage
  getChainProgress(chain: JobChainGroup): number {
    if (chain.totalJobs === 0) return 0;
    return (chain.completedJobs / chain.totalJobs) * 100;
  }

  // Get chain display title
  getChainTitle(chain: JobChainGroup): string {
    if (chain.totalJobs === 1) {
      return kindToString(chain.firstJobKind);
    }
    // Show first and last job kind for multi-job chains
    const firstKind = kindToString(chain.firstJobKind);
    const lastKind = kindToString(chain.lastJobKind);
    if (firstKind === lastKind) {
      return `${firstKind} (${chain.totalJobs} jobs)`;
    }
    return `${firstKind} → ${lastKind}`;
  }

  // Get chain icon (use the first job's icon)
  getChainIcon(chain: JobChainGroup): string {
    return iconForJob(chain.firstJobKind);
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

  // Use the iconForJob function from job.service
  iconForJob = iconForJob;

  // Delegate to JobDisplayService for consistent parsing
  parseJobResult(job: Job): JobResult | null {
    return this.jobDisplayService.parseJobResult(job);
  }

  // Get formatted message for job display
  getJobMessage(job: Job): string {
    return this.jobDisplayService.getJobMessage(job);
  }

  // Check if job has podcast UUID (from args or result)
  hasPodcastUuid(job: Job): boolean {
    return this.jobDisplayService.hasPodcastUuid(job);
  }

  // Check if job has episode UUID (from args or result)
  hasEpisodeUuid(job: Job): boolean {
    return this.jobDisplayService.hasEpisodeUuid(job);
  }

  // Check if job has topic UUID (from args or result)
  hasTopicUuid(job: Job): boolean {
    return this.jobDisplayService.hasTopicUuid(job);
  }

  // Check if job has pulse UUID (from args or result)
  hasPulseUuid(job: Job): boolean {
    return this.jobDisplayService.hasPulseUuid(job);
  }

  // Check if job has pulse config UUID (from args or result)
  hasPulseConfigUuid(job: Job): boolean {
    return this.jobDisplayService.hasPulseConfigUuid(job);
  }

  // Check if job has blog UUID (from args or result)
  hasBlogUuid(job: Job): boolean {
    return this.jobDisplayService.hasBlogUuid(job);
  }

  // Check if job has article UUID (from args or result)
  hasArticleUuid(job: Job): boolean {
    return this.jobDisplayService.hasArticleUuid(job);
  }

  // Check if job result has news UUIDs
  hasNewsUuids(job: Job): boolean {
    return this.jobDisplayService.hasNewsUuids(job);
  }

  // Get podcast UUID from merged data
  getPodcastUuid(job: Job): string | null {
    return this.jobDisplayService.getPodcastUuid(job);
  }

  // Get episode UUID from merged data
  getEpisodeUuid(job: Job): string | null {
    return this.jobDisplayService.getEpisodeUuid(job);
  }

  // Get topic UUID from merged data
  getTopicUuid(job: Job): string | null {
    return this.jobDisplayService.getTopicUuid(job);
  }

  // Get pulse UUID from merged data
  getPulseUuid(job: Job): string | null {
    return this.jobDisplayService.getPulseUuid(job);
  }

  // Get pulse config UUID from merged data
  getPulseConfigUuid(job: Job): string | null {
    return this.jobDisplayService.getPulseConfigUuid(job);
  }

  // Get blog UUID from merged data
  getBlogUuid(job: Job): string | null {
    return this.jobDisplayService.getBlogUuid(job);
  }

  // Get blog name from args/result
  getBlogName(job: Job): string {
    return this.jobDisplayService.getBlogName(job) || 'Blog';
  }

  // Get article UUID from merged data
  getArticleUuid(job: Job): string | null {
    return this.jobDisplayService.getArticleUuid(job);
  }

  // Get article title from args/result
  getArticleTitle(job: Job): string {
    return this.jobDisplayService.getArticleTitle(job) || 'Article';
  }

  // Check if job has symbol/FQN
  hasSymbol(job: Job): boolean {
    return this.jobDisplayService.hasSymbol(job);
  }

  // Get symbol from job args
  getSymbol(job: Job): string | null {
    return this.jobDisplayService.getSymbol(job);
  }

  // Get symbol tooltip with FQN and interval info
  getSymbolTooltip(job: Job): string {
    const fqn = this.jobDisplayService.getFqn(job);
    const interval = this.jobDisplayService.getInterval(job);
    const parts: string[] = [];
    if (fqn) parts.push(`FQN: ${fqn}`);
    if (interval) parts.push(`Interval: ${interval}`);
    parts.push('Click to view chart');
    return parts.join('\n');
  }

  // Navigate to symbol chart
  navigateToSymbol(job: Job): void {
    const symbol = this.jobDisplayService.getSymbol(job);
    const exchange = this.jobDisplayService.getExchange(job);
    const interval = this.jobDisplayService.getInterval(job) || 'daily';

    if (symbol) {
      // Navigate to terminal with chart command params
      this.router.navigate(['/terminal'], {
        queryParams: {
          tab: 'watchlists',
          symbol: symbol,
          exchange: exchange || undefined,
          view: 'chart',
          interval: interval,
        },
      });
    }
  }

  // Get podcast name from enriched job
  getPodcastName(job: EnrichedJob): string {
    return job.podcastName || 'Podcast';
  }

  // Get episode name from enriched job
  getEpisodeName(job: EnrichedJob): string {
    return job.episodeName || 'Episode';
  }

  // Get topic name from enriched job
  getTopicName(job: EnrichedJob): string {
    return job.topicName || 'Topic';
  }

  // Get pulse config name from enriched job
  getPulseConfigName(job: EnrichedJob): string {
    return job.pulseConfigName || 'Pulse';
  }

  // Check if a message is an error message
  isErrorMessage(message: string): boolean {
    if (!message) return false;
    const lowerMessage = message.toLowerCase();
    return (
      lowerMessage.includes('error') ||
      lowerMessage.includes('fail') ||
      lowerMessage.includes('exception') ||
      lowerMessage.includes('traceback')
    );
  }

  // Clean error message by removing prefixes
  getCleanErrorMessage(errorMessage: string): string {
    if (!errorMessage) return '';

    return errorMessage.replace(/^(Error:|ERROR:|error:)\s*/i, '').trim();
  }

  // Get clean job message with error detection
  getCleanJobMessage(job: Job): string {
    const message = this.getJobMessage(job);
    if (this.isErrorMessage(message)) {
      return this.getCleanErrorMessage(message);
    }
    return message;
  }

  loadMoreJobs(): void {
    if (this.hasNextPage && !this.isLoadingMore) {
      this.loadJobs(true);
    }
  }

  protected readonly kindToString = kindToString;
  protected readonly statusToString = statusToString;
  protected readonly stringToJobStatus = stringToJobStatus;
  protected readonly JobStatus = JobStatus;
}
