// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Job, JobResult, JobKind, stringToJobKind } from './job.service';
import { EpisodeService } from './episode.service';
import { PodcastsService } from './podcasts.service';
import { ResearchService } from './research.service';
import { MessageService } from './message.service';

@Injectable({
  providedIn: 'root',
})
export class JobDisplayService {
  constructor(
    private episodeService: EpisodeService,
    private podcastsService: PodcastsService,
    private researchService: ResearchService,
    private messageService: MessageService,
  ) {}

  // Parse job result JSON safely - now result is already a JSON object
  parseJobResult(job: Job): JobResult | null {
    return job.result;
  }

  // Get formatted message for job display
  getJobMessage(job: Job): string {
    if (job.error) {
      return job.error;
    }

    const result = job.result;
    if (result?.message) {
      return result.message;
    }

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

  // Get podcast UUID from job result
  getPodcastUuid(job: Job): string | null {
    return job.result?.podcast_uuid || null;
  }

  // Get episode UUID from job result
  getEpisodeUuid(job: Job): string | null {
    return job.result?.episode_uuid || null;
  }

  // Get topic UUID from job result
  getTopicUuid(job: Job): string | null {
    return job.result?.topic_uuid || null;
  }

  /**
   * Handle job completion and display appropriate success message
   * This centralizes all job completion handling logic
   */
  handleJobCompletion(job: Job): Observable<void> {
    const jobKind = stringToJobKind(job.kind);

    switch (jobKind) {
      case JobKind.CREATE_EPISODE:
        return this.handleEpisodeCreation(job);

      case JobKind.GENERATE_PODCAST:
        return this.handlePodcastGeneration(job);

      case JobKind.GENERATE_RESEARCH_TRANSCRIPT:
        return this.handleResearchCompletion(job);

      default:
        // For other job types, show a simple completion message
        this.messageService.success(`Job completed: ${job.kind}`);
        return of(void 0);
    }
  }

  /**
   * Handle episode creation completion
   */
  private handleEpisodeCreation(job: Job): Observable<void> {
    const episodeUuid = this.getEpisodeUuid(job);

    if (!episodeUuid) {
      this.messageService.success('Episode created successfully');
      return of(void 0);
    }

    return this.episodeService.getEpisodeById(episodeUuid).pipe(
      map((episode) => {
        const episodeUrl = `/episode/${episodeUuid}`;
        const episodeTitle = episode.title === '' ? '(Blank)' : episode.title;
        this.messageService.success(`New episode: <a href="${episodeUrl}">${episodeTitle}</a>`, null, true);
      }),
      catchError(() => {
        const episodeUrl = `/episode/${episodeUuid}`;
        this.messageService.success(`New episode created: <a href="${episodeUrl}">View Episode</a>`, null, true);
        return of(void 0);
      }),
    );
  }

  /**
   * Handle podcast generation completion
   */
  private handlePodcastGeneration(job: Job): Observable<void> {
    const podcastUuid = this.getPodcastUuid(job);

    if (!podcastUuid) {
      this.messageService.success('Podcast generated successfully');
      return of(void 0);
    }

    return this.podcastsService.getPodcastById(podcastUuid).pipe(
      map((podcast) => {
        const podcastUrl = `/podcast/${podcastUuid}`;
        const podcastName = podcast.name || '(Unnamed Podcast)';
        this.messageService.success(`Podcast generated: <a href="${podcastUrl}">${podcastName}</a>`, null, true);
      }),
      catchError(() => {
        const podcastUrl = `/podcast/${podcastUuid}`;
        this.messageService.success(`Podcast generated: <a href="${podcastUrl}">View Podcast</a>`, null, true);
        return of(void 0);
      }),
    );
  }

  /**
   * Handle research completion with optional episode
   */
  private handleResearchCompletion(job: Job): Observable<void> {
    const topicUuid = this.getTopicUuid(job);
    const episodeUuid = this.getEpisodeUuid(job);

    if (!topicUuid) {
      this.messageService.success(`Research complete! <a href="/topics">View Research Topics</a>`, null, true);
      return of(void 0);
    }

    // Fetch topic and optionally episode
    const topic$ = this.researchService.getTopicById(topicUuid).pipe(catchError(() => of(null)));

    const episode$ = episodeUuid
      ? this.episodeService.getEpisodeById(episodeUuid).pipe(catchError(() => of(null)))
      : of(null);

    return forkJoin({ topic: topic$, episode: episode$ }).pipe(
      map(({ topic, episode }) => {
        const topicUrl = `/topic/${topicUuid}`;
        const topicTitle = topic?.title === '' ? '(Blank)' : topic?.title || 'Topic';

        let message = `Research complete: <a href="${topicUrl}">${topicTitle}</a>`;

        if (episode && episodeUuid) {
          const episodeUrl = `/episode/${episodeUuid}`;
          const episodeTitle = episode.title === '' ? '(Blank)' : episode.title;
          message += ` | Episode: <a href="${episodeUrl}">${episodeTitle}</a>`;
        } else if (episodeUuid) {
          const episodeUrl = `/episode/${episodeUuid}`;
          message += ` | <a href="${episodeUrl}">View Episode</a>`;
        }

        this.messageService.success(message, null, true);
      }),
      catchError((error) => {
        this.messageService.error(`Failed to load research results: ${error.message}`);
        return of(void 0);
      }),
    );
  }
}
