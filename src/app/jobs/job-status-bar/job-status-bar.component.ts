// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, OnDestroy, Input, inject } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatTooltip } from '@angular/material/tooltip';
import { MatAccordion, MatExpansionPanel, MatExpansionPanelHeader } from '@angular/material/expansion';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { DatePipe, NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import {
  Job,
  JobService,
  JobStatus,
  JobKind,
  kindToString,
  stringToJobKind,
  stringToJobStatus,
  statusToString,
} from '../job.service';
import { MessageService } from '../../message.service';
import { SidePanelAccordianData } from '../../news/news-list/news-list.component';
import { toObservable } from '@angular/core/rxjs-interop';
import { JobDisplayService } from '../../job-display.service';
import { PodcastsService, PodcastsResult } from '../../podcast/podcasts.service';
import { EpisodeService } from '../../episode/episode.service';
import { ResearchService } from '../../topics/research.service';

/**
 * One displayable resource tag for a job (podcast, episode, topic, etc).
 * Pre-computed so the template renders a single `@for` over `resources`
 * rather than a chain of `@if`s.
 */
interface JobResource {
  /** css modifier class on the resource button, e.g. 'podcast-tag'. */
  cssClass: string;
  /** Material icon name to render inside the button. */
  icon: string;
  /** Visible label text. */
  label: string;
  /** Tooltip text shown on hover. */
  tooltip: string;
  /** Router link target. `null` when the tag uses a click action instead. */
  routerLink: string[] | null;
}

/**
 * Pre-computed display state for a job. Computed once per enrichment so
 * the template can read static property accesses instead of calling
 * methods on every change-detection tick.
 */
interface JobDisplay {
  kindLabel: string;
  statusLabel: string;
  isRunning: boolean;
  isFailedOrPending: boolean;
  cleanMessage: string;
  cleanError: string;
  showMessage: boolean;
  isMessageError: boolean;
  symbolTooltip: string;
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
  hasAnyResource: boolean;
  /** All routable resource tags (podcast/episode/topic/pulse/blog/article) for `@for`. */
  routerResources: JobResource[];
  /** The (optional) symbol tag — separate because it uses a click action, not a routerLink. */
  symbolResource: JobResource | null;
}

interface EnrichedJob extends Job {
  podcastName?: string;
  episodeName?: string;
  topicName?: string;
  /** Pre-computed display state. Built during enrichment. */
  display: JobDisplay;
}

interface Episode {
  uuid: string;
  title?: string;
}

interface Topic {
  uuid: string;
  title?: string;
}

@Component({
  selector: 'app-job-status-bar',
  standalone: true,
  imports: [
    MatTooltip,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatButton,
    MatIconButton,
    MatProgressBar,
    DatePipe,
    NgClass,
    RouterLink,
    MatIcon,
  ],
  templateUrl: './job-status-bar.component.html',
  styleUrl: './job-status-bar.component.scss',
})
export class JobStatusBarComponent implements OnInit, OnDestroy {
  private readonly jobService = inject(JobService);
  private readonly messageService = inject(MessageService);
  private readonly jobDisplayService = inject(JobDisplayService);
  private readonly podcastsService = inject(PodcastsService);
  private readonly episodeService = inject(EpisodeService);
  private readonly researchService = inject(ResearchService);
  private readonly router = inject(Router);

  private subscriptions: Subscription = new Subscription();
  protected jobs: EnrichedJob[] = [];
  private processedJobCompletions = new Set<string>(); // Track processed job UUIDs to prevent duplicates

  constructor() {
    toObservable(this.jobService.jobs).subscribe({
      next: (jobs) => {
        // Get transitions before updating this.jobs
        const completedTransitions = this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.COMPLETED);
        const failedTransitions = this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.FAILED);

        // Update this.jobs SYNCHRONOUSLY FIRST to prevent duplicate messages
        // This prevents race condition where signal emits again before async enrichment completes
        this.jobs = this.sortJobs(jobs.map((job) => this.toEnrichedJob(job)));

        // Enrich jobs asynchronously in background (this won't affect transition detection)
        this.enrichJobsWithNames(jobs)
          .then((enrichedJobs) => {
            this.jobs = this.sortJobs(enrichedJobs);
          })
          .catch((error) => {
            console.warn('Failed to enrich jobs with names:', error);
            // Jobs already updated above, no need to do anything here
          });

        // Now handle transitions - these will only be shown once
        completedTransitions.forEach((job) => {
          // Skip if we've already processed this job completion
          if (this.processedJobCompletions.has(job.uuid)) {
            return;
          }
          this.processedJobCompletions.add(job.uuid);

          const jobKind = stringToJobKind(job.kind);
          const skipMessageForKinds = [
            JobKind.VALIDATE_EPISODE,
            JobKind.VALIDATE_EPISODE_COMPLIANCE,
            JobKind.VALIDATE_EPISODE_FACTS,
            JobKind.VALIDATE_EPISODE_LENGTH,
            JobKind.UPDATE_EPISODE_AUDIO,
          ];

          if (!skipMessageForKinds.includes(jobKind)) {
            // Use centralized job display service for complex job types
            const handledByDisplayService = [
              JobKind.CREATE_EPISODE,
              JobKind.GENERATE_PODCAST,
              JobKind.GENERATE_RESEARCH_TRANSCRIPT,
              JobKind.RESEARCH_TOPIC,
              JobKind.GENERATE_ARTICLE_FROM_SOURCE,
              JobKind.GENERATE_ARTICLE_FROM_EPISODE,
            ];

            if (handledByDisplayService.includes(jobKind)) {
              this.jobDisplayService.handleJobCompletion(job).subscribe({
                error: (error) => {
                  console.warn(`Failed to process job completion display: ${error.message}`);
                  // Fallback to simple message
                  this.messageService.success(`${kindToString(job.kind)} completed.`);
                },
              });
            } else {
              // Simple success message for other job types
              this.messageService.success(`${kindToString(job.kind)} completed.`);
            }
          }
        });

        failedTransitions.forEach((job) => {
          // Skip if we've already processed this job failure
          if (this.processedJobCompletions.has(job.uuid)) {
            return;
          }
          this.processedJobCompletions.add(job.uuid);

          this.messageService.error(`${kindToString(job.kind)} failed: ${job.error}`);
        });
      },
      error: (error) => {
        this.messageService.error(`Failed to load jobs: ${error.message}`);
      },
    });
  }

  @Input() data: SidePanelAccordianData = {
    title: '',
    panelOpenState: false,
  };

  ngOnInit(): void {
    if (this.data.panelOpenState === undefined) {
      this.data.panelOpenState = false;
    }
    // Jobs are now loaded via WebSocket (jobs.initial message on connect)
    // The constructor's toObservable(this.jobService.jobs) subscription handles updates
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  deleteJob(id: string) {
    this.subscriptions.add(
      this.jobService.deleteJobs([id]).subscribe({
        next: () => {
          this.jobs = this.jobs.filter((job) => job.id !== id);
          this.messageService.success('Job deleted.');
        },
        error: (err: { message: string }) => {
          this.messageService.error(`Failed to delete job: ${err.message}`);
        },
      }),
    );
  }

  retryJob(id: string) {
    this.subscriptions.add(
      this.jobService.retryJobs([id]).subscribe({
        next: (data) => {
          this.jobs = [...data.jobs.map((job) => this.toEnrichedJob(job)), ...this.jobs.filter((job) => job.id !== id)];
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

    // If no UUIDs to fetch, return jobs with display computed.
    if (queries.length === 0) {
      return jobs.map((job) => this.toEnrichedJob(job));
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

      // Enrich jobs with the fetched names + pre-computed display state.
      return jobs.map((job) => {
        const podcastUuid = this.jobDisplayService.getPodcastUuid(job);
        const episodeUuid = this.jobDisplayService.getEpisodeUuid(job);
        const topicUuid = this.jobDisplayService.getTopicUuid(job);

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

        return this.toEnrichedJob(job, extras);
      });
    } catch (error) {
      console.warn('Failed to fetch podcast/episode/topic names:', error);
      return jobs.map((job) => this.toEnrichedJob(job));
    }
  }

  /** Build an EnrichedJob with pre-computed `display`. */
  private toEnrichedJob(job: Job, extras: Partial<EnrichedJob> = {}): EnrichedJob {
    return {
      ...job,
      ...extras,
      display: this.buildJobDisplay(job, extras),
    };
  }

  /** Compute all derived display state for a single job. */
  private buildJobDisplay(job: Job, extras: Partial<EnrichedJob> = {}): JobDisplay {
    const jds = this.jobDisplayService;
    const jobStatus = stringToJobStatus(job.status);
    const message = jds.getJobMessage(job);
    const isMessageError = this.computeIsErrorMessage(message);
    const cleanMessage = isMessageError ? this.computeCleanErrorMessage(message) : message;
    const cleanError = this.computeCleanErrorMessage(job.error || '');
    const showMessage = !job.error || cleanError !== cleanMessage;
    const hasPodcast = jds.hasPodcastUuid(job);
    const hasEpisode = jds.hasEpisodeUuid(job);
    const hasTopic = jds.hasTopicUuid(job);
    const hasPulseConfig = jds.hasPulseConfigUuid(job);
    const hasBlog = jds.hasBlogUuid(job);
    const hasArticle = jds.hasArticleUuid(job);
    const hasSymbol = jds.hasSymbol(job);
    const podcastUuid = jds.getPodcastUuid(job);
    const episodeUuid = jds.getEpisodeUuid(job);
    const topicUuid = jds.getTopicUuid(job);
    const pulseConfigUuid = jds.getPulseConfigUuid(job);
    const blogUuid = jds.getBlogUuid(job);
    const articleUuid = jds.getArticleUuid(job);
    const symbol = jds.getSymbol(job);
    const podcastName = extras.podcastName || 'Podcast';
    const episodeName = extras.episodeName || 'Episode';
    const topicName = extras.topicName || 'Topic';
    const blogName = jds.getBlogName(job) || 'Blog';
    const articleTitle = jds.getArticleTitle(job) || 'Article';
    const symbolTooltip = this.computeSymbolTooltip(job);

    const routerResources: JobResource[] = [];
    if (hasPodcast) {
      routerResources.push({
        cssClass: 'podcast-tag',
        icon: 'mic',
        label: podcastName,
        tooltip: 'Podcast',
        routerLink: ['/media/podcasts', podcastUuid ?? ''],
      });
    }
    if (hasEpisode) {
      routerResources.push({
        cssClass: 'episode-tag',
        icon: 'podcasts',
        label: episodeName,
        tooltip: 'Episode',
        routerLink: ['/media/episodes', episodeUuid ?? ''],
      });
    }
    if (hasTopic) {
      routerResources.push({
        cssClass: 'topic-tag',
        icon: 'topic',
        label: topicName,
        tooltip: 'Topic',
        routerLink: ['/media/topics', topicUuid ?? ''],
      });
    }
    if (hasPulseConfig) {
      routerResources.push({
        cssClass: 'pulse-tag',
        icon: 'vital_signs',
        label: 'Pulse',
        tooltip: 'Pulse',
        routerLink: ['/media/pulses', pulseConfigUuid ?? ''],
      });
    }
    if (hasBlog) {
      routerResources.push({
        cssClass: 'blog-tag',
        icon: 'menu_book',
        label: blogName,
        tooltip: 'Blog',
        routerLink: ['/media/blogs', blogUuid ?? ''],
      });
    }
    if (hasArticle) {
      routerResources.push({
        cssClass: 'article-tag',
        icon: 'article',
        label: articleTitle,
        tooltip: 'Article',
        routerLink: ['/media/articles', articleUuid ?? ''],
      });
    }
    const symbolResource: JobResource | null = hasSymbol
      ? {
          cssClass: 'symbol-tag',
          icon: 'show_chart',
          label: symbol ?? '',
          tooltip: symbolTooltip,
          routerLink: null,
        }
      : null;

    return {
      kindLabel: kindToString(job.kind),
      statusLabel: statusToString(job.status),
      isRunning: jobStatus === JobStatus.RUNNING,
      isFailedOrPending: jobStatus === JobStatus.FAILED || jobStatus === JobStatus.PENDING,
      cleanMessage,
      cleanError,
      showMessage,
      isMessageError,
      symbolTooltip,
      hasPodcast,
      podcastUuid,
      podcastName,
      hasEpisode,
      episodeUuid,
      episodeName,
      hasTopic,
      topicUuid,
      topicName,
      hasPulseConfig,
      pulseConfigUuid,
      pulseConfigName: 'Pulse',
      hasBlog,
      blogUuid,
      blogName,
      hasArticle,
      articleUuid,
      articleTitle,
      hasSymbol,
      symbol,
      hasAnyResource: hasPodcast || hasEpisode || hasTopic || hasPulseConfig || hasBlog || hasArticle || hasSymbol,
      routerResources,
      symbolResource,
    };
  }

  private computeIsErrorMessage(message: string): boolean {
    if (!message) return false;
    const lower = message.toLowerCase();
    return (
      lower.includes('error') || lower.includes('fail') || lower.includes('exception') || lower.includes('traceback')
    );
  }

  private computeCleanErrorMessage(errorMessage: string): string {
    if (!errorMessage) return '';
    return errorMessage.replace(/^(Error:|ERROR:|error:)\s*/i, '').trim();
  }

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
    const queries = uuids.map((uuid) => this.podcastsService.getPodcastById(uuid).pipe());

    return forkJoin(queries).pipe(map((podcasts) => ({ podcasts })));
  }

  // Fetch multiple episode names efficiently
  private fetchEpisodeNames(uuids: string[]) {
    const queries = uuids.map((uuid) => this.episodeService.getEpisodeById(uuid).pipe());

    return forkJoin(queries).pipe(map((episodes) => ({ episodes })));
  }

  // Fetch multiple topic names efficiently
  private fetchTopicNames(uuids: string[]) {
    const queries = uuids.map((uuid) => this.researchService.getTopicById(uuid).pipe());

    return forkJoin(queries).pipe(map((topics) => ({ topics })));
  }

  // Delegate to shared service methods
  getJobMessage(job: Job): string {
    return this.jobDisplayService.getJobMessage(job);
  }

  hasPodcastUuid(job: Job): boolean {
    return this.jobDisplayService.hasPodcastUuid(job);
  }

  hasEpisodeUuid(job: Job): boolean {
    return this.jobDisplayService.hasEpisodeUuid(job);
  }

  getPodcastUuid(job: Job): string | null {
    return this.jobDisplayService.getPodcastUuid(job);
  }

  getEpisodeUuid(job: Job): string | null {
    return this.jobDisplayService.getEpisodeUuid(job);
  }

  getTopicUuid(job: Job): string | null {
    return this.jobDisplayService.getTopicUuid(job);
  }

  hasTopicUuid(job: Job): boolean {
    return this.jobDisplayService.hasTopicUuid(job);
  }

  // Pulse methods
  hasPulseConfigUuid(job: Job): boolean {
    return this.jobDisplayService.hasPulseConfigUuid(job);
  }

  getPulseConfigUuid(job: Job): string | null {
    return this.jobDisplayService.getPulseConfigUuid(job);
  }

  getPulseConfigName(): string {
    return 'Pulse';
  }

  // Blog methods
  hasBlogUuid(job: Job): boolean {
    return this.jobDisplayService.hasBlogUuid(job);
  }

  getBlogUuid(job: Job): string | null {
    return this.jobDisplayService.getBlogUuid(job);
  }

  getBlogName(job: Job): string {
    return this.jobDisplayService.getBlogName(job) || 'Blog';
  }

  // Article methods
  hasArticleUuid(job: Job): boolean {
    return this.jobDisplayService.hasArticleUuid(job);
  }

  getArticleUuid(job: Job): string | null {
    return this.jobDisplayService.getArticleUuid(job);
  }

  getArticleTitle(job: Job): string {
    return this.jobDisplayService.getArticleTitle(job) || 'Article';
  }

  // Symbol methods for stock-related jobs
  hasSymbol(job: Job): boolean {
    return this.jobDisplayService.hasSymbol(job);
  }

  getSymbol(job: Job): string | null {
    return this.jobDisplayService.getSymbol(job);
  }

  getSymbolTooltip(job: Job): string {
    const fqn = this.jobDisplayService.getFqn(job);
    const interval = this.jobDisplayService.getInterval(job);
    const parts: string[] = [];
    if (fqn) parts.push(`FQN: ${fqn}`);
    if (interval) parts.push(`Interval: ${interval}`);
    parts.push('Click to view chart');
    return parts.join('\n');
  }

  navigateToSymbol(job: Job): void {
    const symbol = this.jobDisplayService.getSymbol(job);
    const exchange = this.jobDisplayService.getExchange(job);
    const interval = this.jobDisplayService.getInterval(job) || 'daily';

    if (symbol) {
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

  private sortJobs(jobs: EnrichedJob[]): EnrichedJob[] {
    return jobs.sort((a, b) => {
      const statusA = stringToJobStatus(a.status);
      const statusB = stringToJobStatus(b.status);

      const statusOrder = {
        [JobStatus.COMPLETED]: 0,
        [JobStatus.FAILED]: 1,
        [JobStatus.RUNNING]: 2,
        [JobStatus.PENDING]: 3,
      };

      const orderA = statusOrder[statusA];
      const orderB = statusOrder[statusB];

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  protected readonly kindToString = kindToString;
  protected readonly JobStatus = JobStatus;
  protected readonly stringToJobStatus = stringToJobStatus;
  protected readonly statusToString = statusToString;
}
