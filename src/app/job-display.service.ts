// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Job, JobResult, JobArgs, JobKind, stringToJobKind } from './jobs/job.service';
import { EpisodeService } from './episode/episode.service';
import { PodcastsService } from './podcast/podcasts.service';
import { ResearchService } from './topics/research.service';
import { MessageService } from './message.service';

export interface MergedJobData {
  podcast_uuid?: string;
  episode_uuid?: string;
  topic_uuid?: string;
  news_uuids?: string[];
  message?: string;
  [key: string]: unknown;
}

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

  // Parse job result JSON safely - handles both string and object types
  parseJobResult(job: Job): JobResult | null {
    if (!job.result) {
      return null;
    }

    // If result is already an object, return it directly
    if (typeof job.result === 'object') {
      return job.result;
    }

    // If result is a string, try to parse it as JSON
    if (typeof job.result === 'string') {
      try {
        const parsed = JSON.parse(job.result);
        return typeof parsed === 'object' ? parsed : null;
      } catch (error) {
        console.warn(`Failed to parse job result as JSON for job ${job.uuid}:`, error);
        // Return a minimal result object with the string as a message
        return { message: job.result };
      }
    }

    return null;
  }

  // Parse job args JSON safely - handles both string and object types
  parseJobArgs(job: Job): JobArgs | null {
    if (!job.args) {
      return null;
    }

    // If args is already an object, return it directly
    if (typeof job.args === 'object') {
      return job.args;
    }

    // If args is a string, try to parse it as JSON
    if (typeof job.args === 'string') {
      try {
        const parsed = JSON.parse(job.args);
        return typeof parsed === 'object' ? parsed : null;
      } catch (error) {
        console.warn(`Failed to parse job args as JSON for job ${job.uuid}:`, error);
        return null;
      }
    }

    return null;
  }

  // Merge args and results, prioritizing results over args for conflicts
  getMergedJobData(job: Job): MergedJobData {
    const args = this.parseJobArgs(job) || {};
    const result = this.parseJobResult(job) || {};

    // Merge args and results, with results taking precedence
    return { ...args, ...result };
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

  // Check if job has podcast UUID (from args or result)
  hasPodcastUuid(job: Job): boolean {
    const merged = this.getMergedJobData(job);
    return merged.podcast_uuid != null;
  }

  // Check if job has episode UUID (from args or result)
  hasEpisodeUuid(job: Job): boolean {
    const merged = this.getMergedJobData(job);
    return merged.episode_uuid != null;
  }

  // Check if job has topic UUID (from args or result)
  hasTopicUuid(job: Job): boolean {
    const merged = this.getMergedJobData(job);
    return merged.topic_uuid != null;
  }

  // Get podcast UUID from merged data (prioritizing result over args)
  getPodcastUuid(job: Job): string | null {
    const merged = this.getMergedJobData(job);
    return merged.podcast_uuid || null;
  }

  // Get episode UUID from merged data (prioritizing result over args)
  getEpisodeUuid(job: Job): string | null {
    const merged = this.getMergedJobData(job);
    return merged.episode_uuid || null;
  }

  // Get topic UUID from merged data (prioritizing result over args)
  getTopicUuid(job: Job): string | null {
    const merged = this.getMergedJobData(job);
    return merged.topic_uuid || null;
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

      case JobKind.RESEARCH_TOPIC:
        return this.handleResearchTopicCompletion(job);

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
        const episodeUrl = `/e/${episodeUuid}`;
        const episodeTitle = episode.title === '' ? '(Blank)' : episode.title;
        this.messageService.success(`New episode: <a href="${episodeUrl}">${episodeTitle}</a>`, null, true);
      }),
      catchError(() => {
        const episodeUrl = `/e/${episodeUuid}`;
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
        const podcastUrl = `/p/${podcastUuid}`;
        const podcastName = podcast.name || '(Unnamed Podcast)';
        this.messageService.success(`Podcast generated: <a href="${podcastUrl}">${podcastName}</a>`, null, true);
      }),
      catchError(() => {
        const podcastUrl = `/p/${podcastUuid}`;
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
      this.messageService.success(`Research complete! <a href="/media/topics">View Research Topics</a>`, null, true);
      return of(void 0);
    }

    // Fetch topic and optionally episode
    const topic$ = this.researchService.getTopicById(topicUuid).pipe(catchError(() => of(null)));

    const episode$ = episodeUuid
      ? this.episodeService.getEpisodeById(episodeUuid).pipe(catchError(() => of(null)))
      : of(null);

    return forkJoin({ topic: topic$, episode: episode$ }).pipe(
      map(({ topic, episode }) => {
        const topicUrl = `/media/topics/${topicUuid}`;
        const topicTitle = topic?.title === '' ? '(Blank)' : topic?.title || 'Topic';

        let message = `Research complete: <a href="${topicUrl}">${topicTitle}</a>`;

        if (episode && episodeUuid) {
          const episodeUrl = `/media/episodes/${episodeUuid}`;
          const episodeTitle = episode.title === '' ? '(Blank)' : episode.title;
          message += ` | Episode: <a href="${episodeUrl}">${episodeTitle}</a>`;
        } else if (episodeUuid) {
          const episodeUrl = `/media/episodes/${episodeUuid}`;
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

  /**
   * Handle research topic job completion - shows immediate link from args
   */
  private handleResearchTopicCompletion(job: Job): Observable<void> {
    const topicUuid = this.getTopicUuid(job);

    if (!topicUuid) {
      this.messageService.success('Research topic job completed');
      return of(void 0);
    }

    return this.researchService.getTopicById(topicUuid).pipe(
      map((topic) => {
        const topicUrl = `/media/topics/${topicUuid}`;
        const topicTitle = topic?.title === '' ? '(Blank)' : topic?.title || 'Research Topic';
        this.messageService.success(`Research topic updated: <a href="${topicUrl}">${topicTitle}</a>`, null, true);
      }),
      catchError(() => {
        const topicUrl = `/media/topics/${topicUuid}`;
        this.messageService.success(`Research topic updated: <a href="${topicUrl}">View Topic</a>`, null, true);
        return of(void 0);
      }),
    );
  }
}
