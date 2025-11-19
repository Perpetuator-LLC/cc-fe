// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PodcastsResult } from './podcasts.service';

@Injectable({
  providedIn: 'root',
})
export class RecentlyUsedPodcastsService {
  private readonly HISTORY_KEY = 'podcast-selection-history';
  private podcastHistory: string[] = [];
  private historyLoaded = false;

  /**
   * Load podcast history from localStorage
   */
  loadHistory(): Observable<string[]> {
    if (this.historyLoaded) {
      return of(this.podcastHistory);
    }

    try {
      const stored = localStorage.getItem(this.HISTORY_KEY);
      if (stored) {
        this.podcastHistory = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error parsing podcast history from localStorage', e);
      this.podcastHistory = [];
    }

    this.historyLoaded = true;
    return of(this.podcastHistory);
  }

  /**
   * Update podcast history when a podcast is selected
   */
  recordSelection(podcastUuid: string): void {
    // Remove the selected podcast if it's already in history
    this.podcastHistory = this.podcastHistory.filter((uuid) => uuid !== podcastUuid);
    // Add it to the beginning (most recent)
    this.podcastHistory.unshift(podcastUuid);

    // Keep only the last 10 selections
    if (this.podcastHistory.length > 10) {
      this.podcastHistory = this.podcastHistory.slice(0, 10);
    }

    // Save the updated history to localStorage
    try {
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.podcastHistory));
    } catch (e) {
      console.error('Error saving podcast history to localStorage', e);
    }
  }

  /**
   * Sort podcasts by recently used (most recent first), then by latest internal episode date, then alphabetically
   */
  sortByRecentlyUsed(podcasts: PodcastsResult[]): PodcastsResult[] {
    if (!podcasts || podcasts.length === 0) {
      return podcasts;
    }

    // Create a map for quick lookup of podcast index in history
    const historyMap: Record<string, number> = {};
    this.podcastHistory.forEach((uuid, index) => {
      historyMap[uuid] = index;
    });

    // Sort podcasts: recently selected first, then by latestInternalEpisodeDate (newest first), then alphabetically
    return [...podcasts].sort((a, b) => {
      const indexA = historyMap[a.uuid] !== undefined ? historyMap[a.uuid] : Number.MAX_SAFE_INTEGER;
      const indexB = historyMap[b.uuid] !== undefined ? historyMap[b.uuid] : Number.MAX_SAFE_INTEGER;

      // Primary sort: by recently used history
      if (indexA !== indexB) {
        return indexA - indexB;
      }

      // Secondary sort: by latest internal episode date (newest first)
      const dateA = a.latestInternalEpisodeDate ? new Date(a.latestInternalEpisodeDate).getTime() : 0;
      const dateB = b.latestInternalEpisodeDate ? new Date(b.latestInternalEpisodeDate).getTime() : 0;

      if (dateA !== dateB) {
        return dateB - dateA; // Descending (newest first)
      }

      // Tertiary sort: alphabetically by name
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  /**
   * Get the most recently used podcast UUID, or the first podcast if only one exists
   */
  getDefaultSelection(podcasts: PodcastsResult[]): string | null {
    if (!podcasts || podcasts.length === 0) {
      return null;
    }

    // If only one podcast, select it
    if (podcasts.length === 1) {
      return podcasts[0].uuid;
    }

    // Check if the most recently used podcast is in the list
    const mostRecent = this.podcastHistory[0];
    if (mostRecent && podcasts.some((p) => p.uuid === mostRecent)) {
      return mostRecent;
    }

    // Default to first podcast in the sorted list
    return podcasts[0].uuid;
  }

  /**
   * Get the current history
   */
  getHistory(): string[] {
    return [...this.podcastHistory];
  }
}
