// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatList, MatListItem } from '@angular/material/list';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCard, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatAccordion, MatExpansionPanel, MatExpansionPanelHeader } from '@angular/material/expansion';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { DatePipe, JsonPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { Job, JobService, JobStatus, kindToString, stringToJobStatus, statusToString } from '../job.service';
import { MessageService } from '../message.service';
import { SidePanelAccordianData } from '../news/news.component';
import { toObservable } from '@angular/core/rxjs-interop';
import { JobDisplayService } from '../job-display.service';
import { PodcastsService, PodcastsResult } from '../podcasts.service';
import { EpisodeService } from '../episode.service';

interface EnrichedJob extends Job {
  podcastName?: string;
  episodeName?: string;
}

interface Episode {
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
    MatButton,
    MatIconButton,
    MatCardSubtitle,
    MatProgressBar,
    MatCardTitle,
    DatePipe,
    JsonPipe,
    RouterLink,
    MatIcon,
  ],
  templateUrl: './job-status-bar.component.html',
  styleUrl: './job-status-bar.component.scss',
})
export class JobStatusBarComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  protected jobs: EnrichedJob[] = [];

  constructor(
    private jobService: JobService,
    private messageService: MessageService,
    private jobDisplayService: JobDisplayService,
    private podcastsService: PodcastsService,
    private episodeService: EpisodeService,
  ) {
    toObservable(this.jobService.jobs).subscribe({
      next: (jobs) => {
        this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.COMPLETED).forEach((job) => {
          this.messageService.success(`${kindToString(job.kind)} completed.`);
        });
        this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.FAILED).forEach((job) => {
          this.messageService.error(`${kindToString(job.kind)} failed: ${job.error}`);
        });
        this.enrichJobsWithNames(jobs)
          .then((enrichedJobs) => {
            this.jobs = this.sortJobs(enrichedJobs);
          })
          .catch((error) => {
            console.warn('Failed to enrich jobs with names:', error);
            this.jobs = this.sortJobs(jobs.map((job) => ({ ...job })));
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
    // Extract unique UUIDs from all jobs
    const podcastUuids = new Set<string>();
    const episodeUuids = new Set<string>();

    jobs.forEach((job) => {
      const result = this.jobDisplayService.parseJobResult(job);
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
        const result = this.jobDisplayService.parseJobResult(job);

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
    const queries = uuids.map((uuid) => this.podcastsService.getPodcastById(uuid).pipe());

    return forkJoin(queries).pipe(map((podcasts) => ({ podcasts })));
  }

  // Fetch multiple episode names efficiently
  private fetchEpisodeNames(uuids: string[]) {
    const queries = uuids.map((uuid) => this.episodeService.getEpisodeById(uuid).pipe());

    return forkJoin(queries).pipe(map((episodes) => ({ episodes })));
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

  // Get podcast name from enriched job
  getPodcastName(job: EnrichedJob): string {
    return job.podcastName || 'Podcast';
  }

  // Get episode name from enriched job
  getEpisodeName(job: EnrichedJob): string {
    return job.episodeName || 'Episode';
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
