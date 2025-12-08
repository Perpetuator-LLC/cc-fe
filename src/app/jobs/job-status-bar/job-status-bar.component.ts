// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatList, MatListItem } from '@angular/material/list';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCard, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatAccordion, MatExpansionPanel, MatExpansionPanelHeader } from '@angular/material/expansion';
import { MatIconButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { DatePipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
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

interface EnrichedJob extends Job {
  podcastName?: string;
  episodeName?: string;
  topicName?: string;
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
    MatList,
    MatListItem,
    MatTooltip,
    MatCard,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatCardHeader,
    MatIconButton,
    MatCardSubtitle,
    MatProgressBar,
    MatCardTitle,
    DatePipe,
    NgClass,
    RouterLink,
    MatIcon,
  ],
  templateUrl: './job-status-bar.component.html',
  styleUrl: './job-status-bar.component.scss',
})
export class JobStatusBarComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  protected jobs: EnrichedJob[] = [];
  private processedJobCompletions = new Set<string>(); // Track processed job UUIDs to prevent duplicates

  constructor(
    private jobService: JobService,
    private messageService: MessageService,
    private jobDisplayService: JobDisplayService,
    private podcastsService: PodcastsService,
    private episodeService: EpisodeService,
    private researchService: ResearchService,
  ) {
    toObservable(this.jobService.jobs).subscribe({
      next: (jobs) => {
        // Get transitions before updating this.jobs
        const completedTransitions = this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.COMPLETED);
        const failedTransitions = this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.FAILED);

        // Update this.jobs SYNCHRONOUSLY FIRST to prevent duplicate messages
        // This prevents race condition where signal emits again before async enrichment completes
        this.jobs = this.sortJobs(jobs.map((job) => ({ ...job })));

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
    this.loadJobs();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadJobs() {
    const currentJobIds = this.jobs.map((job) => job.id);
    this.subscriptions.add(
      this.jobService
        .getJobs(
          [JobStatus.PENDING, JobStatus.RUNNING],
          [
            // JobKind.SUMMARIZE_NEWS,
            // JobKind.FETCH_NEWS,
            // JobKind.EXTRACT_NEWS,
            // JobKind.CREATE_EPISODE,
            // JobKind.UPDATE_EPISODE_AUDIO,
          ],
          currentJobIds,
        )
        .subscribe((result) => {
          this.enrichJobsWithNames(result.jobs)
            .then((enrichedJobs) => {
              this.jobs = enrichedJobs;
            })
            .catch((error) => {
              console.warn('Failed to enrich jobs with names:', error);
              this.jobs = result.jobs.map((job) => ({ ...job }));
            });
        }),
    );
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
          this.jobs = [...data.jobs, ...this.jobs.filter((job) => job.id !== id)];
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
    // Extract unique UUIDs from all jobs using merged data
    const podcastUuids = new Set<string>();
    const episodeUuids = new Set<string>();
    const topicUuids = new Set<string>();

    jobs.forEach((job) => {
      const merged = this.jobDisplayService.getMergedJobData(job);
      if (merged.podcast_uuid) {
        podcastUuids.add(merged.podcast_uuid);
      }
      if (merged.episode_uuid) {
        episodeUuids.add(merged.episode_uuid);
      }
      if (merged.topic_uuid) {
        topicUuids.add(merged.topic_uuid);
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

      // Enrich jobs with the fetched names using merged data
      return jobs.map((job) => {
        const enrichedJob: EnrichedJob = { ...job };
        const merged = this.jobDisplayService.getMergedJobData(job);

        if (merged.podcast_uuid && podcastNameMap.has(merged.podcast_uuid)) {
          enrichedJob.podcastName = podcastNameMap.get(merged.podcast_uuid);
        }

        if (merged.episode_uuid && episodeNameMap.has(merged.episode_uuid)) {
          enrichedJob.episodeName = episodeNameMap.get(merged.episode_uuid);
        }

        if (merged.topic_uuid && topicNameMap.has(merged.topic_uuid)) {
          enrichedJob.topicName = topicNameMap.get(merged.topic_uuid);
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
