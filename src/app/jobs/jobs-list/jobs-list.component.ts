// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
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
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToolbarService } from '../../layout/toolbar.service';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MessageService } from '../../message.service';
import { Router, RouterLink } from '@angular/router';
import { PodcastsResult, PodcastsService } from '../../podcast/podcasts.service';
import { EpisodeService } from '../../episode/episode.service';
import { JobDisplayService } from '../../job-display.service';
import { ResearchService, Topic } from '../../topics/research.service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LoadingService } from '../../layout/loading.service';

interface EnrichedJob extends Job {
  podcastName?: string;
  episodeName?: string;
  topicName?: string;
}

/** Represents a group of jobs in a chain, or a single standalone job */
interface JobChainGroup {
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
    DecimalPipe,
    MatIcon,
    MatIconButton,
    MatButton,
    NgClass,
    RouterLink,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
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
  sortActive = 'updatedAt';
  hasNextPage = false;
  currentCursor: string | null = null;
  isLoadingMore = false;
  isInitialLoading = true;
  loading = false;

  // New status filter property
  statusFilter: string | null = null;

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

  constructor(
    private jobService: JobService,
    private jobsWebSocketService: JobsWebSocketService,
    private toolbarService: ToolbarService,
    private messageService: MessageService,
    private podcastsService: PodcastsService,
    private episodeService: EpisodeService,
    private jobDisplayService: JobDisplayService,
    private researchService: ResearchService,
    private loadingService: LoadingService,
    private router: Router,
  ) {
    // Subscribe to real-time job updates via WebSocket
    this.subscriptions.add(
      this.jobsWebSocketService.jobUpdated$.subscribe((job: Job) => {
        this.handleRealtimeJobUpdate('job.updated', job);
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
          updatedJobs[existingIndex] = { ...job };
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
          this.jobs = [{ ...job }, ...this.jobs];
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

    // Use jobsGrouped API for proper chain grouping (returns N top-level items)
    // Note: jobsGrouped doesn't support cursor pagination yet, so append mode uses existing jobs
    this.subscriptions.add(
      this.jobService.getJobsGrouped(this.pageSize, statuses, []).subscribe({
        next: (jobs) => {
          this.enrichJobsWithNames(jobs)
            .then((enrichedJobs) => {
              if (append) {
                // For append, we'd need cursor support - for now just refresh
                this.jobs = enrichedJobs;
              } else {
                this.jobs = enrichedJobs;
              }
              this.dataSource.data = this.jobs;
              // jobsGrouped doesn't return pageInfo, so estimate based on results
              this.hasNextPage = jobs.length >= this.pageSize;
              this.currentCursor = null; // No cursor support yet
              this.totalJobs = jobs.length;
              this.isLoadingMore = false;
              this.isInitialLoading = false;
              this.loading = false;
              if (!append) {
                this.loadingService.hide();
              }
            })
            .catch((error) => {
              this.messageService.error('Failed to enrich jobs with names: ' + error.toString());
              const jobsToAdd = jobs.map((job) => ({ ...job }));
              if (append) {
                this.jobs = jobsToAdd;
              } else {
                this.jobs = jobsToAdd;
              }
              this.dataSource.data = this.jobs;
              this.hasNextPage = jobs.length >= this.pageSize;
              this.currentCursor = null;
              this.totalJobs = jobs.length;
              this.isLoadingMore = false;
              this.isInitialLoading = false;
              this.loading = false;
              if (!append) {
                this.loadingService.hide();
              }
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

    jobs.forEach((job) => {
      const podcastUuid = this.jobDisplayService.getPodcastUuid(job);
      const episodeUuid = this.jobDisplayService.getEpisodeUuid(job);
      const topicUuid = this.jobDisplayService.getTopicUuid(job);

      if (podcastUuid) {
        podcastUuids.add(podcastUuid);
      }
      if (episodeUuid) {
        episodeUuids.add(episodeUuid);
      }
      if (topicUuid) {
        topicUuids.add(topicUuid);
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

    if (topicUuids.size > 0) {
      queries.push(this.fetchTopicNames(Array.from(topicUuids)));
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
      const topicNameMap = new Map<string, string>();

      if (results) {
        results.forEach((result: { podcasts?: PodcastsResult[]; episodes?: Episode[]; topics?: Topic[] }) => {
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
        });
      }

      // Enrich jobs with the fetched names
      return jobs.map((job) => {
        const enrichedJob: EnrichedJob = { ...job };
        const podcastUuid = this.jobDisplayService.getPodcastUuid(job);
        const episodeUuid = this.jobDisplayService.getEpisodeUuid(job);
        const topicUuid = this.jobDisplayService.getTopicUuid(job);

        if (podcastUuid && podcastNameMap.has(podcastUuid)) {
          enrichedJob.podcastName = podcastNameMap.get(podcastUuid);
        }

        if (episodeUuid && episodeNameMap.has(episodeUuid)) {
          enrichedJob.episodeName = episodeNameMap.get(episodeUuid);
        }

        if (topicUuid && topicNameMap.has(topicUuid)) {
          enrichedJob.topicName = topicNameMap.get(topicUuid);
        }

        return enrichedJob;
      });
    } catch (error) {
      console.warn('Failed to fetch podcast/episode/topic names:', error);
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
          this.jobs = [...data.jobs, ...this.jobs.filter((job) => job.uuid !== uuid)];
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
    this.isInitialLoading = true; // Show loading when filter changes
    this.loadJobs(); // Reload jobs with new filter
  }

  // Get status label for display
  getStatusLabel(status: string): string {
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

    return {
      chainId,
      jobs: sortedJobs,
      expanded: chainId ? this.expandedChains.has(chainId) : true,
      totalCost,
      totalJobs: sortedJobs.length,
      completedJobs,
      failedJobs,
      status,
      firstJobKind: sortedJobs[0]?.kind || '',
      lastJobKind: sortedJobs[sortedJobs.length - 1]?.kind || '',
      createdAt: sortedJobs[0]?.createdAt || '',
      updatedAt: sortedJobs.reduce(
        (latest, job) => (new Date(job.updatedAt) > new Date(latest) ? job.updatedAt : latest),
        sortedJobs[0]?.updatedAt || '',
      ),
    };
  }

  // Group jobs by date, then by chain for timeline view
  get groupedJobs(): { label: string; items: (JobChainGroup | EnrichedJob)[] }[] {
    if (!this.jobs) return [];

    let filteredJobs = this.jobs;

    // Apply client-side filtering if a specific status is selected
    if (this.statusFilter) {
      filteredJobs = this.jobs.filter((job) => stringToJobStatus(job.status) === stringToJobStatus(this.statusFilter!));
    }

    const groups: { label: string; items: (JobChainGroup | EnrichedJob)[] }[] = [];
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
        const items: (JobChainGroup | EnrichedJob)[] = [];

        // Add chain groups
        chainGroups.forEach((jobs, chainId) => {
          items.push(this.createChainGroup(chainId, jobs));
        });

        // Add standalone jobs
        standaloneJobs.forEach((job) => {
          items.push(job);
        });

        // Sort items by updatedAt (most recent first)
        items.sort((a, b) => {
          const aDate = 'updatedAt' in a ? a.updatedAt : (a as JobChainGroup).updatedAt;
          const bDate = 'updatedAt' in b ? b.updatedAt : (b as JobChainGroup).updatedAt;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });

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
