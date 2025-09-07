// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Job, JobResult } from './job.service';

@Injectable({
  providedIn: 'root',
})
export class JobDisplayService {
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
}
